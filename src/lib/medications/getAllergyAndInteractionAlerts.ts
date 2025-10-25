'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; 

export interface AllergyAlert {
    uuid: string;
    display: string;
    patient: { uuid: string };
    allergen: {
        coded: { uuid: string; display: string };
    };
    reaction: { concept: { uuid: string; display: string } }[];
    severity: string;
}

// --- Helper for API Error Checking ---
async function handleApiError(response: Response) {
    // Known failure case: If the Allergy module isn't active, the server returns 404/400.
    if (response.status === 404 || response.status === 400) {
        console.warn(`Allergy module endpoint not found or disabled. Status: ${response.status}`);
        return []; // Return empty array gracefully
    }
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error ${response.status}: ${errorText.substring(0, 500)}`);
    throw new Error(`Failed to fetch allergy data: HTTP ${response.status}.`);
}

/**
 * Fetches the patient's recorded drug allergies and adverse drug reactions.
 * @param patientUuid The UUID of the patient.
 * @returns A promise that resolves to an array of AllergyAlert objects.
 */
export async function getAllergyAndInteractionAlerts(patientUuid: string): Promise<AllergyAlert[]> {
    if (!patientUuid) {
        console.error("Patient UUID is required to fetch allergy alerts.");
        return [];
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }
    
    // Standard endpoint for fetching allergy data
    const url = `${process.env.OPENMRS_API_URL}/allergyintolerance?patient=${patientUuid}&v=full`;

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'no-store' // Critical: Allergies must be fresh
        });

        if (!response.ok) {
            // Gracefully handle 404/400, return empty array, but re-throw others
            const failureResponse = await handleApiError(response);
            if (Array.isArray(failureResponse)) return failureResponse; // Returns [] for 404/400
        }

        const data: { results: AllergyAlert[] } = await response.json();
        
        // Interaction alerts would typically be handled by a separate clinical decision support service
        // that consumes this allergy data. For now, we return the allergies.
        return data.results || [];

    } catch (error) {
        console.error("Final error in getAllergyAndInteractionAlerts:", error);
        return [];
    }
}