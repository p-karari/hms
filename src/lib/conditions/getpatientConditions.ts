'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; // Reusing utilities
import { ConceptReference } from '@/lib/medications/getPatientMedicationOrders'; // Reusing ConceptReference type

// --- Core Condition Interface (Based on OpenMRS Condition resource) ---
export interface Condition {
    uuid: string;
    patient: { uuid: string };
    
    // The concept representing the diagnosis (e.g., Asthma, Diabetes)
    condition: ConceptReference; 
    
    // Status of the problem: ACTIVE, INACTIVE, RESOLVED (OpenMRS standard)
    clinicalStatus: 'ACTIVE' | 'INACTIVE' | 'RESOLVED' | string;
    
    // How the status was documented (e.g., HISTORY, RULE_OUT, CONFIRMED)
    verificationStatus: 'CONFIRMED' | 'UNCONFIRMED' | 'PROVISIONAL' | string; 
    
    // Optional: Date the condition was first observed or diagnosed
    onsetDate: string | null; 
    
    // Optional: Date the condition resolved (if clinicalStatus is RESOLVED)
    endDate: string | null; 
    
    // The encounter or provider that documented the condition
    encounter: { uuid: string } | null; 
    
    // recordedDate: string; // The date the condition record was created
}

// --- Helper for API Error Checking ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch patient conditions: HTTP ${response.status}.`);
}


/**
 * Fetches the complete list of clinical conditions/problems (active and resolved) for a specific patient.
 * * NOTE: OpenMRS uses the '/condition' endpoint for the Problem List.
 * * @param patientUuid The UUID of the patient.
 * @returns A promise that resolves to an array of Condition objects.
 */
export async function getPatientConditions(patientUuid: string): Promise<Condition[]> {
    if (!patientUuid) {
        console.error("Patient UUID is required to fetch conditions.");
        return [];
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }

    // Fetch all conditions for the patient. Use v=full for detailed status and dates.
    const url = `${process.env.OPENMRS_API_URL}/condition?patient=${patientUuid}&v=full`;

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'no-store' // Critical for up-to-date problem list
        });

        if (!response.ok) {
            await handleApiError(response, "getPatientConditions");
            return [];
        }

        const data: { results: Condition[] } = await response.json();
        
        // Filter out voided records defensively
        const activeRecords = data.results.filter((condition: any) => !condition.voided);
        
        return activeRecords;

    } catch (error) {
        console.error('Final error in getPatientConditions:', error);
        return [];
    }
}