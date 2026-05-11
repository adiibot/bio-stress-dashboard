"""
Run the v2.9.1 score engine over the longitudinal synthetic cohort and
write JSON artifacts for the Next.js dashboard.

The April 30 2026 dataset upgrade gave us 10,000 patients × up to 12 visits
each (109k visit rows) with ground-truth phenotype labels, trajectory tags
(recovery / decline / stable), sigmoid trajectory parameters, and realistic
missingness. We score every visit, attach the longitudinal trajectory to
each patient, and surface the latest valid visit as the patient's "current"
state in the dashboard.

Outputs (under web/public/data/):
  cohort.json              cohort + trajectory + phenotype aggregates
  patients-index.json      slim list (latest visit per patient) for roster
  patients/<id>.json       full per-patient record incl. all visits
"""
from __future__ import annotations

import json
import math
import shutil
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

from score_engine import bio_stress_score, result_to_dict, NR
from pattern_engine import detect_patterns


REPO = Path(__file__).resolve().parent.parent
XLSX = REPO / "Bio_Stress_Synthetic_Realistic.xlsx"
OUT = REPO / "web" / "public" / "data"
PATIENTS_DIR = OUT / "patients"


COLS = {
    "id": "userID",
    "lab_id": "lab ID",
    "sample_id": "ID",
    "date": "Date of collection",
    "dob": "DOB",
    "sex": "SEX",
    "visit_num": "VISIT_NUM",
    "days": "DAYS_FROM_BASELINE",
    "m1": "COR_awake-NU (m1)",
    "m2": "COR_awake_30-NU (m2)",
    "m3": "COR_noon-NU (m3)",
    "m4": "COR_evening-NU (m4)",
    "m5": "COR_night-NU (m5)",
    "car_pct": "CAR-NU",
    "aucg": "AUCg-NU",
    "dcs": "DCS-NU",
    "dhea": "DHEA-NU",
    "cor_dhea": "COR/DHEA-NU",
    "da": "DOP-NU",
    "dopac": "DOPAC-NU",
    "hva": "HVA-NU",
    "nor": "NOR-NU",
    "epi": "EPI-NU",
    "vma": "VMA-NU",
    "mhpg": "MHPG-NU",
    "nor_epi": "NOR/EPI-NU",
    "hva_vma": "HVA/VMA-NU",
    "ser": "SER-NU",
    "hiaa": "5HIAA-NU",
    "hiaa_ser": "5HIAA/SER-NU",
    "da_ser": "DA/SER-NU",
    "creatinine": "CREATUR-NU",
}

BIOMARKER_KEYS = [
    "m1", "m2", "m3", "m4", "m5",
    "car_pct", "aucg", "dcs",
    "dhea", "cor_dhea",
    "da", "dopac", "hva", "nor", "epi", "vma", "mhpg",
    "nor_epi", "hva_vma",
    "ser", "hiaa", "hiaa_ser", "da_ser",
    "creatinine",
]

SCORING_INPUTS = [
    "m1", "m2", "m3", "m4", "m5", "car_pct", "dcs", "aucg",
    "dhea", "cor_dhea",
    "da", "nor", "epi", "nor_epi", "dopac", "hva", "vma", "mhpg",
    "ser", "hiaa", "hiaa_ser", "da_ser",
]


def safe_num(v):
    try:
        f = float(v)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (TypeError, ValueError):
        return None


def parse_date(v):
    if pd.isna(v):
        return None
    if isinstance(v, str):
        for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
            try:
                return datetime.strptime(v, fmt).date()
            except ValueError:
                continue
    if hasattr(v, "date"):
        return v.date()
    return None


def age_at(dob, ref):
    if dob is None or ref is None:
        return None
    return round((ref - dob).days / 365.25, 1)


def percentile_rank(arr_sorted, value):
    if value is None or not arr_sorted:
        return None
    import bisect
    return round(bisect.bisect_left(arr_sorted, value) / len(arr_sorted) * 100, 1)


