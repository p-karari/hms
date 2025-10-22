'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { ConceptReference } from '@/lib/medications/getPatientMedicationOrders'; // Reusing ConceptReference type
import { formatDate } from '../utils/utils';

// --- Core Attachment Interface ---
export interface Attachment {
    uuid: string; // The UUID of the Obs record
    patient: { uuid: string };
    
    // The concept defining the type of document (e.g., "Clinical Document", "Radiology Report")
    documentType: ConceptReference; 
    
    // The date the file was uploaded/recorded
    recordedDate: string;
    
    // The file name or description, often stored in the Obs comment or a specific Obs value
    fileName: string; 
    
    // The link/key required to fetch the actual complex data (the file itself)
    complexDataUrl: string; 
    
    // Optional: The provider who uploaded the file
    provider?: { uuid: string; display: string } | null;
}

// --- Configuration Constant ---
// The UUID or name of the concept used in OpenMRS to categorize attachments/clinical documents.
const ATTACHMENT_CONCEPT_NAME = "CLINICAL DOCUMENT"; 


// --- Helper for API Error Checking ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch patient attachments: HTTP ${response.status}.`);
}

/**
 * Fetches the list of all documented attachments (files/complex Obs) for a specific patient.
 * * * NOTE: This relies on filtering by a specific Observation Concept (CLINICAL DOCUMENT).
 * * @param patientUuid The UUID of the patient.
 * @returns A promise that resolves to an array of Attachment objects.
 */
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
    
    // In a production system, we'd look up the ATTACHMENT_CONCEPT_UUID first.
    // For simplicity, we query the Obs endpoint by patient and concept name/UUID (if known).
    
    // The v=full flag is necessary to get metadata needed for the complex data link.
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
        
        // --- Custom Logic: Map Obs data to Attachment Interface ---
        const attachments: Attachment[] = data.results
            .filter(obs => obs.value && obs.value.complexData) // Only include Obs that point to complex data
            .map(obs => ({
                uuid: obs.uuid,
                patient: obs.person,
                documentType: obs.concept, // The 'CLINICAL DOCUMENT' concept
                recordedDate: obs.obsDatetime,
                // The complexData property holds the file metadata and URL
                fileName: obs.comment || obs.value.complexData.title || `Document ${formatDate(obs.obsDatetime)}`, 
                // This URL is used to download the file via the OpenMRS API
                complexDataUrl: obs.value.complexData.uri, 
                // Provider info is sometimes in the encounter, simplified here
                provider: obs.provider || null, 
            }));
        
        // Sort by recorded date, newest first
        attachments.sort((a, b) => new Date(b.recordedDate).getTime() - new Date(a.recordedDate).getTime());
        
        return attachments;

    } catch (error) {
        console.error('Final error in getPatientAttachments:', error);
        return [];
    }
}