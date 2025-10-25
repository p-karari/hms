'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { ConceptReference } from '@/lib/medications/getPatientMedicationOrders'; // Reusing your existing reference type

// Type definition for the diagnosis concept options
export type DiagnosisConceptOption = ConceptReference;

// --- Helper for API Error Checking ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch diagnosis concept data: HTTP ${response.status}.`);
}

/**
 * Fetches a list of standardized diagnosis concepts, typically from a configured
 * concept source or set, for use in documenting new patient conditions.
 *
 * NOTE: This action is often implemented using a concept search endpoint (`/concept?q=`) 
 * but here, we fetch a pre-defined Concept Set (Problem List concept set) for simplicity.
 *
 * @returns A promise that resolves to an array of DiagnosisConceptOption objects.
 */
export async function getDiagnosisConceptOptions(): Promise<DiagnosisConceptOption[]> {
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }
    
    // --- Configuration: Define the name of the Diagnosis Concept Set ---
    // This name must match the display name of your master diagnosis concept set in OpenMRS.
    const DIAGNOSIS_CONCEPT_SET_NAME = "ICD-10 PROBLEM LIST"; 
    const apiBaseUrl = process.env.OPENMRS_API_URL;

    try {
        // Step 1: Search for the UUID of the Parent Concept Set using its display name.
        const searchUrl = `${apiBaseUrl}/concept?q=${encodeURIComponent(DIAGNOSIS_CONCEPT_SET_NAME)}&v=custom:(uuid)`;
        
        const searchResponse = await fetch(searchUrl, { headers, cache: 'force-cache' });
        
        if (!searchResponse.ok) {
            await handleApiError(searchResponse, `Search for Diagnosis Concept Set: ${DIAGNOSIS_CONCEPT_SET_NAME}`);
            return [];
        }

        const searchData: { results: Array<{ uuid: string }> } = await searchResponse.json();
        const parentConcept = searchData.results.find(c => c.uuid.length > 0); 
        
        if (!parentConcept) {
            console.warn(`Diagnosis Concept Set not found for name: ${DIAGNOSIS_CONCEPT_SET_NAME}.`);
            return [];
        }
        
        // Step 2: Fetch the set members (the actual diagnosis codes) using the found UUID.
        const fetchMembersUrl = `${apiBaseUrl}/concept/${parentConcept.uuid}?v=custom:(setMembers:(uuid,display))`;
        
        const membersResponse = await fetch(fetchMembersUrl, { headers, cache: 'force-cache' });

        if (!membersResponse.ok) {
            await handleApiError(membersResponse, `Fetch Diagnosis Concept Members`);
            return [];
        }

        const membersData: any = await membersResponse.json();
        
        // Map the setMembers to the required DiagnosisConceptOption structure
        const results: DiagnosisConceptOption[] = (membersData.setMembers || []).map((item: any) => ({
            uuid: item.uuid,
            display: item.display
        }));

        return results;

    } catch (error) {
        console.error('Final error fetching diagnosis concept options:', error);
        return [];
    }
}