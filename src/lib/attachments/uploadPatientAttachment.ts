'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; 

export interface AttachmentUploadData {
    patientUuid: string;
    documentConceptUuid: string; 
    
    fileBase64: string; 
    
    fileName: string;     
    fileMimeType: string; 
    comment: string;      
    
    locationUuid: string;
    providerUuid: string;
}


async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to upload attachment: HTTP ${response.status}.`);
}



export async function uploadPatientAttachment(uploadData: AttachmentUploadData): Promise<void> {
    const { 
        patientUuid, 
        documentConceptUuid, 
        fileBase64, 
        fileName, 
        fileMimeType, 
        comment,
        locationUuid,
        providerUuid
    } = uploadData;

    if (!patientUuid || !documentConceptUuid || !fileBase64) {
        throw new Error("Missing critical data for file upload.");
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        throw new Error("Authentication failed during attachment upload.");
    }
    

    const payload = {
        person: patientUuid,
        concept: documentConceptUuid, 
        obsDatetime: new Date().toISOString(), 
        location: locationUuid,
        provider: providerUuid,
        comment: comment || `Uploaded document: ${fileName}`,
        
        value: {
            valueBase64: fileBase64,
            mimeType: fileMimeType,
            title: fileName,
        }
    };

    const url = `${process.env.OPENMRS_API_URL}/obs`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json', 
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            await handleApiError(response, "uploadPatientAttachment");
        }
        
    } catch (error) {
        console.error("Final network error uploading attachment:", error);
        throw new Error("Network or unexpected error during attachment upload.");
    }
}