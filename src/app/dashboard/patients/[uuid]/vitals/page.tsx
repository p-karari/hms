import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Assuming these config actions exist in your project structure
import { getConceptUuid } from '@/lib/config/concept';
import { getProviderUuid } from '@/lib/config/provider';
// import { getEncounterRoleUuid } from '@/lib/config/encounterRole'; // 🎯 NEW IMPORT for the role UUID
import { getEncounterTypeUuid } from '@/lib/encounters/encounterType';

// This will be our new client component containing the form and logic
import LocationDependentFormWrapper from '@/components/wrapper/LocationDependentFormWrapper'; 
import { getEncounterRoleUuid } from '@/lib/encounters/encounterRole';

interface VitalsPageProps {
  params: {
    uuid: string;
  };
}

export default async function VitalsPage({ params }: VitalsPageProps) {
  // Await params.uuid to resolve the Next.js warning/error.
  const patientUuid = await params.uuid;

  if (!patientUuid) {
    redirect('/dashboard/patients');
  }

  try {
    // 1. Concurrently fetch ALL required configuration UUIDs on the server.
    const [
      providerUuid,
      encounterTypeUuid,
      encounterRoleUuid, // 🎯 NEW: Variable to hold the role UUID
      
      // Verified OpenMRS Concept Names:
      conceptWeightUuid,
      conceptHeightUuid,
      conceptTempUuid,
      conceptSystolicUuid,
      conceptDiastolicUuid,
      conceptPulseUuid,
      conceptRespRateUuid,
    ] = await Promise.all([
      getProviderUuid('admin'),
      getEncounterTypeUuid('Vitals'),
      getEncounterRoleUuid('Clinician'), // 🎯 FETCH: Fetch the role UUID. Use 'Clinician' as a common default.
      getConceptUuid('Weight (kg)'), 
      getConceptUuid('Height (cm)'), 
      getConceptUuid('Temparature (c)'),
      getConceptUuid('Systolic blood pressure'),
      getConceptUuid('Diastolic blood pressure'),
      getConceptUuid('Pulse'),
      getConceptUuid('Respiratory rate'),
    ]);

    // Consolidate concepts into a map to pass cleanly
    const conceptUuids = {
      WEIGHT: conceptWeightUuid,
      HEIGHT: conceptHeightUuid,
      TEMP: conceptTempUuid,
      SYSTOLIC_BP: conceptSystolicUuid,
      DIASTOLIC_BP: conceptDiastolicUuid,
      PULSE: conceptPulseUuid,
      RESP_RATE: conceptRespRateUuid,
    };

    // 2. Render the client wrapper component, passing down the server-fetched UUIDs.
    return (
      <div className="min-h-screen bg-gray-50 text-black">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <Link 
                href={`/dashboard/patients/${patientUuid}`}
                className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition duration-150 mb-6 font-medium"
            >
                <ArrowLeft className="w-5 h-5 mr-1" />
                Back to Patient Chart
            </Link>

            <h1 className="text-4xl font-extrabold text-gray-900 mb-6">Record Vitals</h1>
            
            <div className="flex justify-center">
                <LocationDependentFormWrapper
                    patientUuid={patientUuid}
                    providerUuid={providerUuid}
                    encounterTypeUuid={encounterTypeUuid}
                    conceptUuids={conceptUuids}
                    encounterRoleUuid={encounterRoleUuid} // 🎯 NEW PROP: Pass the fetched Encounter Role UUID
                />
            </div>
        </div>
      </div>
    );
  } catch (error: unknown) {
    console.error("Critical Configuration Error:", error);
    let errorMessage: string;
    
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    } else {
        errorMessage = "An unrecoverable error of unknown type occurred.";
    }
    return (
      <div className="p-8 max-w-xl mx-auto bg-red-100 border border-red-400 rounded-xl shadow-lg mt-10">
        <h2 className="text-2xl font-bold text-red-700 mb-3">System Configuration Error</h2>
        <p className="text-red-600">
          We could not load the necessary configuration for this encounter (e.g., missing Concept, Encounter Type, or **Encounter Role**). 
          Please contact an administrator.
        </p>
        <p className="mt-2 text-sm text-red-500">Detail: {errorMessage}</p>
        <div className="mt-4">
            <Link href={`/dashboard/patients/${patientUuid}`} className="text-blue-600 hover:underline">
                Go back to Patient Chart
            </Link>
        </div>
      </div>
    );
  }
}