def score_visit(row):
    """Score one visit row. Returns (result_dict, biomarkers_dict, valid_flag)."""
    biomarkers = {k: safe_num(row.get(COLS[k])) for k in BIOMARKER_KEYS}
    args = {k: biomarkers[k] for k in SCORING_INPUTS}
    if any(v is None for v in args.values()):
        return None, biomarkers, False
    r = bio_stress_score(creatinine_ur=biomarkers.get("creatinine"), **args)
    return result_to_dict(r), biomarkers, True


def _build_embedding_sample(coords, records, n=3000):
    """Stratified down-sample of the cohort to keep the cluster viz responsive."""
    import random
    rng = random.Random(42)
    total = len(records)
    if total <= n:
        idx = list(range(total))
    else:
        # stratify by phenotype to keep the colour distribution honest
        by_pheno: dict[str, list[int]] = {}
        for i, p in enumerate(records):
            by_pheno.setdefault(p["phenotype_baseline"] or "?", []).append(i)
        idx: list[int] = []
        for pheno, lst in by_pheno.items():
            quota = max(50, round(n * len(lst) / total))
            idx.extend(rng.sample(lst, min(quota, len(lst))))
        rng.shuffle(idx)
        idx = idx[:n]
    out = []
    for i in idx:
        rec = records[i]
        latest = rec["visits"][rec["latest_visit_idx"]]
        out.append({
            "id": rec["id"],
            "x": round(float(coords[i, 0]), 3),
            "y": round(float(coords[i, 1]), 3),
            "phenotype": rec["phenotype_baseline"],
            "tier": latest["result"]["tier_final"],
            "trajectory": rec["trajectory"],
            "score": latest["result"]["score_formula"],
        })
    return out


