"""
Counterfactual analysis on top of the v2.9.1 score engine.

For each patient we pre-compute:
  - per-biomarker SENSITIVITY: dScore/dx around the current point, normalized
    so the engine's most-influential markers surface first
  - tier-down COUNTERFACTUALS: the smallest single-marker change that would
    drop the patient one tier (T2→T1, T3→T2, T4→T3), via binary search

The engine is piecewise-smooth (floor rules introduce discontinuities), so we
use numerical gradients with a small step. Univariate counterfactuals are
clinically the most defensible — "if just this marker moved, the score would
drop by N" — and they avoid the messy interpretation of multivariate gradient
descent on a non-convex objective.

This is *demonstrative*, not therapeutic. Counterfactuals describe what the
SCORE would do; they do not promise that achieving the target biomarker would
make the patient healthier. The clinical reasoning still belongs to the
physician.
"""
from __future__ import annotations

from typing import Callable, Optional

from score_engine import bio_stress_score, result_to_dict, tier_from_score


# Markers we expose for counterfactual analysis. Excludes derived ratios
# (cor_dhea, nor_epi, hva_vma, hiaa_ser, da_ser, car_pct, aucg, dcs) because
# those are computed from other markers — moving a ratio without moving its
# inputs would be physically meaningless. We focus on the raw biomarkers a
# clinical intervention could plausibly target.
PRIMARY_MARKERS = [
    "m1", "m2", "m3", "m4", "m5",   # cortisol timepoints
    "dhea",                          # adrenal
    "da", "dopac", "hva", "nor", "epi", "vma", "mhpg",  # catecholamines
    "ser", "hiaa",                   # monoamines
]

# Direction we'd want each marker to move to *reduce* a typical penalty. For
# markers with reference ranges, "toward the center of the band" is the
# heuristic — but the engine penalises both excursions, so we always look at
# both directions in the binary search.
MARKER_LABEL = {
    "m1": "Morning cortisol (m1)",
    "m2": "Cortisol +30 min (m2)",
    "m3": "Midday cortisol (m3)",
    "m4": "Evening cortisol (m4)",
    "m5": "Night cortisol (m5)",
    "dhea": "DHEA",
    "da": "Dopamine",
    "dopac": "DOPAC",
    "hva": "HVA",
    "nor": "Noradrenaline",
    "epi": "Adrenaline",
    "vma": "VMA",
    "mhpg": "MHPG",
    "ser": "Serotonin (peripheral)",
    "hiaa": "5-HIAA",
}

# Physiological floors/ceilings — clamps so binary search can't propose
# impossible values (e.g. negative cortisol).
MARKER_BOUNDS = {
    "m1": (0.1, 60),
    "m2": (0.1, 80),
    "m3": (0.1, 30),
    "m4": (0.05, 20),
    "m5": (0.05, 10),
    "dhea": (0.05, 10),
    "da": (5, 800),
    "dopac": (0.05, 15),
    "hva": (0.1, 12),
    "nor": (1, 100),
    "epi": (0.05, 20),
    "vma": (0.1, 10),
    "mhpg": (0.05, 5),
    "ser": (3, 400),
    "hiaa": (0.1, 15),
}


def _recompute(biomarkers: dict) -> dict:
    """Run the score engine with a mutated biomarker dict, recomputing ratios."""
    b = dict(biomarkers)
    # Recompute derived ratios so changing a primary marker propagates correctly
    if b.get("m1"):
        b["car_pct"] = ((b.get("m2", 0) - b["m1"]) / b["m1"]) * 100
    if b.get("dhea") and b.get("m1"):
        b["cor_dhea"] = b["m1"] / b["dhea"]
    if b.get("nor") and b.get("epi"):
        b["nor_epi"] = b["nor"] / b["epi"]
    if b.get("hva") and b.get("vma"):
        b["hva_vma"] = b["hva"] / b["vma"]
    if b.get("hiaa") and b.get("ser"):
        b["hiaa_ser"] = b["hiaa"] / b["ser"]
    if b.get("da") and b.get("ser"):
        b["da_ser"] = b["da"] / b["ser"]
    # AUCg and DCS depend on cortisol timepoints — recompute via trapezoid + slope
    m1, m2, m3, m4, m5 = b.get("m1"), b.get("m2"), b.get("m3"), b.get("m4"), b.get("m5")
    if all(v is not None for v in (m1, m2, m3, m4, m5)):
        # standard collection times: 0, 0.5, 4.5, 10.5, 14.5 hours
        ts = [0, 0.5, 4.5, 10.5, 14.5]
        vs = [m1, m2, m3, m4, m5]
        aucg = sum((ts[i + 1] - ts[i]) * (vs[i] + vs[i + 1]) / 2 for i in range(4))
        b["aucg"] = aucg
        b["dcs"] = (m5 - m1) / (ts[-1] - ts[0])

    # Score
    args = {k: b[k] for k in [
        "m1", "m2", "m3", "m4", "m5", "car_pct", "dcs", "aucg",
        "dhea", "cor_dhea",
        "da", "nor", "epi", "nor_epi", "dopac", "hva", "vma", "mhpg",
        "ser", "hiaa", "hiaa_ser", "da_ser",
    ]}
    r = bio_stress_score(creatinine_ur=b.get("creatinine"), **args)
    return result_to_dict(r)


