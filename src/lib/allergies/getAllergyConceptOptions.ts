'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { ConceptReference } from '@/lib/medications/getPatientMedicationOrders'; 

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


export async function getAllergyConceptOptions(): Promise<AllergenConceptLists> {
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return { drugs: [], foods: [], environmental: [] };
    }
    

    const conceptSetsToFetch = {
        drugs: "DRUG ALLERGENS",              
        foods: "FOOD ALLERGENS",              
        environmental: "ENVIRONMENTAL ALLERGENS", 
    };

    const apiBaseUrl = process.env.OPENMRS_API_URL;

    const conceptPromises = Object.entries(conceptSetsToFetch).map(([key, name]) => {
        
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
                
                const fetchMembersUrl = `${apiBaseUrl}/concept/${parentConcept.uuid}?v=custom:(setMembers:(uuid,display))`;
                return fetch(fetchMembersUrl, { headers, cache: 'force-cache' });
            })
            .then(async (membersResponse) => {
                if (!membersResponse || !membersResponse.ok) {
                    return { key: key as keyof AllergenConceptLists, data: [] };
                }

                const membersData: any = await membersResponse.json();
                
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

    const finalLists: AllergenConceptLists = results.reduce((acc, result) => {
        if (result && 'key' in result) {
            acc[result.key] = result.data;
        }
        return acc;
    }, {} as AllergenConceptLists);

    return finalLists;
}