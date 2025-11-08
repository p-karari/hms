'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; 

// --- Reusable Reference Type ---
interface ResourceReference {
    uuid: string;
    display: string;
}

// --- Interface for an Encounter Object (Reflects the data available in the custom view) ---
export interface Encounter {
    uuid: string;
    display: string;
    encounterDatetime: string;
    encounterType: ResourceReference;
    // Location can be null in the API response payload
    location: ResourceReference | null; 
    // Provider must be mapped from the nested encounterProviders array
    provider: ResourceReference | null; 
    
    // NOTE: In this specific custom query, the following are NOT guaranteed to be fully populated.
    // They would require a v=full representation. We keep them here for compatibility 
    // but the data will likely be missing unless the API default representation includes them.
    obs?: any[]; 
    orders?: any[]; 
    diagnoses?: any[]; 
}

// --- Interface for a Visit Object (The top-level resource returned by the API) ---
export interface VisitWithEncounters {
    uuid: string;
    visitType: ResourceReference;
    startDatetime: string;
    stopDatetime: string | null;
    location: ResourceReference;
    encounters: Encounter[];
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
 * Fetches the complete list of patient visits and nests the basic encounter details 
 * directly inside each visit object, using the most efficient custom query.
 * * @param patientUuid The UUID of the patient whose history to retrieve.
 * @returns A promise that resolves to an array of VisitWithEncounters objects.
 */
export async function getPatientVisitsWithEncounters(patientUuid: string): Promise<VisitWithEncounters[]> {
    if (!patientUuid) {
        console.warn("Patient UUID is required to fetch visit history.");
        return [];
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch (e) {
        console.error("Could not retrieve auth headers:", e);
        redirectToLogin();
        return [];
    }
    
    // NOTE: This custom representation uses the exact fields from your example URL.
    // The addition of 'stopDatetime' is assumed for the UI to calculate duration/status.
    const customRep = 'v=custom:(uuid,visitType:(display),startDatetime,stopDatetime,location:(display),encounters:(uuid,display,encounterDatetime,encounterType:(display),location:(display),encounterProviders:(uuid,provider:(display))))&includeInactive=false';
    const url = `${process.env.OPENMRS_API_URL}/visit?patient=${patientUuid}&${customRep}`;

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'no-store' // Do not cache dynamic patient data
        });

        if (!response.ok) {
            await handleApiError(response, `getPatientVisitsWithEncounters (${patientUuid})`);
            return [];
        }

        const data: { results: any[] } = await response.json();
        
        // Map the API response (array of visits)
        const visits: VisitWithEncounters[] = data.results.map((visit: any) => ({
            uuid: visit.uuid,
            visitType: visit.visitType as ResourceReference,
            startDatetime: visit.startDatetime,
            stopDatetime: visit.stopDatetime,
            location: visit.location as ResourceReference,
            
            // Map the nested encounters
            encounters: visit.encounters.map((enc: any): Encounter => {
                
                // Extract the provider from the array of encounterProviders
                const primaryProvider = enc.encounterProviders?.find((ep: any) => ep.primary);
                const providerRef = primaryProvider 
                    ? primaryProvider.provider 
                    : (enc.encounterProviders?.length > 0 ? enc.encounterProviders[0].provider : null);

                const mappedProvider: ResourceReference | null = providerRef
                    ? { uuid: providerRef.uuid, display: providerRef.display } 
                    : null;

                return {
                    uuid: enc.uuid,
                    display: enc.display, 
                    encounterDatetime: enc.encounterDatetime,
                    encounterType: enc.encounterType as ResourceReference,
                    location: enc.location as ResourceReference,
                    provider: mappedProvider,
                    // obs, orders, diagnoses will be undefined or empty arrays with this custom query
                    obs: [], 
                    orders: [], 
                    diagnoses: [], 
                };
            }),
        }));
        
        return visits;

    } catch (error) {
        console.error('Final error in getPatientVisitsWithEncounters:', error);
        return [];
    }
}