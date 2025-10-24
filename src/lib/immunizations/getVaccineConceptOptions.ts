'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { ConceptReference } from '@/lib/medications/getPatientMedicationOrders'; // Reusing ConceptReference type

// Type definition for the vaccine concept options
export type VaccineConceptOption = ConceptReference;

// --- Helper for API Error Checking ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch vaccine concept data: HTTP ${response.status}.`);
}

/**
 * Fetches a list of standardized vaccine concepts from a configured OpenMRS Concept Set.
 * This list is used to populate the dropdown in the 'Document New Immunization' form.
 *
 * NOTE: This relies on a Concept Set being configured in OpenMRS containing all available vaccines.
 *
 * @returns A promise that resolves to an array of VaccineConceptOption objects.
 */
export async function getVaccineConceptOptions(): Promise<VaccineConceptOption[]> {
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }
    
    // --- Configuration: Define the name of the Vaccine Concept Set ---
    // This name must match the display name of your master vaccine concept set in OpenMRS.
    const VACCINE_CONCEPT_SET_NAME = "ALL AVAILABLE VACCINES"; 
    const apiBaseUrl = process.env.OPENMRS_API_URL;

    try {
        // Step 1: Search for the UUID of the Parent Concept Set using its display name.
        const searchUrl = `${apiBaseUrl}/concept?q=${encodeURIComponent(VACCINE_CONCEPT_SET_NAME)}&v=custom:(uuid)`;
        
        const searchResponse = await fetch(searchUrl, { headers, cache: 'force-cache' });
        
        if (!searchResponse.ok) {
            await handleApiError(searchResponse, `Search for Vaccine Concept Set: ${VACCINE_CONCEPT_SET_NAME}`);
            return [];
        }

        const searchData: { results: Array<{ uuid: string }> } = await searchResponse.json();
        const parentConcept = searchData.results.find(c => c.uuid.length > 0); 
        
        if (!parentConcept) {
            console.warn(`Vaccine Concept Set not found for name: ${VACCINE_CONCEPT_SET_NAME}.`);
            return [];
        }
        
        // Step 2: Fetch the set members (the actual vaccine names) using the found UUID.
        const fetchMembersUrl = `${apiBaseUrl}/concept/${parentConcept.uuid}?v=custom:(setMembers:(uuid,display))`;
        
        const membersResponse = await fetch(fetchMembersUrl, { headers, cache: 'force-cache' });

        if (!membersResponse.ok) {
            await handleApiError(membersResponse, `Fetch Vaccine Concept Members`);
            return [];
        }

        const membersData: any = await membersResponse.json();
        
        // Map the setMembers to the required VaccineConceptOption structure
        const results: VaccineConceptOption[] = (membersData.setMembers || []).map((item: any) => ({
            uuid: item.uuid,
            display: item.display
        }));

        return results;

    } catch (error) {
        console.error('Final error fetching vaccine concept options:', error);
        return [];
    }
}