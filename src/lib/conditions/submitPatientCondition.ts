'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; 

// --- Interface for New Condition Submission ---
export interface NewConditionSubmissionData {
    patientUuid: string;
    conditionConceptUuid: string; // UUID of the diagnosis concept
    clinicalStatus: 'ACTIVE' | 'INACTIVE' | 'RESOLVED';
    verificationStatus: 'CONFIRMED' | 'UNCONFIRMED' | 'PROVISIONAL';
    onsetDate: string; // Required date of onset (ISO format)
    encounterUuid: string | null; // Optional: Link to the encounter where it was documented
    comment?: string; 
}

// --- Interface for Updating an Existing Condition ---
export interface UpdateConditionData {
    conditionUuid: string;
    clinicalStatus: 'ACTIVE' | 'INACTIVE' | 'RESOLVED';
    endDate?: string; // Required if resolving
}

// --- Helper for API Error Checking ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to perform condition action: HTTP ${response.status}.`);
}

/**
 * Submits a new patient condition record to the OpenMRS Problem List.
 *
 * @param submissionData The structured data payload for the new condition.
 * @returns A promise that resolves when the condition is successfully created.
 */
export async function createPatientCondition(submissionData: NewConditionSubmissionData): Promise<void> {
    const { 
        patientUuid, 
        conditionConceptUuid, 
        clinicalStatus, 
        verificationStatus, 
        onsetDate,
        encounterUuid,
        comment
    } = submissionData;

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        throw new Error("Authentication failed during condition creation.");
    }

    // --- Construct the OpenMRS Condition Payload ---
    const payload = {
        patient: patientUuid,
        condition: {
            uuid: conditionConceptUuid, // The diagnosis concept
        },
        clinicalStatus: clinicalStatus,
        verificationStatus: verificationStatus,
        onsetDate: onsetDate,
        encounter: encounterUuid,
        comment: comment,
        // The API automatically sets recordedDate
    };

    const url = `${process.env.OPENMRS_API_URL}/condition`;

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
            await handleApiError(response, "createPatientCondition");
        }
    } catch (error) {
        console.error("Final network error creating condition:", error);
        throw new Error("Network or unexpected error during condition creation.");
    }
}


/**
 * Updates the status of an existing patient condition record (e.g., changing status to RESOLVED).
 *
 * @param updateData The structured data payload for updating the condition status.
 * @returns A promise that resolves when the condition is successfully updated.
 */
export async function updatePatientCondition(updateData: UpdateConditionData): Promise<void> {
    const { conditionUuid, clinicalStatus, endDate } = updateData;

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        throw new Error("Authentication failed during condition update.");
    }

    // --- Construct the OpenMRS Condition Update Payload ---
    const payload: { [key: string]: any } = {
        clinicalStatus: clinicalStatus,
    };
    
    // Only include endDate if the status is RESOLVED
    if (clinicalStatus === 'RESOLVED' && endDate) {
        payload.endDate = endDate;
    } else if (clinicalStatus === 'RESOLVED' && !endDate) {
        // If resolving, use today's date if one isn't provided
        payload.endDate = new Date().toISOString().split('T')[0]; 
    }

    const url = `${process.env.OPENMRS_API_URL}/condition/${conditionUuid}`;

    try {
        const response = await fetch(url, {
            method: 'POST', // NOTE: OpenMRS often uses POST for updates/voids on resources
            headers: {
                ...headers,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            await handleApiError(response, `updatePatientCondition (${conditionUuid})`);
        }
    } catch (error) {
        console.error("Final network error updating condition:", error);
        throw new Error("Network or unexpected error during condition update.");
    }
}