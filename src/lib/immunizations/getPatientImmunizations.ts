'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
// Assuming this is the correct path for ConceptReference, but defining locally for safety
export type ConceptReference = { uuid: string; display: string; };

// --- Core Immunization Interface (Updated for FHIR data structure) ---
export interface Immunization {
    uuid: string; // FHIR resource ID (Immunization.id)
    // The administered vaccine
    vaccineConcept: ConceptReference; 
    
    // The date the vaccine was administered (Immunization.occurrenceDateTime)
    administrationDate: string;
    
    // The specific encounter/visit where the vaccine was recorded (Immunization.encounter)
    encounter: { uuid: string } | null;
    
    // The dose sequence (Immunization.protocolApplied[0].doseNumberPositiveInt)
    doseSequence: number | null; 
    
    // The administering provider (Immunization.performer[0].actor)
    provider: { uuid: string; display: string } | null;
    
    // Optional: Location of administration (Immunization.location)
    location: { uuid: string; display: string } | null;
    
    // Additional fields from the FHIR payload
    lotNumber?: string;
    manufacturerDisplay?: string;
    expirationDate?: string;
}

// --- API Configuration ---
const FHIR_IMMUNIZATION_URL = `${process.env.OPENMRS_API_URL_ALT}/Immunization`;

// --- Helper for API Error Checking ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    // Log up to 100 characters of the error text
    console.error(`API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch immunizations: HTTP ${response.status}.`);
}

/**
 * Fetches the historical list of immunizations for a specific patient.
 * Uses the confirmed **FHIR R4 API** (`/ws/fhir2/R4/Immunization`).
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
    
    // Use FHIR R4 GET endpoint as demonstrated in the context
    const fetchUrl = `${FHIR_IMMUNIZATION_URL}?patient=${patientUuid}&_count=100&_summary=data`;

    try {
        const response = await fetch(fetchUrl, { headers, cache: 'no-store' });

        if (!response.ok) {
            await handleApiError(response, `getPatientImmunizations for Patient ${patientUuid}`);
            return [];
        }

        const fhirBundle: any = await response.json();
        
        const immunizations: Immunization[] = (fhirBundle.entry || [])
            .map((entry: any) => entry.resource)
            .filter((resource: any) => resource?.resourceType === 'Immunization' && resource.status === 'completed')
            .map((r: any) => {
                // Determine the primary coding for the vaccine
                const primaryCoding = r.vaccineCode?.coding?.[0] || {};
                
                // Extract performer (provider)
                const performer = r.performer?.[0]?.actor;
                
                // Extract location
                const location = r.location;
                
                return {
                    uuid: r.id, // FHIR Immunization ID
                    vaccineConcept: {
                        uuid: primaryCoding.code || 'unknown', // Use the Concept UUID/code
                        display: primaryCoding.display || r.vaccineCode?.text || 'Unknown Vaccine',
                    },
                    administrationDate: r.occurrenceDateTime || 'Unknown Date', // FHIR date field
                    
                    // Convert FHIR reference (e.g., "Encounter/UUID") to a simple object
                    encounter: r.encounter?.reference ? { uuid: r.encounter.reference.split('/')[1] } : null,
                    location: location?.reference ? { 
                        uuid: location.reference.split('/')[1], 
                        display: location.display || 'Unknown Location' 
                    } : null,
                    
                    doseSequence: r.protocolApplied?.[0]?.doseNumberPositiveInt || null,
                    
                    provider: performer ? { 
                        uuid: performer.reference?.split('/')[1] || 'unknown', 
                        display: performer.display || 'Unknown Provider' 
                    } : null,
                    
                    lotNumber: r.lotNumber,
                    manufacturerDisplay: r.manufacturer?.display,
                    expirationDate: r.expirationDate,
                };
            });
            
        return immunizations;

    } catch (error) {
        console.error('Final error in getPatientImmunizations:', error);
        return [];
    }
}