export type Tier = "T1" | "T2" | "T3" | "T4";

export type Sex = "M" | "F" | null;

export interface RuleDetail {
  rule: string;
  trigger?: string;
  tier_floor?: Tier;
  nt_floor?: number;
  additive_points?: number;
}

export interface FlagDetail {
  flag: string;
  note: string;
}

export interface Insight {
  axis: "HPA" | "Adrenal" | "Neurotransmitter";
  severity: "low" | "moderate" | "high";
  title: string;
  body: string;
}

export interface ScoreResult {
  score_formula: number;
  score_displayed_patient: number;
  tier_formula: Tier;
  tier_final: Tier;
  hpa_score: number;
  adrenal_score: number;
  nt_cat_score: number;
  nt_mon_score: number;
  nt_score: number;
  car_pen: number;
  m3_pen: number;
  aucg_pen: number;
  m1_pen: number;
  dcs_pen: number;
  dhea_pen: number;
  cor_dhea_pen: number;
  reactive_buffer: boolean;
  da_pen: number;
  nor_pen: number;
  epi_pen: number;
  nor_epi_pen: number;
  ser_pen: number;
  hiaa_ser_pen: number;
  da_ser_pen: number;
  applied_rules: string[];
  rule_details: RuleDetail[];
  phenotype_flags: string[];
  flag_details: FlagDetail[];
  suggested_phase: number;
  phase_rationale: string;
  insights: Insight[];
}

export type BiomarkerKey =
  | "m1" | "m2" | "m3" | "m4" | "m5"
  | "car_pct" | "aucg" | "dcs"
  | "dhea" | "cor_dhea"
  | "da" | "dopac" | "hva" | "nor" | "epi" | "vma" | "mhpg"
  | "nor_epi" | "hva_vma"
  | "ser" | "hiaa" | "hiaa_ser" | "da_ser"
  | "creatinine";

export type Phenotype =
  | "Healthy"
  | "AcuteStress"
  | "EarlyBurnout"
  | "Burnout"
  | "Exhaustion"
  | "AdrenalFatigue"
  | "SympatheticDominance";

export type Trajectory = "stable" | "recovery" | "decline";

export interface VisitPoint {
  visit: number;
  days: number;
  month: number;
  date: string | null;
  score: number;
  tier: Tier;
  hpa: number;
  adrenal: number;
  nt: number;
}

export interface LatestVisit {
  visit_num: number;
  days: number;
  date: string | null;
  biomarkers: Record<BiomarkerKey, number | null>;
  result: ScoreResult;
}

export interface Pattern {
  id: string;
  name: string;
  tone: "positive" | "neutral" | "warning";
  summary: string;
  evidence: string[];
  rationale?: string;
}

export interface Neighbor {
  id: string;
  similarity: number;
  score: number;
  tier: Tier;
  phenotype: Phenotype | null;
  trajectory: Trajectory | null;
  sex: Sex;
  age: number | null;
}

export interface Embedding {
  x: number;
  y: number;
}

export interface PatientRecord {
  id: string;
  lab_id: string | null;
  sex: Sex;
  age: number | null;
  dob: string | null;
  phenotype_baseline: Phenotype | null;
  phenotype_target: Phenotype | null;
  trajectory: Trajectory | null;
  trajectory_strength: number | null;
  enrollment_date: string | null;
  n_visits_attended: number;
  n_visits_with_data: number;
  visit_span_days: number;
  latest_visit: LatestVisit;
  trajectory_data: VisitPoint[];
  percentiles: Partial<Record<BiomarkerKey, number>>;
  score_percentile: number | null;
  patterns: Pattern[];
  neighbors: Neighbor[];
  embedding: Embedding;
  expected_tier: Tier | null;
}

export interface PatientIndexEntry {
  id: string;
  sex: Sex;
  age: number | null;
  score: number;
  score_patient: number;
  tier: Tier;
  phase: number;
  rules: string[];
  flags: string[];
  hpa: number;
  adrenal: number;
  nt: number;
  phenotype: Phenotype | null;
  phenotype_target: Phenotype | null;
  trajectory: Trajectory | null;
  n_visits: number;
  delta: number;
}

export interface BiomarkerSummary {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p5: number;
  p25: number;
  p75: number;
  p95: number;
  lrl: number | null;
  url: number | null;
  below_lrl: number | null;
  above_url: number | null;
  in_range: number | null;
}

