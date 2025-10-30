import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// --- CONFIGURATION IMPORTS ---
import { getConceptUuid } from '@/lib/config/concept';
import { getProviderUuid } from '@/lib/config/provider'; 
import { getEncounterTypeUuid } from '@/lib/encounters/encounterType';
import { getEncounterRoleUuid } from '@/lib/encounters/encounterRole';

// 🎯 The Client Component Wrapper that will handle Location and Active Visit
// We assume this component includes your VitalsFormFields and handles location fetching.
import LocationDependentFormWrapper from '@/components/wrapper/LocationDependentFormWrapper'; 
// NOTE: If you don't use a wrapper, this import would be VitalsFormFields.

// --- TYPE DEFINITIONS ---
interface VitalsPageProps {
    params: {
        uuid: string;
    };
}

// --- MAIN SERVER COMPONENT ---
export default async function NewVitalsPage({ params }: VitalsPageProps) {
    // Resolve the patient UUID from params
    const patientUuid = params.uuid;

    if (!patientUuid) {
        redirect('/dashboard/patients');
    }

    try {
        // 1. Concurrently fetch ALL required non-dynamic configuration UUIDs on the server.
        const [
            providerUuid,
            encounterTypeUuid,
            encounterRoleUuid,
            
            // Core Vitals and Biometric Concepts
            conceptWeightUuid,
            conceptHeightUuid,
            conceptTempUuid,
            conceptSystolicUuid,
            conceptDiastolicUuid,
            conceptPulseUuid,
            conceptRespRateUuid,
        ] = await Promise.all([
            // Use 'admin' as a placeholder for the currently logged-in provider
            getProviderUuid('admin'), 
            getEncounterTypeUuid('Vitals'),
            getEncounterRoleUuid('Clinician'),
            
            // Verified OpenMRS Concept Names:
            getConceptUuid('Weight (kg)'), 
            getConceptUuid('Height (cm)'), 
            getConceptUuid('Temparature (c)'),
            getConceptUuid('Systolic blood pressure'),
            getConceptUuid('Diastolic blood pressure'),
            getConceptUuid('Pulse'),
            getConceptUuid('Respiratory rate'),
        ]);

        // Consolidate concepts into a map to pass cleanly (matching your form interface)
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
        // The LocationDependentFormWrapper is responsible for fetching the active location (locationUuid)
        // and the active visit (activeVisitUuid) based on the patientUuid and rendering VitalsFormFields.
        return (
            <div className="min-h-screen bg-gray-50 text-black">
                <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                    {/* Back Link */}
                    <Link 
                        href={`/dashboard/patients/${patientUuid}/vitals`}
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 transition duration-150 mb-6 font-medium"
                    >
                        <ArrowLeft className="w-5 h-5 mr-1" />
                        Back to Vitals History
                    </Link>

                    <h1 className="text-4xl font-extrabold text-gray-900 mb-6">Record Vitals & Biometrics</h1>
                    
                    <div className="flex justify-center">
                        <LocationDependentFormWrapper
                            // Core Identifiers
                            patientUuid={patientUuid}
                            
                            // Server-Fetched Configuration
                            providerUuid={providerUuid}
                            encounterTypeUuid={encounterTypeUuid}
                            encounterRoleUuid={encounterRoleUuid} 
                            conceptUuids={conceptUuids}
                            
                            // 💡 The wrapper handles fetching locationUuid and activeVisitUuid internally.
                        />
                    </div>
                </div>
            </div>
        );
    } catch (error: unknown) {
        // --- Error Handling ---
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
                <h2 className="text-2xl font-bold text-red-700 mb-3">System Configuration Error 🛑</h2>
                <p className="text-red-600">
                    We could not load the necessary core configuration for this encounter (e.g., missing Concept, Encounter Type, or Provider Role). 
                    Please ensure the OpenMRS configuration is correct.
                </p>
                <p className="mt-2 text-sm text-red-500">Detail: {errorMessage}</p>
                <div className="mt-4">
                    <Link href={`/dashboard/patients/${patientUuid}`} className="text-blue-600 hover:underline font-medium">
                        Go back to Patient Chart
                    </Link>
                </div>
            </div>
        );
    }
}