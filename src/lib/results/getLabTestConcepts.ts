'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { ConceptReference } from '@/lib/medications/getPatientMedicationOrders'; // Reusing your existing reference type

// Type definition for the list of test options
export type LabTestConceptOption = ConceptReference;

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
 * Searches the OpenMRS Concept Dictionary for common lab test names 
 * to populate a filter dropdown on the Lab Results dashboard.
 * * NOTE: The query "Lab Test" is highly dependent on your dictionary structure. 
 * You may need to replace this with the UUID of a known "Lab Tests" Concept Set.
 * * @param query Optional search term, defaults to a broad term for test names.
 * @returns A promise that resolves to an array of LabTestConceptOption objects.
 */
export async function getLabTestConcepts(query: string = "Lab Test"): Promise<LabTestConceptOption[]> {
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }

    // Use a custom view to get just the UUID and display name
    const url = `${process.env.OPENMRS_API_URL}/concept?q=${encodeURIComponent(query)}&v=custom:(uuid,display)&limit=50`;

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'force-cache' // Test lists are generally static
        });

        if (!response.ok) {
            await handleApiError(response, "getLabTestConcepts");
            return [];
        }

        const data: { results: any[] } = await response.json();
        
        // Map the search results to the required LabTestConceptOption structure
        const conceptOptions: LabTestConceptOption[] = data.results
            .filter(item => item.display) // Ensure the concept has a display name
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