export interface CohortAggregate {
  total_patients: number;
  total_visits: number;
  scored_visits: number;
  invalid_visits: number;
  tier_counts: Record<Tier, number>;
  sex_counts: Record<string, number>;
  tier_x_sex: Record<Tier, Record<string, number>>;
  tier_x_age: Record<Tier, Record<string, number>>;
  score_histogram: Record<string, number>;
  rule_prevalence: Record<string, number>;
  flag_prevalence: Record<string, number>;
  rule_co_occurrence: Record<string, number>;
  biomarker_summary: Record<BiomarkerKey, BiomarkerSummary>;
  phase_counts: Record<string, number>;
  phenotype_counts: Record<string, number>;
  trajectory_counts: Record<string, number>;
  phenotype_x_tier: Record<string, Record<Tier, number>>;
  trajectory_x_tier: Record<string, Record<Tier, number>>;
  trajectory_curves: Record<string, { month: number; score: number; n: number }[]>;
  pattern_prevalence: Record<string, number>;
  axis_tone_counts: {
    hpa: Record<AxisTone, number>;
    adrenal: Record<AxisTone, number>;
    nt: Record<AxisTone, number>;
  };
  agreement: {
    expected_tier: Record<string, number>;
    matrix: Record<string, Record<Tier, number>>;
    strict_match: number;
    within_one: number;
    total_with_pheno: number;
    stable_strict_match: number;
    stable_total: number;
  };
  embedding: {
    pc1_pct: number;
    pc2_pct: number;
    sample: {
      id: string;
      x: number;
      y: number;
      phenotype: Phenotype | null;
      tier: Tier;
      trajectory: Trajectory | null;
      score: number;
    }[];
  };
  score_stats: { mean: number; median: number; p25: number; p75: number };
  age_stats: { mean: number; median: number; min: number; max: number } | null;
}

export const TIER_COLOR: Record<Tier, string> = {
  T1: "#10b981",
  T2: "#f59e0b",
  T3: "#f97316",
  T4: "#e11d48",
};

export const TIER_LABEL: Record<Tier, string> = {
  T1: "Tier 1 — mild dysregulation",
  T2: "Tier 2 — compensated",
  T3: "Tier 3 — multi-system",
  T4: "Tier 4 — critical",
};

export const TIER_DESCRIPTION: Record<Tier, string> = {
  T1: "Single system, mild dysregulation. Monitoring + lifestyle protocol.",
  T2: "1–2 systems impaired, compensation present. Structured intervention. Clinician review within 2 weeks.",
  T3: "Multi-system dysregulation, decompensating. Priority clinical management within 72h.",
  T4: "Critical allostatic overload. Urgent clinical assessment. Same/next-day clinician contact.",
};

export const PHENOTYPE_COLOR: Record<Phenotype, string> = {
  Healthy: "#10b981",
  AcuteStress: "#f59e0b",
  EarlyBurnout: "#fb923c",
  Burnout: "#f97316",
  Exhaustion: "#dc2626",
  AdrenalFatigue: "#9f1239",
  SympatheticDominance: "#a855f7",
};

export const PHENOTYPE_DESCRIPTION: Record<Phenotype, string> = {
  Healthy: "NR-centered, balanced HPA + SAM",
  AcuteStress: "High m1, exaggerated CAR, elevated catecholamines, DHEA preserved",
  EarlyBurnout: "High m1, blunted CAR, elevated evening cortisol, DHEA preserved",
  Burnout: "Lower m1, flat CAR, diurnal flattening, DHEA dropping, COR/DHEA elevated",
  Exhaustion: "Low m1 across all timepoints, flat curve, low DHEA, SAM exhaustion",
  AdrenalFatigue: "Very low m1, inverted CAR, very low DHEA, very low catecholamines",
  SympatheticDominance: "HPA preserved, NOR very high, NOR/EPI elevated, MHPG elevated",
};

export const TRAJECTORY_LABEL: Record<Trajectory, string> = {
  stable: "Stable",
  recovery: "Recovering",
  decline: "Declining",
};

export const TRAJECTORY_COLOR: Record<Trajectory, string> = {
  stable: "#71717a",
  recovery: "#10b981",
  decline: "#e11d48",
};

// Per-axis severity tone — used wherever an axis raw score (0–100) is rendered.
// Aligned with composite tier breakpoints (15 / 26 / 33) for visual consistency
// across composite vs axis. Naming uses tone words rather than T1–T4 because
// axis scores have different clinical meaning than the composite tier.
export type AxisTone = "calm" | "stirring" | "loud" | "exhausted";

export const AXIS_TONE_COLOR: Record<AxisTone, string> = {
  calm: "#10b981",
  stirring: "#f59e0b",
  loud: "#f97316",
  exhausted: "#e11d48",
};

export function axisTone(value: number): AxisTone {
  if (value < 16) return "calm";
  if (value < 26) return "stirring";
  if (value < 33) return "loud";
  return "exhausted";
}

export const AXIS_TONE_VERB: Record<AxisTone, string> = {
  calm: "balanced",
  stirring: "under load",
  loud: "strained",
  exhausted: "exhausted",
};

export const PHASE_LABEL: Record<number, string> = {
  1: "Phase 1 — HPA stabilisation",
  2: "Phase 2 — Serotonin substrate",
  3: "Phase 3 — Dopamine substrate",
  4: "Phase 4 — Catabolism balance",
  5: "Phase 5 — Recovery integration",
  6: "Phase 6 — Maintenance",
};
