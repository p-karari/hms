'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; 


const ATTACHMENT_CONCEPT_NAME = "CLINICAL DOCUMENT"; 

// --- Context Interface ---
export interface AttachmentUploadContext {
    clinicalDocumentConceptUuid: string;
}


async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch attachment context: HTTP ${response.status}.`);
}



export async function getAttachmentUploadContext(): Promise<AttachmentUploadContext> {
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        throw new Error("Authentication failed during context retrieval.");
    }
    
    const apiBaseUrl = process.env.OPENMRS_API_URL;

    try {

        const searchUrl = `${apiBaseUrl}/concept?q=${encodeURIComponent(ATTACHMENT_CONCEPT_NAME)}&v=custom:(uuid)`;
        
        const searchResponse = await fetch(searchUrl, { headers, cache: 'force-cache' });
        
        if (!searchResponse.ok) {
            await handleApiError(searchResponse, `Search for Concept: ${ATTACHMENT_CONCEPT_NAME}`);
            throw new Error(`Concept lookup failed.`);
        }

        const searchData: { results: Array<{ uuid: string }> } = await searchResponse.json();
        const documentConcept = searchData.results.find(c => c.uuid.length > 0); 
        
        if (!documentConcept) {
            console.error(`Critical concept not found: ${ATTACHMENT_CONCEPT_NAME}.`);
            throw new Error(`Required configuration missing: Clinical Document Concept.`);
        }
        
        return {
            clinicalDocumentConceptUuid: documentConcept.uuid,
        };

    } catch (error) {
        console.error('Final error fetching attachment upload context:', error);
        throw new Error("Unable to initialize document upload settings.");
    }
}