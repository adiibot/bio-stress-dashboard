"""
BIO_STRESS_SCORE v2.9.1 — extended scoring engine.

Canonical algorithm lifted from methodology §18.7 and extended with:
  - axis-level breakdown (HPA, Adrenal, NT-cat, NT-mon)
  - sub-penalty contribution tracking
  - phase-entry recommendation per §7
  - plain-language insight generation per the locked clinical reporting rule
  - cohort-percentile attachment (filled in by build.py after cohort run)

Reference ranges per methodology §2 (Sorcova standard). Do not edit penalty
shapes without bumping the methodology version — the algorithm is locked.
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Optional


# --- reference ranges (Sorcova standard, §2 + §18) ----------------------------
NR = {
    "m1": (5.0, 17.1),
    "m2": (7.5, 25.6),
    "m3": (1.9, 5.2),
    "m4": (0.3, 3.0),
    "m5": (0.3, 1.4),
    "car_pct": (50, 120),
    "aucg": (32, 113),
    "dcs": (-1.12, -0.24),
    "dhea": (0.53, 2.44),
    "cor_dhea": (5, 6),
    "da": (108, 244),
    "dopac": (0.7, 4.0),
    "hva": (1.44, 3.17),
    "nor": (11.1, 28.0),
    "epi": (0.76, 4.23),
    "vma": (1.04, 2.20),
    "mhpg": (0.52, 1.13),
    "ser": (38, 89),
    "hiaa": (1.0, 3.3),
    "nor_epi": (3, 7),
    "hiaa_ser": (0.03, 0.08),
    "da_ser": (1.5, 3.5),
    "hva_vma": (0.23, 2.83),
    "creatinine": (80, 120),
}

TIER_MIN = {"T1": 0, "T2": 16, "T3": 26, "T4": 33}
TIER_MAX = {"T1": 15, "T2": 25, "T3": 32, "T4": 100}


# --- helpers ------------------------------------------------------------------
def clamp(v, lo=0.0, hi=100.0):
    return max(lo, min(hi, v))


def tier_from_score(score: float) -> str:
    if score <= 15:
        return "T1"
    if score <= 25:
        return "T2"
    if score <= 32:
        return "T3"
    return "T4"


def tier_max(t1: str, t2: str) -> str:
    order = ["T1", "T2", "T3", "T4"]
    return order[max(order.index(t1), order.index(t2))]


# --- cortisol component penalty functions (§18.2) -----------------------------
def car_dysr(c):
    if c < 50:
        return clamp((50 - c) / 90 * 100)
    if c > 120:
        return clamp((c - 120) / 120 * 60)
    return 0.0


def m3_dysr(m3, m1):
    """MID-1 rule (Add.v2.9). Capped at 80."""
    if m3 < 1.9 and m1 >= 5.0:
        return clamp((1.9 - m3) / 1.9 * 80)
    return 0.0


def aucg_dysr(a):
    if a < 32:
        return clamp((32 - a) / 32 * 100)
    if a > 113:
        return clamp((a - 113) / 113 * 70)
    return 0.0


def m1_dysr(m, car_pct):
    if m < 5:
        return clamp((5 - m) / 5 * 80)
    if m > 17.1:
        return clamp((m - 17.1) / 17.1 * 60)
    if 5 <= m < 8 and car_pct < 20:
        return clamp((8 - m) / 3 * 30)
    return 0.0


def dcs_dysr(d, m1v=None, m3v=None, m4v=None):
    lin = 0.0
    if d > -0.24:
        lin = clamp(abs(-0.24 - d) / 0.24 * 100 + 50)
    elif d < -1.12:
        lin = clamp(abs(d + 1.12) / 1.12 * 30)
    if m1v and m3v and m4v:
        peak = max(m3v, m4v)
        shape = clamp((peak - m1v) / m1v * 50) if peak > m1v else 0.0
        return max(lin, shape)
    return lin


# --- adrenal component (§18.3) -----------------------------------------------
def dhea_component(dhea, cor_dhea):
    if dhea < 0.53:
        full = clamp((0.53 - dhea) / 0.53 * 100)
    elif dhea > 2.44:
        full = clamp((dhea - 2.44) / 2.44 * 40)
    else:
        full = 0.0
    reactive = dhea > 2.44 and cor_dhea <= 6
    dhea_app = full * 0.40 if reactive else full
    if cor_dhea > 6:
        cdh = clamp((cor_dhea - 6) / 14 * 100)
    elif cor_dhea < 5:
        cdh = clamp((5 - cor_dhea) / 5 * 30)
    else:
        cdh = 0.0
    return {
        "score": dhea_app * 0.40 + cdh * 0.60,
        "dhea_pen": dhea_app,
        "cor_dhea_pen": cdh,
        "reactive_buffer": reactive,
    }


# --- NT component (§18.4) ----------------------------------------------------
def nt_single(nu, lrl, url, dep_severe=True):
    if nu < lrl:
        return clamp((lrl - nu) / lrl * 100 * (1.0 if dep_severe else 0.6))
    if nu > url:
        return clamp((nu - url) / url * 100 * (0.6 if dep_severe else 1.0))
    return 0.0


def nor_epi_dysr(r):
    if r > 7:
        return clamp((r - 7) / 21 * 100)
    if r < 3:
        return clamp((3 - r) / 3 * 40)
    return 0.0


def hiaa_ser_dysr(r):
    if r > 0.08:
        return clamp((r - 0.08) / 0.08 * 70)
    if r < 0.03:
        return clamp((0.03 - r) / 0.03 * 100)
    return 0.0


def da_ser_dysr(r):
    if r < 1.5:
        return clamp((1.5 - r) / 1.5 * 100)
    if r > 3.5:
        return clamp((r - 3.5) / 3.5 * 50)
    return 0.0


# --- floor rule evaluators (§5) ----------------------------------------------
def evaluate_car1(car_pct):
    if car_pct <= -20:
        return {"rule": "CAR-1", "tier_floor": "T2",
                "trigger": f"CAR%={car_pct:.1f} ≤ −20% (severe inversion)"}
    return None


def evaluate_car2(car_pct, cor_dhea, dhea, aucg, da, epi, nor_epi):
    cond1 = car_pct <= -30
    cond2 = cor_dhea > 10
    cond3 = (dhea < 0.53) or (aucg > 113) or (da < 108) or (epi < 0.76 and nor_epi > 7)
    if cond1 and cond2 and cond3:
        return {"rule": "CAR-2", "tier_floor": "T3",
                "trigger": f"CAR%={car_pct:.1f}≤−30, COR/DHEA={cor_dhea:.1f}>10, +catabolic confirm"}
    return None


def evaluate_cir1(m1, m2, m5):
    if m1 < 5.0 and m2 < 7.5 and m5 > 1.4:
        return {"rule": "CIR-1", "tier_floor": "T2",
                "trigger": f"m1={m1:.2f}<LRL, m2={m2:.2f}<LRL, m5={m5:.2f}>URL (inverted gradient)"}
    return None


def evaluate_dopac1(dopac, da, hva):
    if dopac < 0.70 and da < 108 and hva < 1.44:
        return {"rule": "DOPAC-1", "nt_floor": 60,
                "trigger": f"DOPAC={dopac:.2f}<LRL, DA={da:.0f}<LRL, HVA={hva:.2f}<LRL (synthesis collapse)"}
    return None


def evaluate_exhaustion_complete(aucg, m1, car_pct, dhea, cor_dhea,
                                  da, nor, epi, ser, dopac1_triggered):
    hpa_exhausted = (aucg < 32) or (m1 < 5.0 and car_pct < 20)
    adrenal_depleted = (dhea < 0.53) and (cor_dhea > 10)
    cat_depleted = (da < 108) or (nor < 11.1) or (epi < 0.76) or dopac1_triggered
    mon_depleted = ser < 38
    if hpa_exhausted and adrenal_depleted and cat_depleted and mon_depleted:
        return {"rule": "EXHAUSTION_COMPLETE", "tier_floor": "T4",
                "trigger": "HPA exhausted + adrenal depleted + both NT axes depleted"}
    return None


def evaluate_preclinical_burnout(da, nor, epi, ser, mhpg, vma, hva, hiaa,
                                  car_pct, aucg, m1, m3, cor_dhea):
    nt_intact = (108 <= da <= 244) and (11.1 <= nor <= 28.0) and \
                (0.76 <= epi <= 4.23) and (38 <= ser <= 89)
    overflow_count = sum([mhpg > 1.13, vma > 2.20, hva > 3.17, hiaa > 3.3])
    cortisol_abnormal = (
        car_pct < 50 or car_pct > 120 or aucg > 113
        or (m3 < 1.9 and m1 >= 5.0) or cor_dhea > 8
    )
    if nt_intact and overflow_count >= 3 and cortisol_abnormal:
        return {"rule": "PRECLINICAL_BURNOUT", "tier_floor": "T3",
                "trigger": f"primary NTs intact, {overflow_count} catabolites > URL, cortisol abnormal"}
    return None


def evaluate_hpa_sat_sam_overflow(aucg, m3, m4, nor, epi, vma, nor_epi):
    hpa_saturated = (aucg > 113) or (m3 > 5.2 and m4 > 3.0)
    sam_overflow = (
        nor > 28.0 or epi > 4.23 or vma > 2.20
        or ((nor_epi < 3 or nor_epi > 7) and (nor > 28.0 or epi > 4.23))
    )
    if hpa_saturated and sam_overflow:
        return {"rule": "HPA_SAT_SAM_OVERFLOW", "tier_floor": "T3",
                "trigger": "sustained HPA saturation + SAM overflow"}
    return None


def evaluate_nocturnal_isolated(m1, m5, car_pct, aucg, dcs):
    other_normal = (
        50 <= car_pct <= 120
        and 32 <= aucg <= 113
        and -1.12 <= dcs <= -0.24
        and 5.0 <= m1 <= 17.1
    )
    if m5 > 1.4 and other_normal:
        return {"flag": "NOCTURNAL_HYPERCORTISOLISM_ISOLATED",
                "note": "Isolated nocturnal cortisol excess with otherwise-preserved diurnal architecture"}
    return None


def evaluate_hypo_func(aucg, dhea, exhaustion_triggered):
    if exhaustion_triggered:
        return None
    if aucg < 32 and dhea < 0.53:
        return {"rule": "HYPO_FUNC", "additive_points": 8,
                "trigger": f"AUCg={aucg:.1f}<LRL + DHEA={dhea:.2f}<LRL"}
    return None


def evaluate_da_nor_balance(hva, vma):
    if hva is None or vma is None or vma == 0:
        return None
    r = hva / vma
    if r > 2.83:
        return {"flag": "DA_CATABOLIC_DOMINANT",
                "note": f"HVA/VMA={r:.2f} > URL — dopaminergic catabolism dominance"}
    if r < 0.23:
        return {"flag": "NOR_CATABOLIC_DOMINANT",
                "note": f"HVA/VMA={r:.2f} < LRL — noradrenergic catabolism dominance"}
    return None


# --- result dataclass ---------------------------------------------------------
@dataclass
class BioStressResult:
    score_formula: float
    score_displayed_patient: float
    tier_formula: str
    tier_final: str
    # axis breakdown
    hpa_score: float
    adrenal_score: float
    nt_cat_score: float
    nt_mon_score: float
    nt_score: float
    # cortisol sub-penalties
    car_pen: float
    m3_pen: float
    aucg_pen: float
    m1_pen: float
    dcs_pen: float
    # adrenal sub-penalties
    dhea_pen: float
    cor_dhea_pen: float
    reactive_buffer: bool
    # NT sub-penalties
    da_pen: float
    nor_pen: float
    epi_pen: float
    nor_epi_pen: float
    ser_pen: float
    hiaa_ser_pen: float
    da_ser_pen: float
    # rules + flags
    applied_rules: list = field(default_factory=list)
    rule_details: list = field(default_factory=list)
    phenotype_flags: list = field(default_factory=list)
    flag_details: list = field(default_factory=list)
    # phase + insight
    suggested_phase: int = 1
    phase_rationale: str = ""
    insights: list = field(default_factory=list)


# --- master scoring -----------------------------------------------------------
def bio_stress_score(
    m1, m2, m3, m4, m5, car_pct, dcs, aucg,
    dhea, cor_dhea,
    da, nor, epi, nor_epi, dopac, hva, vma, mhpg,
    ser, hiaa, hiaa_ser, da_ser,
    creatinine_ur=None,
) -> BioStressResult:
    # cortisol sub-penalties
    car_p = car_dysr(car_pct)
    m3_p = m3_dysr(m3, m1)
    aucg_p = aucg_dysr(aucg)
    m1_p = m1_dysr(m1, car_pct)
    dcs_p = dcs_dysr(dcs, m1, m3, m4)
    C = car_p * 0.25 + m3_p * 0.20 + aucg_p * 0.20 + m1_p * 0.20 + dcs_p * 0.15

    # adrenal sub-component
    d_full = dhea_component(dhea, cor_dhea)
    D = d_full["score"]

    # NT sub-component
    da_p = nt_single(da, 108, 244, dep_severe=True)
    nor_p = nt_single(nor, 11.1, 28.0, dep_severe=False)
    epi_p = nt_single(epi, 0.76, 4.23, dep_severe=True)
    nor_epi_p = nor_epi_dysr(nor_epi)
    cat = da_p * 0.25 + nor_epi_p * 0.30 + nor_p * 0.30 + epi_p * 0.15

    ser_p = nt_single(ser, 38, 89, dep_severe=True)
    hiaa_ser_p = hiaa_ser_dysr(hiaa_ser)
    da_ser_p = da_ser_dysr(da_ser)
    mon = ser_p * 0.50 + hiaa_ser_p * 0.30 + da_ser_p * 0.20

    # DOPAC-1 component-floor
    dopac1 = evaluate_dopac1(dopac, da, hva)
    nt_subscore = cat * 0.55 + mon * 0.45
    if dopac1 is not None:
        nt_subscore = max(nt_subscore, 60)

    # composite
    score_raw = clamp(C * 0.45 + D * 0.15 + nt_subscore * 0.40)

    # tier-floor rules
    rule_details = []
    floor_results = [
        evaluate_car1(car_pct),
        evaluate_car2(car_pct, cor_dhea, dhea, aucg, da, epi, nor_epi),
        evaluate_cir1(m1, m2, m5),
        evaluate_exhaustion_complete(aucg, m1, car_pct, dhea, cor_dhea,
                                     da, nor, epi, ser,
                                     dopac1_triggered=(dopac1 is not None)),
        evaluate_preclinical_burnout(da, nor, epi, ser, mhpg, vma, hva, hiaa,
                                     car_pct, aucg, m1, m3, cor_dhea),
        evaluate_hpa_sat_sam_overflow(aucg, m3, m4, nor, epi, vma, nor_epi),
    ]
    if dopac1 is not None:
        rule_details.append(dopac1)

    tier_floor = "T1"
    exhaustion_triggered = False
    for r in floor_results:
        if r is None:
            continue
        rule_details.append(r)
        if "tier_floor" in r:
            tier_floor = tier_max(tier_floor, r["tier_floor"])
        if r["rule"] == "EXHAUSTION_COMPLETE":
            exhaustion_triggered = True

    # HYPO_FUNC additive
    hypo = evaluate_hypo_func(aucg, dhea, exhaustion_triggered)
    if hypo:
        score_raw = clamp(score_raw + hypo["additive_points"])
        rule_details.append(hypo)

    tier_form = tier_from_score(score_raw)
    tier_fin = tier_max(tier_form, tier_floor)

    # DISPLAY-1 — patient-facing tier-coherent score
    score_form = round(score_raw, 1)
    if tier_fin != tier_form:
        score_pt = float(TIER_MIN[tier_fin])
        rule_details.append({"rule": "DISPLAY-1",
                             "trigger": f"floor raised tier from {tier_form} to {tier_fin}"})
    else:
        score_pt = score_form

    # phenotype flags
    flag_details = []
    nf = evaluate_nocturnal_isolated(m1, m5, car_pct, aucg, dcs)
    if nf:
        flag_details.append(nf)
    df_ = evaluate_da_nor_balance(hva, vma)
    if df_:
        flag_details.append(df_)

    # suggested phase entry (§7 framework)
    phase, phase_reason = _suggest_phase(C, D, cat, mon, m1, car_pct, aucg,
                                         dhea, ser, da, dopac1 is not None,
                                         exhaustion_triggered)

    # plain-language insights for patient layer
    insights = _insights(m1, m2, m3, m4, m5, car_pct, aucg, dcs,
                         dhea, cor_dhea, da, nor, epi, ser, hiaa,
                         hiaa_ser, da_ser, nor_epi, rule_details, flag_details)

    return BioStressResult(
        score_formula=score_form,
        score_displayed_patient=score_pt,
        tier_formula=tier_form,
        tier_final=tier_fin,
        hpa_score=round(C, 1),
        adrenal_score=round(D, 1),
        nt_cat_score=round(cat, 1),
        nt_mon_score=round(mon, 1),
        nt_score=round(nt_subscore, 1),
        car_pen=round(car_p, 1),
        m3_pen=round(m3_p, 1),
        aucg_pen=round(aucg_p, 1),
        m1_pen=round(m1_p, 1),
        dcs_pen=round(dcs_p, 1),
        dhea_pen=round(d_full["dhea_pen"], 1),
        cor_dhea_pen=round(d_full["cor_dhea_pen"], 1),
        reactive_buffer=d_full["reactive_buffer"],
        da_pen=round(da_p, 1),
        nor_pen=round(nor_p, 1),
        epi_pen=round(epi_p, 1),
        nor_epi_pen=round(nor_epi_p, 1),
        ser_pen=round(ser_p, 1),
        hiaa_ser_pen=round(hiaa_ser_p, 1),
        da_ser_pen=round(da_ser_p, 1),
        applied_rules=[r["rule"] for r in rule_details],
        rule_details=rule_details,
        phenotype_flags=[f["flag"] for f in flag_details],
        flag_details=flag_details,
        suggested_phase=phase,
        phase_rationale=phase_reason,
        insights=insights,
    )


# --- phase-entry derivation (§7 framework) -----------------------------------
def _suggest_phase(C, D, cat, mon, m1, car_pct, aucg, dhea, ser, da,
                   dopac1, exhaustion):
    """
    Phase 1 — HPA stabilisation (foundation, must precede all else)
    Phase 2 — SER substrate restoration (must precede phase 3 if SER deficient)
    Phase 3 — DA substrate restoration
    Phase 4 — catabolism support (catechol balance)
    Phase 5 — recovery + integration
    Phase 6 — maintenance
    """
    if exhaustion:
        return 1, "EXHAUSTION_COMPLETE — extended Phase 1 (8–16 weeks) before any precursor work"
    if C >= 30 or aucg < 32 or (m1 < 5 and car_pct < 20):
        return 1, "HPA dysregulation dominates — stabilise cortisol rhythm first"
    if ser < 38:
        return 2, "SER substrate restoration needed before any DA work (BBB transporter competition)"
    if da < 108 or dopac1:
        return 3, "DA substrate restoration — SER is adequate"
    if cat > 25 or mon > 25:
        return 4, "primary NTs adequate, catabolism balance needs attention"
    if D > 20:
        return 4, "adrenal-axis recovery focus"
    if C > 15 or cat > 15:
        return 5, "consolidate gains, recovery integration"
    return 6, "stable — maintenance"


# --- plain-language insight generator ----------------------------------------
def _insights(m1, m2, m3, m4, m5, car_pct, aucg, dcs,
              dhea, cor_dhea, da, nor, epi, ser, hiaa,
              hiaa_ser, da_ser, nor_epi, rules, flags):
    """
    Patient-facing language only. Per locked rule SER-DEP-INTERPRET-01:
    peripheral SER is described as 'gut-level production insufficiency',
    never as 'low brain serotonin'.
    """
    out = []
    # cortisol rhythm
    if car_pct <= -20:
        out.append({
            "axis": "HPA",
            "severity": "high",
            "title": "Your morning cortisol surge is reversed",
            "body": "Cortisol normally rises sharply in the 30 minutes after waking. Yours falls instead — a signature of advanced HPA-axis fatigue.",
        })
    elif car_pct < 20:
        out.append({
            "axis": "HPA",
            "severity": "moderate",
            "title": "Your morning cortisol surge is muted",
            "body": "The normal post-waking cortisol rise is small. Often linked to chronic load, light exposure timing, or sleep architecture.",
        })
    elif car_pct > 120:
        out.append({
            "axis": "HPA",
            "severity": "moderate",
            "title": "Your morning cortisol surge is exaggerated",
            "body": "An oversized post-waking rise can reflect a hyper-reactive HPA axis or anticipatory stress.",
        })
    if aucg < 32:
        out.append({
            "axis": "HPA",
            "severity": "high",
            "title": "Your daily cortisol output is below the reference floor",
            "body": "Total cortisol across the day is suppressed — consistent with hypocortisolism after sustained load.",
        })
    elif aucg > 113:
        out.append({
            "axis": "HPA",
            "severity": "high",
            "title": "Your daily cortisol output is elevated",
            "body": "Sustained cortisol exposure across the day has metabolic and cardiovascular consequences if prolonged.",
        })
    if m3 < 1.9 and m1 >= 5:
        out.append({
            "axis": "HPA",
            "severity": "moderate",
            "title": "Midday cortisol drops below the working range",
            "body": "Healthy mornings followed by a midday collapse predict afternoon energy lows and burnout risk.",
        })
    # adrenal
    if dhea < 0.53:
        out.append({
            "axis": "Adrenal",
            "severity": "high",
            "title": "DHEA reserve is low",
            "body": "DHEA is the body's anabolic counter to cortisol. Low values suggest the adrenal cortex is running on empty.",
        })
    elif dhea > 2.44 and cor_dhea <= 6:
        out.append({
            "axis": "Adrenal",
            "severity": "low",
            "title": "DHEA is elevated as a buffer",
            "body": "Your DHEA is high while the cortisol-to-DHEA ratio stays balanced — a compensatory protective response, not a pathology.",
        })
    if cor_dhea > 10:
        out.append({
            "axis": "Adrenal",
            "severity": "high",
            "title": "Cortisol is dominating DHEA",
            "body": "The catabolic-to-anabolic ratio is well above the upper reference limit — characteristic of chronic allostatic load.",
        })
    # NT — peripheral framing only
    if ser < 38:
        out.append({
            "axis": "Neurotransmitter",
            "severity": "high",
            "title": "Peripheral serotonin production is reduced",
            "body": "Reflects gut-level serotonin production insufficiency, with downstream consequences for tryptophan availability for central serotonin synthesis. Not a measurement of brain serotonin.",
        })
    if da < 108:
        out.append({
            "axis": "Neurotransmitter",
            "severity": "high",
            "title": "Dopamine output is below the reference floor",
            "body": "Reduced dopamine throughput correlates with motivation, focus, and reward-seeking changes.",
        })
    if nor_epi > 7:
        out.append({
            "axis": "Neurotransmitter",
            "severity": "moderate",
            "title": "Sympathetic dominance signature",
            "body": "Noradrenaline is elevated relative to adrenaline — a chronic vigilance pattern.",
        })
    elif nor_epi < 3:
        out.append({
            "axis": "Neurotransmitter",
            "severity": "moderate",
            "title": "Adrenal-medulla-dominant pattern",
            "body": "Adrenaline is elevated relative to noradrenaline — often acute or pulsatile stress.",
        })
    # phenotype flags
    for f in flags:
        if f["flag"] == "NOCTURNAL_HYPERCORTISOLISM_ISOLATED":
            out.append({
                "axis": "HPA",
                "severity": "moderate",
                "title": "Night-time cortisol stays elevated",
                "body": "Daytime rhythm is preserved but evening/night cortisol does not fully drop. Often linked to sleep, late stimulants, or rumination.",
            })
    return out


def result_to_dict(r: BioStressResult) -> dict:
    return asdict(r)
