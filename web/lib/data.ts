import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  CohortAggregate,
  PatientIndexEntry,
  PatientRecord,
} from "./types";

const ROOT = path.join(process.cwd(), "public", "data");

let _cohort: CohortAggregate | null = null;
let _index: PatientIndexEntry[] | null = null;

export async function getCohort(): Promise<CohortAggregate> {
  if (_cohort) return _cohort;
  const raw = await fs.readFile(path.join(ROOT, "cohort.json"), "utf-8");
  _cohort = JSON.parse(raw);
  return _cohort!;
}

export async function getIndex(): Promise<PatientIndexEntry[]> {
  if (_index) return _index;
  const raw = await fs.readFile(path.join(ROOT, "patients-index.json"), "utf-8");
  _index = JSON.parse(raw);
  return _index!;
}

export async function getEmbeddingSample() {
  const c = await getCohort();
  return c.embedding;
}

export async function getPatient(id: string): Promise<PatientRecord | null> {
  try {
    const raw = await fs.readFile(path.join(ROOT, "patients", `${id}.json`), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
