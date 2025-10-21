'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; 

// --- Reusable Reference Type (Similar to ConceptReference) ---
interface ResourceReference {
    uuid: string;
    display: string;
}

// --- Interface for an Encounter Object ---
export interface Encounter {
    uuid: string;
    display: string;
    encounterDatetime: string;
    encounterType: ResourceReference; // Using the reusable reference type here
    location: ResourceReference;
    provider: ResourceReference | null; // Primary provider
    // The v=full representation will contain these:
    obs?: any[]; 
    orders?: any[]; 
}

// --- Helper for Error Checking (Reused from previous action) ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch encounter data: HTTP ${response.status}.`);
}

/**
 * Fetches the detailed list of encounters (events/forms) associated with a single visit.
 * * @param visitUuid The UUID of the specific visit to retrieve encounters for.
 * @returns A promise that resolves to an array of Encounter objects.
 */
export async function getVisitEncounters(visitUuid: string): Promise<Encounter[]> {
    if (!visitUuid) {
        console.error("Visit UUID is required to fetch encounters.");
        return [];
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }

    // Use v=full to get detailed summaries of observations and orders within the encounter.
    const url = `${process.env.OPENMRS_API_URL}/visit/${visitUuid}/encounter?v=full`; 

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'no-store' 
        });

        if (!response.ok) {
            await handleApiError(response, `getVisitEncounters (${visitUuid})`);
            return [];
        }

        const data: { results: any[] } = await response.json();
        
        // Map the API response to the simplified Encounter interface
        const encounters: Encounter[] = data.results.map((enc: any) => ({
            uuid: enc.uuid,
            display: enc.display,
            encounterDatetime: enc.encounterDatetime,
            encounterType: enc.encounterType as ResourceReference,
            location: enc.location as ResourceReference,
            // Extract the first provider from the list of providers if available
            provider: enc.encounterProviders?.length > 0 ? enc.encounterProviders[0].provider : null,
            obs: enc.obs,
            orders: enc.orders,
        }));
        
        return encounters;

    } catch (error) {
        console.error('Final error in getVisitEncounters:', error);
        return [];
    }
}