def compute_sensitivity(biomarkers: dict, marker: str) -> Optional[float]:
    """dScore / dx at the patient's current point.
    Returns score change per +1% change in the marker (so it's unit-free).
    """
    cur = biomarkers.get(marker)
    if cur is None or cur <= 0:
        return None
    base = _recompute(biomarkers)["score_formula"]
    bumped = dict(biomarkers)
    delta = max(abs(cur) * 0.05, 1e-3)
    bumped[marker] = cur + delta
    new = _recompute(bumped)["score_formula"]
    # Express as score-change per 5% relative change in the marker
    return new - base


TIER_ORDER = {"T1": 1, "T2": 2, "T3": 3, "T4": 4}


def find_counterfactual(
    biomarkers: dict,
    marker: str,
    target_score_ceiling: float,
    target_tier: str,
    current_tier: str,
    max_iter: int = 18,
) -> Optional[dict]:
    """Binary-search a value of `marker` such that the resulting tier_final
    is strictly below `current_tier`. Tries both directions; returns the
    smaller absolute change if both work. Filters out moves that only drop
    the formula score but leave tier_final unchanged because a floor rule
    is firing."""
    cur = biomarkers.get(marker)
    if cur is None:
        return None
    lo, hi = MARKER_BOUNDS.get(marker, (cur * 0.1, cur * 10))

    base = _recompute(biomarkers)
    if TIER_ORDER[base["tier_final"]] < TIER_ORDER[current_tier]:
        return None  # already below
    current_order = TIER_ORDER[current_tier]

    def is_drop(r: dict) -> bool:
        return TIER_ORDER[r["tier_final"]] < current_order

    candidates = []
    for direction, end in (("up", hi), ("down", lo)):
        bumped = dict(biomarkers)
        bumped[marker] = end
        end_result = _recompute(bumped)
        if not is_drop(end_result):
            continue
        # Binary search between cur and end — looking for the closest-to-cur
        # value of marker that achieves the tier drop
        near, far = cur, end
        for _ in range(max_iter):
            mid = (near + far) / 2
            bumped[marker] = mid
            mid_result = _recompute(bumped)
            if is_drop(mid_result):
                far = mid
            else:
                near = mid
        bumped[marker] = far
        final = _recompute(bumped)
        if not is_drop(final):
            continue
        candidates.append({
            "direction": direction,
            "target_value": far,
            "new_score": final["score_formula"],
            "new_tier": final["tier_final"],
            "rel_delta_pct": abs(far - cur) / cur * 100 if cur != 0 else 0,
        })

    if not candidates:
        return None
    best = min(candidates, key=lambda c: c["rel_delta_pct"])
    return {
        "marker": marker,
        "label": MARKER_LABEL.get(marker, marker),
        "current": round(cur, 3),
        "target_value": round(best["target_value"], 3),
        "delta": round(best["target_value"] - cur, 3),
        "rel_delta_pct": round(best["rel_delta_pct"], 1),
        "direction": best["direction"],
        "new_score": round(best["new_score"], 1),
        "new_tier": best["new_tier"],
    }


def analyze_patient(biomarkers: dict, current_score: float, current_tier: str) -> dict:
    """Return the full counterfactual analysis for one patient."""
    # 1. Sensitivities
    sens = []
    for m in PRIMARY_MARKERS:
        if biomarkers.get(m) is None:
            continue
        d = compute_sensitivity(biomarkers, m)
        if d is None:
            continue
        cur = biomarkers[m]
        sens.append({
            "marker": m,
            "label": MARKER_LABEL[m],
            "current": round(cur, 3),
            "d_score": round(d, 3),  # score change per 5% bump in marker
            "abs_importance": round(abs(d), 3),
        })
    sens.sort(key=lambda s: -s["abs_importance"])
    top_sensitivities = sens[:5]

    # 2. Tier-down counterfactuals — strict tier drops only
    target_tier_map = {"T2": "T1", "T3": "T2", "T4": "T3"}
    target_tier = target_tier_map.get(current_tier)
    counterfactuals = []
    if target_tier is not None:
        tier_ceilings = {"T1": 15.0, "T2": 25.0, "T3": 32.0}
        target_ceiling = tier_ceilings[target_tier]
        for m in PRIMARY_MARKERS:
            if biomarkers.get(m) is None:
                continue
            cf = find_counterfactual(biomarkers, m, target_ceiling, target_tier, current_tier)
            if cf:
                counterfactuals.append(cf)
        counterfactuals.sort(key=lambda c: c["rel_delta_pct"])
        counterfactuals = counterfactuals[:5]

    return {
        "current_score": round(current_score, 1),
        "current_tier": current_tier,
        "next_tier_below": (
            "T1" if current_tier == "T2"
            else "T2" if current_tier == "T3"
            else "T3" if current_tier == "T4"
            else None
        ),
        "sensitivities": top_sensitivities,
        "counterfactuals": counterfactuals,
    }
