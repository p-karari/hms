'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { ConceptReference } from '@/lib/medications/getPatientMedicationOrders'; // Reusing your existing reference type

// --- Define Core Interface for a Filtered Lab Result ---
// This simplifies the complex OpenMRS Obs object for the client.
export interface LabResult {
    uuid: string;
    display: string;
    
    // Test Details
    concept: ConceptReference; // The name of the lab test (e.g., 'Hemoglobin')
    obsDatetime: string;       // Date and time the result was recorded
    
    // Value Details (can be numeric or coded/text)
    value: string | number | null;
    valueNumeric: number | null; // Easier access to the numeric value
    valueText: string | null;    // Easier access to text/coded value
    
    // Interpretation (The clinician's assessment of the value)
    interpretation: 'NORMAL' | 'ABNORMAL' | 'CRITICAL' | null; 
    
    // Source/Context
    encounterUuid: string;
}

/**
 * Fetches and filters patient observations to return only data likely representing Lab Results.
 * * @param patientUuid The UUID of the patient.
 * @returns A promise that resolves to an array of simplified LabResult objects.
 */
export async function getPatientLabResults(patientUuid: string): Promise<LabResult[]> {
    if (!patientUuid) {
        console.error("Patient UUID is required to fetch lab results.");
        return [];
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }

    // Use v=full to get necessary nested details like 'concept', 'value', and 'interpretation'.
    const url = `${process.env.OPENMRS_API_URL}/obs?patient=${patientUuid}&v=full&limit=100`; // Limit ensures performance

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'no-store' // Results must be fresh
        });

        if (!response.ok) {
            await handleApiError(response, "getPatientLabResults");
            return [];
        }

        const data: { results: any[] } = await response.json();
        
        // --- CRITICAL FILTERING LOGIC ---
        // Since /obs includes Vitals, we must filter. 
        // A simple, effective method is to filter out common VITAL SIGN concepts.
        // NOTE: These UUIDs/names must be verified in your OpenMRS dictionary.
        const VITAL_SIGN_CONCEPT_NAMES = [
            'Weight (kg)', 'Height (cm)', 'BMI', 'Pulse', 'Respiratory rate', 
            'Temperature (c)', 'Systolic blood pressure', 'Diastolic blood pressure'
        ];

        const labResults = data.results
            .filter(obs => {
                // 1. Must be a numeric or coded value (filter out notes/empty fields)
                if (obs.value === null && !obs.valueCodedName) return false;
                
                // 2. Exclude Observations that belong to common Vital Signs lists
                const conceptDisplay = obs.concept?.display || "";
                return !VITAL_SIGN_CONCEPT_NAMES.includes(conceptDisplay);
            })
            .map(obs => {
                const numericValue = typeof obs.value === 'number' ? obs.value : null;
                const textValue = typeof obs.value === 'string' ? obs.value : obs.valueCodedName || null;
                
                return {
                    uuid: obs.uuid,
                    display: obs.display, // The combined display string (e.g., 'HGB: 14.5 g/dL')
                    concept: { uuid: obs.concept.uuid, display: obs.concept.display },
                    obsDatetime: obs.obsDatetime,
                    
                    value: numericValue !== null ? numericValue : textValue,
                    valueNumeric: numericValue,
                    valueText: textValue,
                    
                    // Normalize interpretation to a standard type
                    interpretation: obs.interpretation as LabResult['interpretation'] || null, 
                    
                    encounterUuid: obs.encounter?.uuid || 'N/A',
                } as LabResult;
            });
            
        return labResults;

    } catch (error) {
        console.error("Final error in getPatientLabResults:", error);
        // Do not call redirectToLogin here, as it may be a non-auth error.
        return [];
    }
}

// Re-defining the API error helper to match the required pattern
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch observation data for ${source}: HTTP ${response.status}.`);
}