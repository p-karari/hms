'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { ConceptReference } from '@/lib/medications/getPatientMedicationOrders';

// Type definition for the orderable concept options
export type OrderableConceptOption = ConceptReference;

// Interface for the complete payload returned by this action
export interface OrderableConceptLists {
    labTests: OrderableConceptOption[];
    radiologyProcedures: OrderableConceptOption[];
    generalProcedures: OrderableConceptOption[];
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
 * Executes a set of concurrent fetches to retrieve concept lists for Lab, Radiology, and General Procedures
 * needed for the New Order Modal. This uses dynamic lookups (concept names/sets).
 *
 * @returns A structured object containing lists of orderable concepts.
 */
export async function getOrderConceptOptions(): Promise<OrderableConceptLists> {
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return { labTests: [], radiologyProcedures: [], generalProcedures: [] };
    }
    
    // --- Configuration: These must match the display names or UUIDs of your Concept Sets ---
    // NOTE: In production, verify these names match the Concept Sets used to define orderables.
    const conceptSetsToFetch = {
        labTests: "Lab Tests Set",              // Concept Set containing all orderable lab tests
        radiologyProcedures: "Radiology Procedures Set", // Concept Set containing all orderable radiology exams
        generalProcedures: "General Procedures Set",     // Concept Set containing all minor procedures/consults
    };

    const apiBaseUrl = process.env.OPENMRS_API_URL;

    const conceptPromises = Object.entries(conceptSetsToFetch).map(([key, name]) => {
        
        // This leverages the dynamic two-step concept lookup (search by name, then fetch members)
        const searchUrl = `${apiBaseUrl}/concept?q=${encodeURIComponent(name)}&v=custom:(uuid)`;
        
        return fetch(searchUrl, { headers, cache: 'force-cache' })
            .then(async (searchResponse) => {
                if (!searchResponse.ok) {
                    await handleApiError(searchResponse, `Search for ${name}`);
                    return null;
                }
                const searchData: { results: Array<{ uuid: string }> } = await searchResponse.json();
                const parentConcept = searchData.results.find(c => c.uuid.length > 0); 
                
                if (!parentConcept) {
                    console.warn(`Concept Set not found for name: ${name}`);
                    return null;
                }
                
                // Fetch the set members using the found UUID
                const fetchMembersUrl = `${apiBaseUrl}/concept/${parentConcept.uuid}?v=custom:(setMembers:(uuid,display))`;
                return fetch(fetchMembersUrl, { headers, cache: 'force-cache' });
            })
            .then(async (membersResponse) => {
                if (!membersResponse || !membersResponse.ok) {
                     // Error already logged in previous step or handled by subsequent catch
                    return { key: key as keyof OrderableConceptLists, data: [] };
                }

                const membersData: any = await membersResponse.json();
                
                // Map the setMembers to the required OrderableConceptOption structure
                const results = (membersData.setMembers || []).map((item: any) => ({
                    uuid: item.uuid,
                    display: item.display
                }));

                return { key: key as keyof OrderableConceptLists, data: results };
            })
            .catch(error => {
                console.error(`Final error fetching concept set for ${key}:`, error);
                return { key: key as keyof OrderableConceptLists, data: [] };
            });
    });

    const results = await Promise.all(conceptPromises);

    // Reassemble the results into the final structured object
    const finalLists: OrderableConceptLists = results.reduce((acc, result) => {
        // Ensure result is not null (which could happen if the search failed completely)
        if (result && 'key' in result) {
            acc[result.key] = result.data;
        }
        return acc;
    }, {} as OrderableConceptLists);

    return finalLists;
}