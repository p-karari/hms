'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
// Assuming the interface for the drug order is defined globally or here:
export interface ConceptReference {
    uuid: string;
    display: string;
}

export interface DrugOrder {
    uuid: string;
    display: string;
    action: 'NEW' | 'REVISE' | 'DISCONTINUE' | 'RENEW';
    
    // Core References
    patient: ConceptReference; // 🎯 Required for Renew payload
    orderer: { uuid: string; display: string; person: { display: string } };
    concept: ConceptReference;
    drug: { uuid: string; display: string; strength: string };

    // Timing
    dateActivated: string;
    dateStopped: string | null;

    // Dosing and Quantities (MUST be ConceptReferences for UUID access)
    dose: number;
    doseUnits: ConceptReference;       // 🎯 ADDED/CORRECTED for Renew payload
    route: ConceptReference;           // 🎯 ADDED/CORRECTED for Renew payload
    frequency: ConceptReference;       // 🎯 ADDED/CORRECTED for Renew payload
    
    duration: number;
    durationUnits: ConceptReference;   // 🎯 ADDED/CORRECTED for Renew payload
    
    quantity: number;
    quantityUnits: ConceptReference;   // 🎯 ADDED/CORRECTED for Renew payload
    
    instructions?: string;
}

// --- Helper for API Error Checking (Imitating your provided structure) ---
async function handleApiError(response: Response) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch orders data: HTTP ${response.status}.`);
}

/**
 * Fetches the patient's entire drug order history (Active and Discontinued).
 * @param patientUuid The UUID of the patient whose orders are being fetched.
 * @returns A promise that resolves to an array of DrugOrder objects.
 */
export async function getPatientMedicationOrders(patientUuid: string): Promise<DrugOrder[]> {
    if (!patientUuid) {
        console.error("Patient UUID is required to fetch medication orders.");
        return [];
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }
    
    // Confirmed working URL structure using full representation (v=full)
    const url = `${process.env.OPENMRS_API_URL}/order?t=drugorder&patient=${patientUuid}&v=full`;

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'no-store' // Critical: Medication history must always be fresh
        });

        if (!response.ok) {
            await handleApiError(response);
            return [];
        }

        // We assume the API returns enough fields to match the DrugOrder interface
        const data: { results: DrugOrder[] } = await response.json();
        
        return data.results || [];

    } catch (error) {
        console.error("Final error in getPatientMedicationOrders:", error);
        return [];
    }
}