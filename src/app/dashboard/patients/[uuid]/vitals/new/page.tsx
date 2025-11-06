import React from "react";
import VitalsForm from "@/components/vitals/VitalsForm";
import { getConceptUuid } from "@/lib/config/concept";

interface VitalsPageProps {
  params: { uuid: string };
}

/**
 * Server Component that hosts the client-side VitalsForm.
 * Fetches concept UUIDs on the server for reliability and passes them to the form.
 */
export default async function VitalsPage({ params }: VitalsPageProps) {
  const patientUuid = params.uuid;

  // Fetch all concept UUIDs for vital signs
  const conceptUuids = {
    WEIGHT: await getConceptUuid("WEIGHT (KG)"),
    HEIGHT: await getConceptUuid("HEIGHT (CM)"),
    TEMP: await getConceptUuid("TEMPERATURE (C)"),
    SYSTOLIC_BP: await getConceptUuid("SYSTOLIC BLOOD PRESSURE"),
    DIASTOLIC_BP: await getConceptUuid("DIASTOLIC BLOOD PRESSURE"),
    PULSE: await getConceptUuid("PULSE"),
    RESP_RATE: await getConceptUuid("RESPIRATORY RATE"),
  };

  return (
    <div className="max-w-3xl mx-auto">
      <VitalsForm patientUuid={patientUuid} conceptUuids={conceptUuids} />
    </div>
  );
}
