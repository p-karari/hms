'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { ConceptReference } from '@/lib/medications/getPatientMedicationOrders'; // Reusing your existing reference type

export type LabTestConceptOption = ConceptReference;


async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch concept data for ${source}: HTTP ${response.status}.`);
}


export async function getLabTestConcepts(query: string = "Lab Test"): Promise<LabTestConceptOption[]> {
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }

    
    const url = `${process.env.OPENMRS_API_URL}/concept?q=${encodeURIComponent(query)}&v=custom:(uuid,display)&limit=50`;

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'force-cache' 
        });

        if (!response.ok) {
            await handleApiError(response, "getLabTestConcepts");
            return [];
        }

        const data: { results: any[] } = await response.json();
        
        
        const conceptOptions: LabTestConceptOption[] = data.results
            .filter(item => item.display) 
            .map(item => ({
                uuid: item.uuid,
                display: item.display
            }));
            
        return conceptOptions;

    } catch (error) {
        console.error("Final error in getLabTestConcepts:", error);
        return [];
    }
}