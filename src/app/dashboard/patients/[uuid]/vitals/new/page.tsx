// uuid/vitals/page.tsx (VitalsNewPage)

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { getProviderUuid } from '@/lib/config/provider';
import { getConceptUuid } from '@/lib/config/concept';
import LocationDependentFormWrapper from '@/components/wrapper/LocationDependentFormWrapper';
import { getEncounterRoleUuid } from '@/lib/encounters/encounterRole';
import { getEncounterTypeUuid } from '@/lib/encounters/encounterType';
// 💡 NEW IMPORT: Import the function to get the active visit
import { getPatientActiveVisit } from '@/lib/visits/getActiveVisit'; 
import { AlertTriangle } from 'lucide-react';


interface VitalsNewPageProps {
  params: {
    patientUuid: string;
  };
}

/**
 * Server Component for creating a new vitals entry.
 * Fetches all required UUIDs AND the active visit status.
 */
export default async function VitalsNewPage({ params }: VitalsNewPageProps) {
  const { patientUuid } = params;

  // 🔹 Fetch all required data in parallel
  const [
    providerUuid, 
    encounterTypeUuid, 
    encounterRoleUuid, 
    activeVisit, // 💡 NEW: Fetch the visit status here
    weightUuid,
    heightUuid,
    tempUuid,
    systolicBpUuid,
    diastolicBpUuid,
    pulseUuid,
    respRateUuid,
  ] = await Promise.all([
    getProviderUuid(),
    getEncounterTypeUuid('Vitals'),
    getEncounterRoleUuid('Clinician'),
    getPatientActiveVisit(patientUuid), // ⬅️ Fetched on the server
    getConceptUuid('WEIGHT (KG)'),
    getConceptUuid('HEIGHT (CM)'),
    getConceptUuid('TEMPERATURE (C)'),
    getConceptUuid('SYSTOLIC BLOOD PRESSURE'),
    getConceptUuid('DIASSTOLIC BLOOD PRESSURE'),
    getConceptUuid('PULSE'),
    getConceptUuid('RESPIRATORY RATE'),
  ]);

  const conceptUuids = {
    WEIGHT: weightUuid,
    HEIGHT: heightUuid,
    TEMP: tempUuid,
    SYSTOLIC_BP: systolicBpUuid,
    DIASTOLIC_BP: diastolicBpUuid,
    PULSE: pulseUuid,
    RESP_RATE: respRateUuid,
  };
  
  // 💡 Extract the UUID or null
  const activeVisitUuid = activeVisit?.uuid || null;

  // 💡 Optional: Add server-side error handling for essential config (concept/provider UUIDs)
  if (!providerUuid || !encounterTypeUuid) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="p-8 bg-red-100 border-l-4 border-red-500 text-red-800 rounded-xl shadow-lg mt-10">
                <h2 className="text-2xl font-bold mb-3 flex items-center">
                    <AlertTriangle className="w-6 h-6 mr-2" />
                    Configuration Error
                </h2>
                <p>Missing Provider or Encounter Type configuration. Cannot render Vitals form.</p>
            </div>
        </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header (UNCHANGED) */}
      <header className="flex items-center justify-between mb-6">
        <Link
          href={`/dashboard/patients/${patientUuid}`}
          className="flex items-center text-gray-600 hover:text-gray-900 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Patient
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">Record Vitals</h1>
      </header>

      {/* 💡 PASS THE FETCHED UUID */}
      <LocationDependentFormWrapper
        patientUuid={patientUuid}
        providerUuid={providerUuid}
        encounterTypeUuid={encounterTypeUuid}
        conceptUuids={conceptUuids}
        encounterRoleUuid={encounterRoleUuid}
        activeVisitUuid={activeVisitUuid} // ⬅️ The solution!
      />
    </div>
  );
}