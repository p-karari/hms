'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { ConceptReference } from './getPatientMedicationOrders';

export type DosingConceptOption = ConceptReference;

export interface DosingConceptLists {
    doseUnits: DosingConceptOption[];
    routes: DosingConceptOption[];
    frequencies: DosingConceptOption[];
    quantityUnits: DosingConceptOption[];
}

// --- Helper for API Error Checking (Matching your structure) ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch concept data for ${source}: HTTP ${response.status}.`);
}

/**
 * Executes a two-step lookup to find a Concept Set's members:
 * 1. Finds the parent Concept UUID by its display name.
 * 2. Fetches the set members (the list options) using that UUID.
 * @param conceptSetName The display name of the concept set (e.g., "Drug Dosing Units").
 * @param headers Authentication headers.
 */
async function getConceptSetMembersByName(conceptSetName: string, headers: Record<string, string>): Promise<DosingConceptOption[]> {
    const apiBaseUrl = process.env.OPENMRS_API_URL;
    const encodedName = encodeURIComponent(conceptSetName);

    // Step 1: Search for the parent Concept UUID by name
    const searchUrl = `${apiBaseUrl}/concept?q=${encodedName}&v=custom:(uuid)`;
    const searchResponse = await fetch(searchUrl, { headers, cache: 'force-cache' });

    if (!searchResponse.ok) {
        // Use separate handler to prevent aborting the entire Promise.all
        await handleApiError(searchResponse, `Search for ${conceptSetName}`);
        return [];
    }

    const searchData: { results: Array<{ uuid: string }> } = await searchResponse.json();
    const parentConcept = searchData.results.find(c => c.uuid.length > 0); // Find first non-empty result

    if (!parentConcept) {
        console.warn(`Concept Set not found for name: ${conceptSetName}`);
        return [];
    }
    
    // Step 2: Fetch the set members using the found UUID
    const fetchMembersUrl = `${apiBaseUrl}/concept/${parentConcept.uuid}?v=custom:(setMembers:(uuid,display))`;
    const membersResponse = await fetch(fetchMembersUrl, { headers, cache: 'force-cache' });

    if (!membersResponse.ok) {
        await handleApiError(membersResponse, `Fetch members for ${conceptSetName}`);
        return [];
    }

    const membersData: any = await membersResponse.json();
    
    // Map the setMembers to the required DosingConceptOption structure
    return (membersData.setMembers || []).map((item: any) => ({
        uuid: item.uuid,
        display: item.display
    }));
}


export async function getDosingConceptLists(): Promise<DosingConceptLists> {
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return { doseUnits: [], routes: [], frequencies: [], quantityUnits: [] };
    }
    
    // --- Configuration: We now use the standard display names ---
    const conceptSetsToFetch = {
        doseUnits: "Drug Dosing Units",
        routes: "Route of Administration",
        frequencies: "Dosing Frequency",
        quantityUnits: "Dispensing Units",
    };

    const conceptPromises = Object.entries(conceptSetsToFetch).map(([key, name]) => {
        return getConceptSetMembersByName(name, headers)
            .then(data => ({ key: key as keyof DosingConceptLists, data }))
            .catch(error => {
                console.error(`Final error fetching ${name}:`, error);
                return { key: key as keyof DosingConceptLists, data: [] };
            });
    });

    const results = await Promise.all(conceptPromises);

    // Reassemble the results into the final structured object
    const finalLists: DosingConceptLists = results.reduce((acc, result) => {
        acc[result.key] = result.data;
        return acc;
    }, {} as DosingConceptLists);

    return finalLists;
}