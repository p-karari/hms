'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { ConceptReference } from '@/lib/medications/getPatientMedicationOrders';

export type OrderableConceptOption = ConceptReference;

export interface OrderableConceptLists {
    labTests: OrderableConceptOption[];
    radiologyProcedures: OrderableConceptOption[];
    generalProcedures: OrderableConceptOption[];
}

async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch concept data for ${source}: HTTP ${response.status}.`);
}


export async function getOrderConceptOptions(): Promise<OrderableConceptLists> {
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return { labTests: [], radiologyProcedures: [], generalProcedures: [] };
    }
    
    const conceptSetsToFetch = {
        labTests: "Laboratory orders",              
        radiologyProcedures: "Radiology department", 
        generalProcedures: "General",     
    };

    const apiBaseUrl = process.env.OPENMRS_API_URL;

    const conceptPromises = Object.entries(conceptSetsToFetch).map(([key, name]) => {
        
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
                
                const fetchMembersUrl = `${apiBaseUrl}/concept/${parentConcept.uuid}?v=custom:(setMembers:(uuid,display))`;
                return fetch(fetchMembersUrl, { headers, cache: 'force-cache' });
            })
            .then(async (membersResponse) => {
                if (!membersResponse || !membersResponse.ok) {
                    return { key: key as keyof OrderableConceptLists, data: [] };
                }

                const membersData: any = await membersResponse.json();
                
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

    const finalLists: OrderableConceptLists = results.reduce((acc, result) => {
        if (result && 'key' in result) {
            acc[result.key] = result.data;
        }
        return acc;
    }, {} as OrderableConceptLists);

    return finalLists;
}