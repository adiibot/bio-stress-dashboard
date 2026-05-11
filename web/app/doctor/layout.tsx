import { Suspense } from "react";
import { ClinicianTopBar } from "@/components/clinician/ClinicianTopBar";
import { CompareBar } from "@/components/clinician/CompareBar";
import { RosterSidebar } from "@/components/clinician/RosterSidebar";
import { getCohort, getIndex } from "@/lib/data";

export default async function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cohort = await getCohort();
  const index = await getIndex();
  const phenotypes = Object.keys(cohort.phenotype_counts);
  const rules = Object.keys(cohort.rule_prevalence).filter((r) => r !== "DISPLAY-1");

  return (
    <div className="min-h-screen bg-[#fbfbfd]">
      <ClinicianTopBar
        total={cohort.total_patients}
        scored={cohort.scored_visits}
      />
      <div className="grid grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
        <Suspense fallback={null}>
          <RosterSidebar
            patients={index}
            phenotypes={phenotypes}
            rules={rules}
          />
        </Suspense>
        <div className="min-w-0">{children}</div>
      </div>
      <CompareBar />
    </div>
  );
}
