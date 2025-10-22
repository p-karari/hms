'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { ConceptReference } from '@/lib/medications/getPatientMedicationOrders'; // Reusing your existing reference type

// Type definition for the allergenic concept options
export type AllergenConceptOption = ConceptReference;

export interface AllergenConceptLists {
    drugs: AllergenConceptOption[];
    foods: AllergenConceptOption[];
    environmental: AllergenConceptOption[];
}

// --- Helper for API Error Checking ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch allergen concept data for ${source}: HTTP ${response.status}.`);
}

/**
 * Fetches lists of concepts representing known allergens (Drugs, Foods, Environmental) 
 * for use in the New Allergy documentation form.
 *
 * NOTE: This relies on specific OpenMRS Concept Sets being configured.
 * @returns A structured object containing lists of allergenic concepts.
 */
export async function getAllergyConceptOptions(): Promise<AllergenConceptLists> {
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return { drugs: [], foods: [], environmental: [] };
    }
    
    // --- Configuration: Define the names of the concept sets to fetch ---
    // These names must match the display names or UUIDs of your Concept Sets in OpenMRS.
    const conceptSetsToFetch = {
        drugs: "DRUG ALLERGENS",              // Concept Set for all documented drug/medication allergens
        foods: "FOOD ALLERGENS",              // Concept Set for all documented food allergens
        environmental: "ENVIRONMENTAL ALLERGENS", // Concept Set for things like pollen, dust, etc.
    };

    const apiBaseUrl = process.env.OPENMRS_API_URL;

    // We use a Promise.all structure to fetch all lists concurrently.
    const conceptPromises = Object.entries(conceptSetsToFetch).map(([key, name]) => {
        
        // Step 1: Search for the UUID of the Parent Concept Set using its display name.
        const searchUrl = `${apiBaseUrl}/concept?q=${encodeURIComponent(name)}&v=custom:(uuid)`;
        
        return fetch(searchUrl, { headers, cache: 'force-cache' })
            .then(async (searchResponse) => {
                if (!searchResponse.ok) {
                    await handleApiError(searchResponse, `Search for Concept Set: ${name}`);
                    return null;
                }
                const searchData: { results: Array<{ uuid: string }> } = await searchResponse.json();
                const parentConcept = searchData.results.find(c => c.uuid.length > 0); 
                
                if (!parentConcept) {
                    console.warn(`Allergen Concept Set not found for name: ${name}`);
                    return null;
                }
                
                // Step 2: Fetch the set members (the actual allergens) using the found UUID.
                const fetchMembersUrl = `${apiBaseUrl}/concept/${parentConcept.uuid}?v=custom:(setMembers:(uuid,display))`;
                return fetch(fetchMembersUrl, { headers, cache: 'force-cache' });
            })
            .then(async (membersResponse) => {
                if (!membersResponse || !membersResponse.ok) {
                    // Error already logged or handled
                    return { key: key as keyof AllergenConceptLists, data: [] };
                }

                const membersData: any = await membersResponse.json();
                
                // Map the setMembers to the required AllergenConceptOption structure
                const results = (membersData.setMembers || []).map((item: any) => ({
                    uuid: item.uuid,
                    display: item.display
                }));

                return { key: key as keyof AllergenConceptLists, data: results };
            })
            .catch(error => {
                console.error(`Final error fetching allergen concept set for ${key}:`, error);
                return { key: key as keyof AllergenConceptLists, data: [] };
            });
    });

    const results = await Promise.all(conceptPromises);

    // Reassemble the results into the final structured object
    const finalLists: AllergenConceptLists = results.reduce((acc, result) => {
        if (result && 'key' in result) {
            acc[result.key] = result.data;
        }
        return acc;
    }, {} as AllergenConceptLists);

    return finalLists;
}