def main():
    print(f"loading {XLSX}")
    df = pd.read_excel(XLSX, sheet_name="Raw_data")
    df = df.iloc[2:].reset_index(drop=True)  # drop units + NR header rows
    print(f"  {len(df):,} visit rows, {len(df.columns)} cols")

    meta_df = pd.read_excel(XLSX, sheet_name="patient_metadata")
    meta_df["enrollment_date"] = pd.to_datetime(meta_df["enrollment_date"], errors="coerce", dayfirst=True)
    meta = {row["userID"]: row.to_dict() for _, row in meta_df.iterrows()}
    print(f"  {len(meta):,} patient metadata rows")

    # numeric coercion
    for k in BIOMARKER_KEYS:
        col = COLS[k]
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    df[COLS["dob"]] = pd.to_datetime(df[COLS["dob"]], errors="coerce")
    df[COLS["date"]] = pd.to_datetime(df[COLS["date"]], errors="coerce", dayfirst=True)
    df[COLS["visit_num"]] = pd.to_numeric(df[COLS["visit_num"]], errors="coerce").astype("Int64")
    df[COLS["days"]] = pd.to_numeric(df[COLS["days"]], errors="coerce")

    # output dirs
    OUT.mkdir(parents=True, exist_ok=True)
    if PATIENTS_DIR.exists():
        shutil.rmtree(PATIENTS_DIR)
    PATIENTS_DIR.mkdir(parents=True, exist_ok=True)

    # accumulators for cohort percentile calculation (use latest valid visit per patient)
    raw_arrays = {k: [] for k in BIOMARKER_KEYS}
    score_arr = []
    age_arr = []

    print("scoring visits...")
    grouped = df.groupby(COLS["id"], sort=False)
    n_patients = 0
    n_visits = 0
    n_visits_scored = 0
    n_visits_invalid = 0
    patient_records = []

    for uid, group in grouped:
        if pd.isna(uid):
            continue
        group = group.sort_values(COLS["visit_num"]).reset_index(drop=True)
        m = meta.get(uid, {})
        sex_raw = group[COLS["sex"]].dropna().iloc[0] if group[COLS["sex"]].notna().any() else None
        sex = str(sex_raw).strip() if sex_raw is not None and not pd.isna(sex_raw) else None
        dob_raw = group[COLS["dob"]].dropna().iloc[0] if group[COLS["dob"]].notna().any() else None
        dob = parse_date(dob_raw) if dob_raw is not None else None
        lab_id_raw = group[COLS["lab_id"]].dropna().iloc[0] if group[COLS["lab_id"]].notna().any() else None
        try:
            lab_id = str(int(lab_id_raw)) if lab_id_raw is not None else None
        except (TypeError, ValueError):
            lab_id = str(lab_id_raw) if lab_id_raw is not None else None

        visits = []
        latest_valid_idx = None
        for i, row in group.iterrows():
            n_visits += 1
            visit_num = int(row[COLS["visit_num"]]) if not pd.isna(row[COLS["visit_num"]]) else None
            days = int(row[COLS["days"]]) if not pd.isna(row[COLS["days"]]) else None
            collection_date = parse_date(row[COLS["date"]])

            result, biomarkers, valid = score_visit(row)
            if valid:
                n_visits_scored += 1
                latest_valid_idx = len(visits)
            else:
                n_visits_invalid += 1

            visits.append({
                "visit_num": visit_num,
                "days": days,
                "date": collection_date.isoformat() if collection_date else None,
                "valid": valid,
                "biomarkers": biomarkers,
                "result": result,
            })

        if latest_valid_idx is None:
            # patient has no scorable visits — skip (rare)
            continue
        n_patients += 1

        latest = visits[latest_valid_idx]
        latest_age = age_at(dob, parse_date(latest["date"])) if latest["date"] else None

        # accumulate percentile arrays from latest valid visit only
        for k in BIOMARKER_KEYS:
            v = latest["biomarkers"].get(k)
            if v is not None:
                raw_arrays[k].append(v)
        score_arr.append(latest["result"]["score_formula"])
        if latest_age is not None:
            age_arr.append(latest_age)

        patient_records.append({
            "id": uid,
            "lab_id": lab_id,
            "sex": sex,
            "age": latest_age,
            "dob": dob.isoformat() if dob else None,
            "phenotype_baseline": m.get("phenotype_baseline"),
            "phenotype_target": m.get("phenotype_target"),
            "trajectory": m.get("trajectory"),
            "trajectory_strength": safe_num(m.get("trajectory_strength")),
            "enrollment_date": m["enrollment_date"].isoformat() if m.get("enrollment_date") is not None and not pd.isna(m.get("enrollment_date")) else None,
            "n_visits_attended": int(m.get("n_visits_attended") or 0),
            "n_visits_with_data": int(m.get("n_visits_with_data") or 0),
            "visit_span_days": int(m.get("visit_span_days") or 0),
            "latest_visit_idx": latest_valid_idx,
            "visits": visits,
        })

        if n_patients % 1000 == 0:
            print(f"  {n_patients:,} patients · {n_visits_scored:,} visits scored")

    print(f"  total: {n_patients:,} patients · {n_visits:,} visits ({n_visits_scored:,} scored, {n_visits_invalid:,} invalid)")

    # sort biomarker arrays for percentile lookup
    for k in raw_arrays:
        raw_arrays[k].sort()
    score_sorted = sorted(score_arr)

    print("building cohort aggregates...")

    tier_counts = Counter()
    sex_counts = Counter()
    tier_x_sex = defaultdict(lambda: Counter())
    tier_x_age = defaultdict(lambda: Counter())
    score_hist = Counter()
    # per-axis severity-tone distribution (calm / stirring / loud / exhausted)
    axis_tone_counts = {
        "hpa": Counter(),
        "adrenal": Counter(),
        "nt": Counter(),
    }
    def _tone(v: float) -> str:
        if v < 16: return "calm"
        if v < 26: return "stirring"
        if v < 33: return "loud"
        return "exhausted"
    rule_prev = Counter()
    flag_prev = Counter()
    rule_pairs = Counter()
    phase_counts = Counter()
    phenotype_counts = Counter()
    trajectory_counts = Counter()
    phenotype_x_tier = defaultdict(lambda: Counter())
    trajectory_x_tier = defaultdict(lambda: Counter())
    trajectory_score_curves = defaultdict(list)  # trajectory -> list of (months, score)

    def age_band(a):
        if a is None:
            return "unknown"
        if a < 30:
            return "<30"
        if a < 40:
            return "30-39"
        if a < 50:
            return "40-49"
        if a < 60:
            return "50-59"
        return "60+"

    for p in patient_records:
        latest = p["visits"][p["latest_visit_idx"]]
        result = latest["result"]
        tier = result["tier_final"]
        tier_counts[tier] += 1
        sex_counts[p["sex"] or "?"] += 1
        tier_x_sex[tier][p["sex"] or "?"] += 1
        tier_x_age[tier][age_band(p["age"])] += 1
        score_hist[int(result["score_formula"] // 5 * 5)] += 1
        axis_tone_counts["hpa"][_tone(result["hpa_score"])] += 1
        axis_tone_counts["adrenal"][_tone(result["adrenal_score"])] += 1
        axis_tone_counts["nt"][_tone(result["nt_score"])] += 1

        rules = sorted(set(result["applied_rules"]))
        for r in rules:
            rule_prev[r] += 1
        for f in result["phenotype_flags"]:
            flag_prev[f] += 1
        for i, a in enumerate(rules):
            for b in rules[i + 1:]:
                rule_pairs[f"{a}|{b}"] += 1

        phase_counts[result["suggested_phase"]] += 1

        if p["phenotype_baseline"]:
            phenotype_counts[p["phenotype_baseline"]] += 1
            phenotype_x_tier[p["phenotype_baseline"]][tier] += 1
        if p["trajectory"]:
            trajectory_counts[p["trajectory"]] += 1
            trajectory_x_tier[p["trajectory"]][tier] += 1
            # accumulate score over months for this trajectory class
            for v in p["visits"]:
                if v["valid"] and v["days"] is not None:
                    trajectory_score_curves[p["trajectory"]].append(
                        (v["days"] / 30.0, v["result"]["score_formula"])
                    )

    # bin trajectory curves into monthly averages
    trajectory_curves_binned = {}
    for traj, points in trajectory_score_curves.items():
        bins = defaultdict(list)
        for months, score in points:
            bins[round(months)].append(score)
        trajectory_curves_binned[traj] = [
            {"month": m, "score": round(float(np.mean(v)), 2), "n": len(v)}
            for m, v in sorted(bins.items())
        ]

    biomarker_summary = {}
    for k, arr in raw_arrays.items():
        if not arr:
            continue
        arr_np = np.array(arr)
        nr = NR.get(k)
        below = int((arr_np < nr[0]).sum()) if nr else None
        above = int((arr_np > nr[1]).sum()) if nr else None
        biomarker_summary[k] = {
            "count": len(arr),
            "min": float(arr_np.min()),
            "max": float(arr_np.max()),
            "mean": round(float(arr_np.mean()), 3),
            "median": round(float(np.median(arr_np)), 3),
            "p5": round(float(np.percentile(arr_np, 5)), 3),
            "p25": round(float(np.percentile(arr_np, 25)), 3),
            "p75": round(float(np.percentile(arr_np, 75)), 3),
            "p95": round(float(np.percentile(arr_np, 95)), 3),
            "lrl": nr[0] if nr else None,
            "url": nr[1] if nr else None,
            "below_lrl": below,
            "above_url": above,
            "in_range": (len(arr) - (below or 0) - (above or 0)) if nr else None,
        }

    # write index
    print("writing index...")
    index = []
    for p in patient_records:
        latest = p["visits"][p["latest_visit_idx"]]
        result = latest["result"]
        # delta vs first valid visit (for trajectory direction)
        first_valid = next((v for v in p["visits"] if v["valid"]), None)
        delta = (
            round(result["score_formula"] - first_valid["result"]["score_formula"], 1)
            if first_valid and first_valid is not latest
            else 0.0
        )
        index.append({
            "id": p["id"],
            "sex": p["sex"],
            "age": p["age"],
            "score": result["score_formula"],
            "score_patient": result["score_displayed_patient"],
            "tier": result["tier_final"],
            "phase": result["suggested_phase"],
            "rules": result["applied_rules"],
            "flags": result["phenotype_flags"],
            "hpa": result["hpa_score"],
            "adrenal": result["adrenal_score"],
            "nt": result["nt_score"],
            "phenotype": p["phenotype_baseline"],
            "phenotype_target": p["phenotype_target"],
            "trajectory": p["trajectory"],
            "n_visits": sum(1 for v in p["visits"] if v["valid"]),
            "delta": delta,
        })
    (OUT / "patients-index.json").write_text(json.dumps(index, separators=(",", ":")))
    print(f"  patients-index.json — {(OUT / 'patients-index.json').stat().st_size // 1024} KB")

    # ---- Pattern recognition (latest visit per patient) ----
    print("detecting patterns...")
    pattern_prev = Counter()
    pattern_lists: list[list[dict]] = []
    for p in patient_records:
        latest = p["visits"][p["latest_visit_idx"]]
        patterns = detect_patterns(latest["biomarkers"], latest["result"])
        pattern_lists.append(patterns)
        for pat in patterns:
            pattern_prev[pat["id"]] += 1
    print(f"  {sum(len(pl) for pl in pattern_lists):,} pattern hits across {len(patient_records):,} patients")

    # ---- Engine vs ground-truth agreement ----
    print("computing engine vs ground-truth agreement...")
    # expected tier per phenotype (numeric 1..4 + range tolerance)
    EXPECTED_TIER = {
        "Healthy": 1,
        "AcuteStress": 2,
        "EarlyBurnout": 2,
        "Burnout": 3,
        "Exhaustion": 4,
        "AdrenalFatigue": 4,
        "SympatheticDominance": 2,
    }
    TIER_NUM = {"T1": 1, "T2": 2, "T3": 3, "T4": 4}
    agreement_matrix: dict[str, dict[str, int]] = {p: {"T1": 0, "T2": 0, "T3": 0, "T4": 0} for p in EXPECTED_TIER}
    strict_match = 0
    within_one = 0
    total_with_pheno = 0
    stable_strict_match = 0
    stable_total = 0
    for p in patient_records:
        pheno = p["phenotype_baseline"]
        if not pheno or pheno not in EXPECTED_TIER:
            continue
        latest = p["visits"][p["latest_visit_idx"]]
        engine_tier = latest["result"]["tier_final"]
        agreement_matrix[pheno][engine_tier] += 1
        diff = abs(TIER_NUM[engine_tier] - EXPECTED_TIER[pheno])
        total_with_pheno += 1
        if diff == 0:
            strict_match += 1
        if diff <= 1:
            within_one += 1
        if p["trajectory"] == "stable":
            stable_total += 1
            if diff == 0:
                stable_strict_match += 1

    # ---- 2D PCA embedding for the cohort ----
    print("computing 2D embedding (PCA on biomarker z-scores)...")
    # We'll compute Xn (z-scored) below in the neighbors step — do it here too to share
    feature_keys_for_emb = [
        "m1", "m2", "m3", "m4", "m5",
        "car_pct", "aucg", "dcs",
        "dhea", "cor_dhea",
        "da", "dopac", "hva", "nor", "epi", "vma", "mhpg",
        "ser", "hiaa", "hiaa_ser", "da_ser",
    ]
    feat = []
    for p in patient_records:
        latest = p["visits"][p["latest_visit_idx"]]
        feat.append([
            (latest["biomarkers"].get(k) if latest["biomarkers"].get(k) is not None else np.nan)
            for k in feature_keys_for_emb
        ])
    Xemb = np.array(feat, dtype=np.float64)
    col_med = np.nanmedian(Xemb, axis=0)
    nan_mask_e = np.isnan(Xemb)
    Xemb[nan_mask_e] = np.take(col_med, np.where(nan_mask_e)[1])
    mu_e = Xemb.mean(axis=0)
    sigma_e = Xemb.std(axis=0)
    sigma_e[sigma_e == 0] = 1.0
    Xz = (Xemb - mu_e) / sigma_e
    # PCA via SVD
    Xc = Xz - Xz.mean(axis=0)
    _U, _S, Vt = np.linalg.svd(Xc, full_matrices=False)
    coords = Xc @ Vt[:2].T  # (N, 2)
    # explained variance
    var_total = (Xc ** 2).sum() / (len(Xc) - 1)
    pc1_var = (_S[0] ** 2) / (len(Xc) - 1)
    pc2_var = (_S[1] ** 2) / (len(Xc) - 1)
    pc1_pct = pc1_var / var_total * 100
    pc2_pct = pc2_var / var_total * 100
    print(f"  PC1 {pc1_pct:.1f}% · PC2 {pc2_pct:.1f}% explained variance")

    # ---- Nearest neighbors via cosine similarity in z-score biomarker space ----
    print("computing nearest neighbors...")
    # Reuse the z-scored matrix computed for embedding
    Xn = Xz
    norms = np.linalg.norm(Xn, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    Xu = Xn / norms

    K = 5
    N = len(patient_records)
    neighbor_idx = np.zeros((N, K), dtype=np.int64)
    neighbor_sim = np.zeros((N, K), dtype=np.float64)
    BATCH = 256
    for i in range(0, N, BATCH):
        end = min(i + BATCH, N)
        sim = Xu[i:end] @ Xu.T  # (batch, N)
        # mask self
        for j in range(end - i):
            sim[j, i + j] = -np.inf
        # take top K
        idx = np.argpartition(-sim, K, axis=1)[:, :K]
        # sort within those K
        for j in range(end - i):
            picks = idx[j]
            sims = sim[j, picks]
            order = np.argsort(-sims)
            neighbor_idx[i + j] = picks[order]
            neighbor_sim[i + j] = sims[order]
        if (i // BATCH) % 10 == 0:
            print(f"  neighbors {end}/{N}")
    print(f"  neighbors computed for {N:,} patients")

    # write per-patient files (with percentile attached for latest visit)
    print("writing per-patient files...")
    for pi, p in enumerate(patient_records):
        latest = p["visits"][p["latest_visit_idx"]]
        percentiles = {}
        for k in BIOMARKER_KEYS:
            v = latest["biomarkers"].get(k)
            if v is not None and raw_arrays[k]:
                percentiles[k] = percentile_rank(raw_arrays[k], v)
        score_pct = percentile_rank(score_sorted, latest["result"]["score_formula"])

        # nearest neighbors
        neighbors = []
        for k in range(K):
            j = int(neighbor_idx[pi, k])
            if j < 0 or j >= N:
                continue
            np_rec = patient_records[j]
            np_latest = np_rec["visits"][np_rec["latest_visit_idx"]]
            np_result = np_latest["result"]
            neighbors.append({
                "id": np_rec["id"],
                "similarity": round(float(neighbor_sim[pi, k]), 4),
                "score": np_result["score_formula"],
                "tier": np_result["tier_final"],
                "phenotype": np_rec.get("phenotype_baseline"),
                "trajectory": np_rec.get("trajectory"),
                "sex": np_rec.get("sex"),
                "age": np_rec.get("age"),
            })

        # trajectory: score over time, only valid visits
        trajectory = [
            {
                "visit": v["visit_num"],
                "days": v["days"],
                "month": round(v["days"] / 30.0, 2) if v["days"] is not None else None,
                "date": v["date"],
                "score": v["result"]["score_formula"],
                "tier": v["result"]["tier_final"],
                "hpa": v["result"]["hpa_score"],
                "adrenal": v["result"]["adrenal_score"],
                "nt": v["result"]["nt_score"],
            }
            for v in p["visits"]
            if v["valid"]
        ]

        # full latest visit record (used for the deep-dive page)
        record = {
            "id": p["id"],
            "lab_id": p["lab_id"],
            "sex": p["sex"],
            "age": p["age"],
            "dob": p["dob"],
            "phenotype_baseline": p["phenotype_baseline"],
            "phenotype_target": p["phenotype_target"],
            "trajectory": p["trajectory"],
            "trajectory_strength": p["trajectory_strength"],
            "enrollment_date": p["enrollment_date"],
            "n_visits_attended": p["n_visits_attended"],
            "n_visits_with_data": p["n_visits_with_data"],
            "visit_span_days": p["visit_span_days"],
            "latest_visit": {
                "visit_num": latest["visit_num"],
                "days": latest["days"],
                "date": latest["date"],
                "biomarkers": latest["biomarkers"],
                "result": latest["result"],
            },
            "trajectory_data": trajectory,
            "percentiles": percentiles,
            "score_percentile": score_pct,
            "patterns": pattern_lists[pi],
            "neighbors": neighbors,
            "embedding": {
                "x": round(float(coords[pi, 0]), 4),
                "y": round(float(coords[pi, 1]), 4),
            },
            "expected_tier": (
                f"T{EXPECTED_TIER[p['phenotype_baseline']]}"
                if p["phenotype_baseline"] in EXPECTED_TIER
                else None
            ),
        }
        (PATIENTS_DIR / f"{p['id']}.json").write_text(json.dumps(record, separators=(",", ":")))
    print(f"  {len(patient_records):,} patient files in {PATIENTS_DIR}")

    cohort = {
        "total_patients": n_patients,
        "total_visits": n_visits,
        "scored_visits": n_visits_scored,
        "invalid_visits": n_visits_invalid,
        "tier_counts": dict(tier_counts),
        "sex_counts": dict(sex_counts),
        "tier_x_sex": {k: dict(v) for k, v in tier_x_sex.items()},
        "tier_x_age": {k: dict(v) for k, v in tier_x_age.items()},
        "score_histogram": dict(sorted(score_hist.items())),
        "rule_prevalence": dict(rule_prev.most_common()),
        "flag_prevalence": dict(flag_prev.most_common()),
        "rule_co_occurrence": dict(rule_pairs.most_common(30)),
        "biomarker_summary": biomarker_summary,
        "phase_counts": dict(sorted(phase_counts.items())),
        "pattern_prevalence": dict(pattern_prev.most_common()),
        "axis_tone_counts": {
            k: {tone: c.get(tone, 0) for tone in ["calm", "stirring", "loud", "exhausted"]}
            for k, c in axis_tone_counts.items()
        },
        "agreement": {
            "expected_tier": EXPECTED_TIER,
            "matrix": agreement_matrix,
            "strict_match": strict_match,
            "within_one": within_one,
            "total_with_pheno": total_with_pheno,
            "stable_strict_match": stable_strict_match,
            "stable_total": stable_total,
        },
        "embedding": {
            "pc1_pct": round(float(pc1_pct), 1),
            "pc2_pct": round(float(pc2_pct), 1),
            # downsampled scatter — at most 3000 dots for the cohort viz
            "sample": _build_embedding_sample(coords, patient_records, n=3000),
        },
        "phenotype_counts": dict(phenotype_counts.most_common()),
        "trajectory_counts": dict(trajectory_counts.most_common()),
        "phenotype_x_tier": {k: dict(v) for k, v in phenotype_x_tier.items()},
        "trajectory_x_tier": {k: dict(v) for k, v in trajectory_x_tier.items()},
        "trajectory_curves": trajectory_curves_binned,
        "score_stats": {
            "mean": round(float(np.mean(score_arr)), 2),
            "median": round(float(np.median(score_arr)), 2),
            "p25": round(float(np.percentile(score_arr, 25)), 2),
            "p75": round(float(np.percentile(score_arr, 75)), 2),
        },
        "age_stats": {
            "mean": round(float(np.mean(age_arr)), 1),
            "median": round(float(np.median(age_arr)), 1),
            "min": round(float(np.min(age_arr)), 1),
            "max": round(float(np.max(age_arr)), 1),
        } if age_arr else None,
    }
    (OUT / "cohort.json").write_text(json.dumps(cohort, indent=2))
    print(f"  cohort.json — {(OUT / 'cohort.json').stat().st_size // 1024} KB")

    print("done.")


if __name__ == "__main__":
    main()
