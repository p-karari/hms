'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; 

// --- Submission Data Interface ---
export interface AttachmentUploadData {
    patientUuid: string;
    // The concept UUID fetched from getAttachmentUploadContext.ts
    documentConceptUuid: string; 
    
    // The base64-encoded string of the file content
    fileBase64: string; 
    
    fileName: string;     // Original file name (e.g., 'lab_report.pdf')
    fileMimeType: string; // MIME type (e.g., 'application/pdf')
    comment: string;      // Clinician notes/description
    
    // Contextual data
    locationUuid: string;
    providerUuid: string;
}


// --- Helper for API Error Checking ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to upload attachment: HTTP ${response.status}.`);
}


/**
 * Uploads a file attachment by creating a Complex Observation record in OpenMRS.
 * The file content must be base64 encoded and submitted within the Obs payload.
 *
 * @param uploadData The structured data payload including file contents.
 * @returns A promise that resolves when the Complex Obs is successfully created.
 */
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
    
    // --- Construct the Complex Observation Payload ---
    // This structure creates an Obs whose 'value' field contains the base64-encoded file (complex data).
    const payload = {
        person: patientUuid,
        concept: documentConceptUuid, // e.g., 'CLINICAL DOCUMENT'
        obsDatetime: new Date().toISOString(), // Use current time for documentation
        location: locationUuid,
        provider: providerUuid,
        comment: comment || `Uploaded document: ${fileName}`,
        
        // This is the structure for complex data submission
        value: {
            // Note: The OpenMRS 'complexdata' format might vary. This is a common structure.
            valueBase64: fileBase64,
            mimeType: fileMimeType,
            title: fileName,
        }
    };

    // The endpoint for creating a new Observation is /obs
    const url = `${process.env.OPENMRS_API_URL}/obs`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...headers,
                // Crucial for JSON submission
                'Content-Type': 'application/json', 
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            await handleApiError(response, "uploadPatientAttachment");
        }
        
        // Successfully uploaded (response status 201 Created)
    } catch (error) {
        console.error("Final network error uploading attachment:", error);
        throw new Error("Network or unexpected error during attachment upload.");
    }
}