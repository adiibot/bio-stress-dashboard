"""
Pattern recognition layer — sits on top of the v2.9.1 score engine and detects
multi-marker constellations the linear composite + floor rules don't capture
as a single penalty.

Each pattern returns a structured dict:
  {
    "id":        snake-case identifier,
    "name":      human-readable name,
    "tone":      "positive" | "neutral" | "warning",
    "summary":   one-line clinical interpretation,
    "evidence":  list of "marker = value (× threshold)" strings,
    "rationale": longer mechanistic note (optional),
  }

These are pre-computed in the build pipeline and surfaced in both the
clinician deep-dive and (filtered) the patient narrative view. They never
modify the score or tier — they are interpretive overlays.
"""
from __future__ import annotations


def _ev(label: str, value: float | None, ref: float, op: str = "x", unit: str = ""):
    """Format an evidence line like 'm3 = 0.84 (0.44 × LRL)'."""
    if value is None:
        return f"{label} = unavailable"
    rel = value / ref if ref else 0
    return f"{label} = {value:.2f}{unit} ({rel:.2f} {op} {('LRL' if op == 'x' and rel < 1 else 'URL') if op == 'x' else ref})"


def detect_patterns(b: dict, r: dict) -> list[dict]:
    """
    b = biomarkers dict (with None for missing values)
    r = score-engine result dict
    """
    out: list[dict] = []

    # --- HPA / cortisol patterns ---

    # Biphasic / U-shaped intraday cortisol — methodology LIM-4 (U065)
    m1, m2, m3, m4, m5 = b.get("m1"), b.get("m2"), b.get("m3"), b.get("m4"), b.get("m5")
    if m1 and m3 and m4 and m1 >= 8 and m3 < 1.9 and m4 >= m3 * 1.8 and m4 >= 1.5:
        out.append({
            "id": "BIPHASIC_CORTISOL",
            "name": "Biphasic intraday cortisol",
            "tone": "warning",
            "summary": "Morning preserved, midday collapse, afternoon rebound — a U-shape the linear DCS slope can't see.",
            "evidence": [
                f"m1 = {m1:.2f} nmol/L (preserved waking baseline)",
                f"m3 = {m3:.2f} nmol/L (midday collapse, < LRL 1.9)",
                f"m4 = {m4:.2f} nmol/L (afternoon rebound, m4/m3 = {m4/m3:.1f}×)",
            ],
            "rationale": "Distinct from straightforward HPA suppression. The m3→m4 delta is invisible to both linear DCS and DCS-SHAPE because the rebound peak does not exceed m1. Methodology LIM-4.",
        })

    # CAR ceiling-blunted — high m1 with small CAR (HPA saturation, not HPA failure)
    car_pct = b.get("car_pct")
    if m1 and car_pct is not None and m1 >= 13 and car_pct < 30:
        out.append({
            "id": "CAR_CEILING_BLUNTED",
            "name": "CAR blunted from a high baseline",
            "tone": "warning",
            "summary": "The cortisol axis is firing at waking but can't add a meaningful surge — saturation, not insufficiency.",
            "evidence": [
                f"m1 = {m1:.2f} nmol/L (≥ 13, elevated baseline)",
                f"CAR = {car_pct:.1f}% (< 30, blunted response)",
            ],
            "rationale": "Distinct mechanism from a blunted CAR with low m1. Indicates HPA already at ceiling rather than depleted reactivity.",
        })

    # Inverted circadian gradient — same trigger as CIR-1 floor rule, framed as pattern
    if m1 and m2 and m5 and m1 < 5.0 and m2 < 7.5 and m5 > 1.4:
        out.append({
            "id": "INVERTED_CIRCADIAN",
            "name": "Inverted circadian gradient",
            "tone": "warning",
            "summary": "Morning suppression with nocturnal cortisol excess — the daily rhythm is upside-down.",
            "evidence": [
                f"m1 = {m1:.2f} nmol/L (< LRL 5.0)",
                f"m2 = {m2:.2f} nmol/L (< LRL 7.5)",
                f"m5 = {m5:.2f} nmol/L (> URL 1.4)",
            ],
            "rationale": "Hallmark of advanced HPA circadian desynchronisation — phase-shifted rather than blunted.",
        })

    # Isolated nocturnal hypercortisolism — already a flag, surface as pattern
    aucg = b.get("aucg")
    dcs = b.get("dcs")
    if (m5 and m5 > 1.4 and m1 and 5 <= m1 <= 17.1 and car_pct is not None
            and 50 <= car_pct <= 120 and aucg is not None and 32 <= aucg <= 113
            and dcs is not None and -1.12 <= dcs <= -0.24):
        out.append({
            "id": "NOCTURNAL_HYPERCORTISOLISM",
            "name": "Isolated nocturnal cortisol excess",
            "tone": "neutral",
            "summary": "Daytime rhythm is preserved but evening cortisol fails to fall — sleep, late stimulants or rumination.",
            "evidence": [
                f"m5 = {m5:.2f} nmol/L (> URL 1.4)",
                f"daytime architecture preserved (CAR, AUCg, DCS, m1 all in NR)",
            ],
        })

    # Midday collapse only (MID-1)
    if m1 and m3 and m1 >= 8 and m3 < 1.9 and (m4 is None or m4 < m1):
        # not biphasic — pure midday collapse
        if not any(p["id"] == "BIPHASIC_CORTISOL" for p in out):
            out.append({
                "id": "MIDDAY_COLLAPSE",
                "name": "Midday cortisol collapse",
                "tone": "warning",
                "summary": "Healthy mornings followed by a midday low — predicts afternoon energy crashes and burnout risk.",
                "evidence": [
                    f"m1 = {m1:.2f} nmol/L (preserved morning)",
                    f"m3 = {m3:.2f} nmol/L (< LRL 1.9, {(1.9-m3)/1.9*100:.0f}% below)",
                ],
                "rationale": "MID-1 rule (Add.v2.9). Nater et al. 2018: midday cortisol superior to CAR for burnout prediction.",
            })

    # --- Adrenal patterns ---

    dhea = b.get("dhea")
    cor_dhea = b.get("cor_dhea")

    if r.get("reactive_buffer"):
        out.append({
            "id": "DHEA_REACTIVE_BUFFER",
            "name": "DHEA reactive buffer pattern",
            "tone": "positive",
            "summary": "DHEA is elevated as a compensatory response — an adaptive signal, not a pathology.",
            "evidence": [
                f"DHEA = {dhea:.2f} nmol/L (> URL 2.44)" if dhea is not None else "DHEA above URL",
                f"COR/DHEA = {cor_dhea:.2f} (≤ 6, balance preserved)" if cor_dhea is not None else "COR/DHEA in balance",
            ],
            "rationale": "Morgan 2004 — transient adrenal upregulation under acute stress, neuroprotective and anti-glucocorticoid. Partial penalty applied (40%).",
        })

    # Late depletion paradox — DHEA collapsed + extreme catabolic dominance
    if dhea is not None and cor_dhea is not None and dhea < 0.3 and cor_dhea > 15:
        out.append({
            "id": "LATE_DEPLETION_PARADOX",
            "name": "Adrenal exhaustion + catabolic collapse",
            "tone": "warning",
            "summary": "DHEA is severely depleted while cortisol still dominates — extreme allostatic load.",
            "evidence": [
                f"DHEA = {dhea:.2f} nmol/L (< 0.3, severe depletion)",
                f"COR/DHEA = {cor_dhea:.2f} (≥ 15, well above URL of 10)",
            ],
        })

    # --- Sympatho-adrenal patterns ---

    nor = b.get("nor")
    epi = b.get("epi")
    nor_epi = b.get("nor_epi")
    vma = b.get("vma")
    mhpg = b.get("mhpg")

    # Sympatho-adrenal exhaustion — chronic NOR with EPI collapse
    if nor_epi is not None and epi is not None and nor_epi > 9 and epi < 0.91:
        out.append({
            "id": "SYMPATHO_ADRENAL_EXHAUSTION",
            "name": "Sympatho-adrenal exhaustion",
            "tone": "warning",
            "summary": "Chronic noradrenergic activity with adrenal-medulla EPI depletion — a fatigue signature of sustained physiological stress.",
            "evidence": [
                f"NOR/EPI = {nor_epi:.2f} (> 9, well above URL 7)",
                f"EPI = {epi:.2f} µmol/mol (near or below LRL 0.76)",
            ],
            "rationale": "Differs from acute sympathetic overdrive — sustained nerve-terminal activity outlasts adrenal medulla reserve.",
        })

    # Pan-SAM saturation — high NOR + high EPI + high VMA
    if (nor is not None and nor > 28 and epi is not None and epi > 4.23
            and vma is not None and vma > 2.20):
        out.append({
            "id": "PAN_SAM_SATURATION",
            "name": "Pan-sympathoadrenal saturation",
            "tone": "warning",
            "summary": "Both noradrenergic and adrenal-medulla pathways are firing at ceiling with metabolite overflow.",
            "evidence": [
                f"NOR = {nor:.1f} µmol/mol (> URL 28)",
                f"EPI = {epi:.2f} µmol/mol (> URL 4.23)",
                f"VMA = {vma:.2f} mmol/mol (> URL 2.20)",
            ],
            "rationale": "Mandatory phaeochromocytoma exclusion (plasma metanephrines) per Lenders 2014 when VMA > 1.5× URL.",
        })

    # --- Monoamine / dopamine patterns ---

    da = b.get("da")
    dopac = b.get("dopac")
    hva = b.get("hva")
    ser = b.get("ser")
    hiaa = b.get("hiaa")
    hiaa_ser = b.get("hiaa_ser")
    da_ser = b.get("da_ser")
    hva_vma = b.get("hva_vma")

    # Dopamine pathway collapse — DA, DOPAC, HVA all low (DOPAC-1 trigger)
    if (da is not None and da < 108 and dopac is not None and dopac < 0.7
            and hva is not None and hva < 1.44):
        out.append({
            "id": "DOPAMINE_PATHWAY_COLLAPSE",
            "name": "Dopamine pathway synthesis failure",
            "tone": "warning",
            "summary": "DA, DOPAC, and HVA all below reference — synthesis is failing upstream of both catabolic enzymes.",
            "evidence": [
                f"DA = {da:.0f} µmol/mol (< LRL 108)",
                f"DOPAC = {dopac:.2f} mg/g (< LRL 0.70)",
                f"HVA = {hva:.2f} mmol/mol (< LRL 1.44)",
            ],
            "rationale": "Pure DA synthesis collapse — TH activity, BH4 cofactor, tyrosine substrate, or iron deficit. Different therapeutic pathway from MAO inhibition or COMT-shunt phenotypes.",
        })

    # COMT-shunt phenotype — DA low, DOPAC normal, HVA elevated
    if (da is not None and da < 108 and dopac is not None and dopac > 0.7
            and hva is not None and hva > 3.17):
        out.append({
            "id": "COMT_SHUNT_PHENOTYPE",
            "name": "COMT-shunt dopamine catabolism",
            "tone": "neutral",
            "summary": "Despite low dopamine, residual DA is being aggressively catabolised via the COMT pathway.",
            "evidence": [
                f"DA = {da:.0f} (< LRL 108)",
                f"HVA = {hva:.2f} (> URL 3.17, COMT-driven)",
                f"DOPAC = {dopac:.2f} (preserved, MAO arm intact)",
            ],
            "rationale": "Clinical implication: precursor supplementation alone unlikely to lift DA — COMT activity is the limiter. Often associated with COMT-fast variant.",
        })

    # Monoamine compensatory ceiling — SER and 5-HIAA both near URL
    if ser is not None and ser > 76 and hiaa is not None and hiaa > 2.8:
        out.append({
            "id": "MONOAMINE_CEILING",
            "name": "Peripheral monoamine ceiling",
            "tone": "neutral",
            "summary": "Peripheral serotonin pathway running near maximum throughput — likely compensatory.",
            "evidence": [
                f"SER = {ser:.0f} µmol/mol (near URL 89)",
                f"5-HIAA = {hiaa:.2f} mmol/mol (near URL 3.3)",
            ],
            "rationale": "Often co-occurs with HPA dysregulation — gut-level serotonin upregulating in response to chronic load. Monitor for abrupt depletion if cortisol axis worsens.",
        })

    # Pre-depletion overflow (PRECLINICAL_BURNOUT trigger framed as pattern)
    overflow_count = 0
    overflow_evidence = []
    if mhpg is not None and mhpg > 1.13:
        overflow_count += 1
        overflow_evidence.append(f"MHPG = {mhpg:.2f} ({mhpg/1.13:.2f}× URL)")
    if vma is not None and vma > 2.20:
        overflow_count += 1
        overflow_evidence.append(f"VMA = {vma:.2f} ({vma/2.20:.2f}× URL)")
    if hva is not None and hva > 3.17:
        overflow_count += 1
        overflow_evidence.append(f"HVA = {hva:.2f} ({hva/3.17:.2f}× URL)")
    if hiaa is not None and hiaa > 3.3:
        overflow_count += 1
        overflow_evidence.append(f"5-HIAA = {hiaa:.2f} ({hiaa/3.3:.2f}× URL)")
    nt_intact = (
        da is not None and 108 <= da <= 244
        and nor is not None and 11.1 <= nor <= 28.0
        and epi is not None and 0.76 <= epi <= 4.23
        and ser is not None and 38 <= ser <= 89
    )
    if nt_intact and overflow_count >= 2:
        out.append({
            "id": "PRE_DEPLETION_OVERFLOW",
            "name": "Pre-depletion metabolite overflow",
            "tone": "warning",
            "summary": "Primary neurotransmitters intact but catabolism is in overdrive — high-throughput compensation that often precedes overt depletion.",
            "evidence": overflow_evidence + ["primary NTs (DA, NOR, EPI, SER) all in NR"],
            "rationale": "Sonnenschein 2007 exhaustion-disorder framework — this state is the immediate antecedent of decompensated burnout.",
        })

    # Catecholamine catabolic balance (HVA/VMA)
    if hva_vma is not None and hva_vma > 2.83:
        out.append({
            "id": "DA_CATABOLIC_DOMINANT",
            "name": "Dopaminergic catabolism dominance",
            "tone": "neutral",
            "summary": "Catecholamine breakdown is skewed toward the dopamine arm — DBH, COMT or dietary contributors.",
            "evidence": [
                f"HVA/VMA = {hva_vma:.2f} (> URL 2.83)",
            ],
            "rationale": "Differential includes DBH cofactor deficiency (copper, vitamin C), MAO-A deficiency, Clostridia-derived inhibitors, or polyphenol-driven HVA elevation.",
        })
    elif hva_vma is not None and hva_vma < 0.23:
        out.append({
            "id": "NOR_CATABOLIC_DOMINANT",
            "name": "Noradrenergic catabolism dominance",
            "tone": "neutral",
            "summary": "Catecholamine breakdown is skewed toward the noradrenaline arm — sympathetic-dominant phenotype.",
            "evidence": [
                f"HVA/VMA = {hva_vma:.2f} (< LRL 0.23)",
            ],
            "rationale": "Phase 1 HPA stabilisation priority. Cardiac-coherence and HRV protocols lead.",
        })

    # --- Positive patterns ---

    # Healthy reactivity — preserved CAR + preserved DHEA + no rules
    if (car_pct is not None and 50 <= car_pct <= 120 and dhea is not None and 1.0 <= dhea <= 2.44
            and not r.get("applied_rules")):
        out.append({
            "id": "HEALTHY_REACTIVITY",
            "name": "Healthy stress reactivity",
            "tone": "positive",
            "summary": "Robust CAR, well-stocked DHEA, no triggered rules — the stress system is functioning as designed.",
            "evidence": [
                f"CAR = {car_pct:.0f}% (in NR 50–120)",
                f"DHEA = {dhea:.2f} nmol/L (mid–high range)",
            ],
        })

    return out
