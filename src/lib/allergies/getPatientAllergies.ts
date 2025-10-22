'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; // Reusing utilities

// --- Core Allergy Interface ---
// Based on the OpenMRS AllergyIntolerance resource
export interface Allergy {
    uuid: string;
    patient: { uuid: string };
    allergen: { uuid: string; display: string; concept: boolean }; // The substance (e.g., Penicillin)
    reaction: { uuid: string; display: string }[]; // Specific reactions (e.g., Rash, Anaphylaxis)
    severity: 'LOW' | 'MODERATE' | 'HIGH';
    allergyType: 'DRUG' | 'FOOD' | 'ENVIRONMENTAL' | 'OTHER';
    comment: string | null;
    onsetDate: string | null;
    // status: 'ACTIVE' | 'INACTIVE' | 'RESOLVED'; // Often derived or explicitly queried
    // recordedDate: string; // The date the record was created
}

// --- Helper for Error Checking ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch allergies: HTTP ${response.status}.`);
}


/**
 * Fetches the documented allergy and adverse drug reaction (ADR) list for a specific patient.
 * * @param patientUuid The UUID of the patient.
 * @returns A promise that resolves to an array of Allergy objects.
 */
export async function getPatientAllergies(patientUuid: string): Promise<Allergy[]> {
    if (!patientUuid) {
        console.error("Patient UUID is required to fetch allergies.");
        return [];
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }

    // Fetch all documented allergies for the patient. Use v=full for detailed reaction/allergen info.
    const url = `${process.env.OPENMRS_API_URL}/allergyintolerance?patient=${patientUuid}&v=full`;

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'no-store' // Must be current for safety reasons
        });

        if (!response.ok) {
            await handleApiError(response, "getPatientAllergies");
            return [];
        }

        const data: { results: Allergy[] } = await response.json();
        
        // Filter out voided/inactive records if the API doesn't do it automatically, 
        // though v=full typically returns all unless filtered by parameters.
        const activeAllergies = data.results.filter((allergy: any) => !allergy.voided);
        
        return activeAllergies;

    } catch (error) {
        console.error('Final error in getPatientAllergies:', error);
        return [];
    }
}