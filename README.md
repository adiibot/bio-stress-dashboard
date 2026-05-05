# Sorcova BIO_STRESS — analytics + dashboard

Precision stress medicine dashboard built on top of the Sorcova `BIO_STRESS_SCORE`
v2.9.1 methodology, applied to a 10,000-patient synthetic cohort.

## Layout

```
.
├── pipeline/                  # Python — score engine + ETL
│   ├── score_engine.py        #   canonical v2.9.1 algorithm + extensions
│   └── build.py               #   reads xlsx, scores 10k rows, writes JSON
├── web/                       # Next.js 15 + Tailwind 3 + Recharts
│   ├── app/
│   │   ├── page.tsx           #   landing — pick role
│   │   ├── doctor/            #   clinician views (cohort + deep-dive)
│   │   ├── patient/           #   patient views (tier-coherent, narrative)
│   │   └── analytics/         #   cohort analytics
│   ├── components/            #   AppShell, ScoreGauge, AxisBars, CortisolCurve …
│   ├── lib/                   #   types + server-side data loaders
│   └── public/data/           #   cohort.json + patients-index.json + 10k per-patient files
├── BIO_STRESS_SCORE_Methodology_v2_8_20260305.docx
├── Bio_Stress_Synthetic_10k.xlsx
├── Sorcova_DS_Guide_PAP_v2_0_20260308.docx
└── PLAN.md                    # full design doc — read first if resuming cold
```

## Running the dashboard

```bash
cd web
npm install
npm run dev          # http://localhost:3000
```

Pages:
- `/` — landing
- `/doctor` — clinician cohort overview + patient roster (filter by tier, sex, rule, search)
- `/doctor/<userID>` — clinician deep-dive (full transparency, every sub-penalty, all rule triggers, raw biomarker tables with reference bands)
- `/patient` — sample patients across tiers
- `/patient/<userID>` — patient self-view (tier-coherent score per DISPLAY-1, plain-language insights only)
- `/analytics` — cohort analytics (tier × age, floor-rule co-occurrence, biomarker distributions, phase distribution)

## Re-running the analytics layer

If you replace the source spreadsheet or change the score engine:

```bash
python3 -m venv .venv
.venv/bin/pip install openpyxl pandas numpy python-docx
.venv/bin/python pipeline/build.py
```

The pipeline writes:
- `web/public/data/cohort.json` — cohort aggregates (~9 KB)
- `web/public/data/patients-index.json` — slim list for the roster (~1.8 MB)
- `web/public/data/patients/<userID>.json` — full per-patient record (~5 KB × 10k)

## Methodology notes (locked)

- Master formula `C × 0.45 + D × 0.15 + N × 0.40` — locked since v1.0; do not alter.
- DISPLAY-1: clinician layer always shows formula score + applied rule IDs; patient layer shows the tier-coherent value.
- Patient-facing language for serotonin must describe *peripheral* serotonin: "gut-level production insufficiency", never "low brain serotonin" (locked rule SER-DEP-INTERPRET-01, MKB-01).
- All theory-derived rules (EXHAUSTION_COMPLETE, PRECLINICAL_BURNOUT, HPA_SAT_SAM_OVERFLOW, HYPO_FUNC) await CALMS empirical calibration and are tagged accordingly in the rationale.

## Cohort summary (after scoring)

| Tier | Count | Share |
|------|-------|-------|
| T1   | 293   | 2.9%  |
| T2   | 1,025 | 10.3% |
| T3   | 6,287 | 62.9% |
| T4   | 2,395 | 24.0% |

Most-fired floor rules: `HPA_SAT_SAM_OVERFLOW` (6,781), `CAR-1` (2,010), `CIR-1` (600), `CAR-2` (200). The synthetic cohort is intentionally weighted toward dysregulated patients to exercise every dashboard state.
