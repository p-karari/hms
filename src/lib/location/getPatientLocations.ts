'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; 

// --- Core Location Interface ---
export interface PatientLocation {
    uuid: string;
    display: string;
    name: string;
    // You might include attributes like tags if filtering by clinic/site is necessary
}

// --- Helper for API Error Checking ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch location data: HTTP ${response.status}.`);
}

/**
 * Fetches a list of locations where the patient can be treated or where services 
 * are administered (e.g., all clinics, wards). 
 * * NOTE: For simplicity, this action fetches all active locations from the OpenMRS API.
 * In a complex system, this would be filtered by the user's assigned locations or patient service area.
 * * @param patientUuid The UUID of the patient (not strictly used for location fetching, but kept for context).
 * @returns A promise that resolves to an array of PatientLocation objects.
 */
export async function getPatientLocations(patientUuid: string): Promise<PatientLocation[]> {
    // We don't need the patientUuid to query the locations endpoint, but it provides context.
    console.log(patientUuid)
    
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }

    // Query the location endpoint to get all active locations
    const url = `${process.env.OPENMRS_API_URL}/location?v=custom:(uuid,display,name)`;

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'force-cache' // Locations change infrequently, so caching is acceptable
        });

        if (!response.ok) {
            await handleApiError(response, "getPatientLocations");
            return [];
        }

        const data: { results: PatientLocation[] } = await response.json();
        
        // Filter out retired/voided locations
        const activeLocations = data.results.filter((loc: any) => !loc.retired);
        
        return activeLocations;

    } catch (error) {
        console.error('Final error in getPatientLocations:', error);
        return [];
    }
}