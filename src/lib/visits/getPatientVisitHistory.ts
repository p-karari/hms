'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; // Assuming shared location for auth utilities

// --- Core Visit Interface ---
export interface Visit {
    uuid: string;
    patient: { uuid: string; display: string };
    visitType: { uuid: string; display: string };
    location: { uuid: string; display: string };
    startDatetime: string;
    stopDatetime: string | null;
    encounters?: { uuid: string; display: string }[]; // Full v=full may include this summary
    // Add any other crucial fields needed for display, like 'indicators' or 'attributes'
}

// --- Helper for Error Checking ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch visit history: HTTP ${response.status}.`);
}


/**
 * Fetches the complete visit history (active and past) for a specific patient.
 * The results are typically sorted by start date descending by the API.
 * * @param patientUuid The UUID of the patient.
 * @returns A promise that resolves to an array of Visit objects.
 */
export async function getPatientVisitHistory(patientUuid: string): Promise<Visit[]> {
    if (!patientUuid) {
        console.error("Patient UUID is required to fetch visit history.");
        return [];
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }

    // Fetch all visits (including inactive) for the patient
    // Use v=full to get essential nested details like location and visit type.
    const url = `${process.env.OPENMRS_API_URL}/visit?patient=${patientUuid}&includeInactive=true&v=full`;

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'no-store' // Ensure we get the absolute latest history
        });

        if (!response.ok) {
            await handleApiError(response, "getPatientVisitHistory");
            return [];
        }

        const data: { results: Visit[] } = await response.json();
        
        // Ensure the results are an array, defensively
        return Array.isArray(data.results) ? data.results : [];

    } catch (error) {
        // Catch network errors, JSON parsing errors, and re-thrown errors from handleApiError
        console.error('Final error in getPatientVisitHistory:', error);
        return [];
    }
}