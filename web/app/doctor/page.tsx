import { CohortMain } from "@/components/clinician/CohortMain";
import { getCohort } from "@/lib/data";

export default async function DoctorDashboard() {
  const cohort = await getCohort();
  return <CohortMain cohort={cohort} />;
}
