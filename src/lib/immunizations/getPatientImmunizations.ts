'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { ConceptReference } from '@/lib/medications/getPatientMedicationOrders'; // Reusing ConceptReference type

// --- Core Immunization Interface ---
// Represents a single administered dose of a vaccine.
export interface Immunization {
    uuid: string;
    // The administered vaccine (e.g., MMR, Pfizer)
    vaccineConcept: ConceptReference; 
    
    // The date the vaccine was administered
    administrationDate: string;
    
    // The specific encounter where the vaccine was recorded
    encounter: { uuid: string; display: string } | null;
    
    // The dose sequence (e.g., 1st dose, 2nd dose) - often stored as Obs or attributes
    doseSequence?: string; 
    
    // The administering provider
    provider?: { uuid: string; display: string } | null;
    
    // Optional: Location of administration
    location?: { uuid: string; display: string } | null;
}

// --- Helper for API Error Checking ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch immunizations: HTTP ${response.status}.`);
}

/**
 * Fetches the historical list of immunizations for a specific patient.
 * * NOTE: This assumes Immunization records are stored as Encounters of a specific type
 * (e.g., 'IMMUNIZATION RECORD ENCOUNTER'). You must configure your OpenMRS instance
 * to use a consistent concept/encounter type for this to work reliably.
 * * @param patientUuid The UUID of the patient.
 * @returns A promise that resolves to an array of Immunization objects.
 */
export async function getPatientImmunizations(patientUuid: string): Promise<Immunization[]> {
    if (!patientUuid) {
        console.error("Patient UUID is required to fetch immunizations.");
        return [];
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }

    // --- Configuration: Define the Immunization Encounter Type ---
    // Search by encounter type name or UUID if known. We use a name for simplicity.
    const IMMUNIZATION_ENCOUNTER_TYPE = "IMMUNIZATION RECORD"; 

    // We must fetch the Encounter Type UUID first, or just query by patient and filter later.
    // Querying by patient and using v=full to inspect contents is often simpler in OpenMRS REST API.
    
    // Query the encounter endpoint, filtering by patient.
    const url = `${process.env.OPENMRS_API_URL}/encounter?patient=${patientUuid}&v=full`; 

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'no-store' // Ensure current history
        });

        if (!response.ok) {
            await handleApiError(response, "getPatientImmunizations");
            return [];
        }

        const data: { results: any[] } = await response.json();
        
        // --- Custom Logic: Filter and Process Immunization Encounters ---
        const immunizations: Immunization[] = data.results
            .filter(enc => enc.encounterType?.display === IMMUNIZATION_ENCOUNTER_TYPE) // Filter by type
            .flatMap(enc => {
                // Now, extract the immunization details from the Obs recorded within that encounter.
                // This assumes: The OBS contains the Vaccine Concept and Dose information.
                
                // You need a concept name/UUID that represents the VACCINE ADMINISTERED observation.
                const VACCINE_ADMINISTERED_CONCEPT = "VACCINE ADMINISTERED"; 
                
                // Find all Obs that document an immunization
                const vaccineObs = enc.obs.filter((o: any) => o.concept.display === VACCINE_ADMINISTERED_CONCEPT);

                return vaccineObs.map((obs: any) => ({
                    uuid: obs.uuid, // Using OBS UUID as the record ID
                    vaccineConcept: {
                        // The value of the OBS is the administered vaccine concept (e.g., MMR)
                        uuid: obs.value.uuid, 
                        display: obs.value.display,
                    },
                    administrationDate: obs.obsDatetime,
                    encounter: { uuid: enc.uuid, display: enc.display },
                    // Extract provider from encounterProviders if available
                    provider: enc.encounterProviders?.length > 0 ? enc.encounterProviders[0].provider : null,
                    location: enc.location,
                    // Dose sequence often requires a second OBS/logic, simplified here
                    doseSequence: '1st Dose' // Placeholder
                } as Immunization));
            });
        
        return immunizations;

    } catch (error) {
        console.error('Final error in getPatientImmunizations:', error);
        return [];
    }
}