'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { ConceptReference } from '@/lib/medications/getPatientMedicationOrders'; // Reusing ConceptReference type
import { formatDate } from '../utils/utils';

export interface Attachment {
    uuid: string; 
    patient: { uuid: string };
    
    documentType: ConceptReference; 
    
    recordedDate: string;
    
    fileName: string; 
    
    complexDataUrl: string; 
    
    provider?: { uuid: string; display: string } | null;
}

const ATTACHMENT_CONCEPT_NAME = "CLINICAL DOCUMENT"; 


async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch patient attachments: HTTP ${response.status}.`);
}


export async function getPatientAttachments(patientUuid: string): Promise<Attachment[]> {
    if (!patientUuid) {
        console.error("Patient UUID is required to fetch attachments.");
        return [];
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }

    const url = `${process.env.OPENMRS_API_URL}/obs?patient=${patientUuid}&concept=${ATTACHMENT_CONCEPT_NAME}&v=full`; 

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'no-store' 
        });

        if (!response.ok) {
            await handleApiError(response, "getPatientAttachments");
            return [];
        }

        const data: { results: any[] } = await response.json();
        
        const attachments: Attachment[] = data.results
            .filter(obs => obs.value && obs.value.complexData) 
            .map(obs => ({
                uuid: obs.uuid,
                patient: obs.person,
                documentType: obs.concept, 
                recordedDate: obs.obsDatetime,
                fileName: obs.comment || obs.value.complexData.title || `Document ${formatDate(obs.obsDatetime)}`, 
                complexDataUrl: obs.value.complexData.uri, 
                provider: obs.provider || null, 
            }));
        
        attachments.sort((a, b) => new Date(b.recordedDate).getTime() - new Date(a.recordedDate).getTime());
        
        return attachments;

    } catch (error) {
        console.error('Final error in getPatientAttachments:', error);
        return [];
    }
}