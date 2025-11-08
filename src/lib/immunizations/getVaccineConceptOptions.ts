'use server'

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
export type ConceptReference = { uuid: string; display: string; };

export type VaccineConceptOption = ConceptReference;

const VACCINE_CONCEPT_CIEL_REF = "CIEL:984"; 

async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch vaccine concept data: HTTP ${response.status}.`);
}


export async function getVaccineConceptOptions(): Promise<VaccineConceptOption[]> {
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }
    
    const apiBaseUrl = process.env.OPENMRS_API_URL;
    
    const fetchUrl = `${apiBaseUrl}/concept?references=${VACCINE_CONCEPT_CIEL_REF}&v=custom:(uuid,display,answers:(uuid,display))`;

    try {
        const response = await fetch(fetchUrl, { headers, cache: 'force-cache' });
        
        if (!response.ok) {
            await handleApiError(response, `Fetch Vaccine Concept Answers: ${VACCINE_CONCEPT_CIEL_REF}`);
            return [];
        }

        const data: { results: Array<{ uuid: string; display: string; answers: VaccineConceptOption[] }> } = await response.json();
        
        const conceptSet = data.results.find(c => c.answers && c.answers.length > 0); 
        
        if (!conceptSet) {
            console.warn(`Vaccine concept set (CIEL:984) found but contained no answers.`);
            return [];
        }
        
        return conceptSet.answers.filter(item => item.uuid && item.display);

    } catch (error) {
        console.error('Final error fetching vaccine concept options:', error);
        return [];
    }
}