'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';

// --- Interface for New Program Enrollment ---
export interface NewEnrollmentData {
    patientUuid: string;
    programUuid: string;      // The UUID of the program (e.g., HIV Program)
    dateEnrolled: string;     // The start date of the enrollment (ISO format)
    locationUuid?: string;    // Optional: Location of enrollment
}

// --- Interface for Program Exit (Update) ---
export interface ExitProgramData {
    enrollmentUuid: string;   // The UUID of the existing enrollment record
    dateCompleted: string;    // The date the patient exited the program (ISO format)
    // Optional: The concept UUID explaining the reason for exiting (e.g., 'Cured', 'Lost to Follow-up')
    outcomeConceptUuid?: string; 
}

// --- Interface for Program State Change (Update) ---
export interface ChangeProgramStateData {
    enrollmentUuid: string;   // The UUID of the existing enrollment record
    stateUuid: string;        // The UUID of the *new* program workflow state
    stateStartDate: string;   // The date the patient entered this new state (ISO format)
}


// --- Helper for API Error Checking ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to perform program action: HTTP ${response.status}.`);
}


/**
 * Creates a new patient enrollment in a specified program.
 *
 * @param data The data payload for the new enrollment.
 * @returns A promise that resolves when the enrollment is successfully created.
 */
export async function createProgramEnrollment(data: NewEnrollmentData): Promise<void> {
    const { patientUuid, programUuid, dateEnrolled, locationUuid } = data;

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        throw new Error("Authentication failed during enrollment creation.");
    }
    
    // --- Construct the Program Enrollment Payload ---
    const payload = {
        patient: patientUuid,
        program: programUuid,
        dateEnrolled: dateEnrolled,
        location: locationUuid,
        // Optional: initial state can be added here if required by the program configuration
    };

    const url = `${process.env.OPENMRS_API_URL}/programenrollment`;

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
            await handleApiError(response, "createProgramEnrollment");
        }
    } catch (error) {
        console.error("Final network error creating enrollment:", error);
        throw new Error("Network or unexpected error during program enrollment.");
    }
}


/**
 * Updates an existing program enrollment record to mark the patient as having exited/completed the program.
 *
 * @param data The data payload for exiting the program.
 * @returns A promise that resolves when the program exit is successfully recorded.
 */
export async function exitProgramEnrollment(data: ExitProgramData): Promise<void> {
    const { enrollmentUuid, dateCompleted, outcomeConceptUuid } = data;

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        throw new Error("Authentication failed during program exit.");
    }

    // --- Construct the Exit Payload (PUT/POST update to enrollment) ---
    const payload: { [key: string]: any } = {
        dateCompleted: dateCompleted,
        // Include outcome if provided
        ...(outcomeConceptUuid && { outcome: outcomeConceptUuid })
    };

    // Use POST method for partial updates on most OpenMRS resources
    const url = `${process.env.OPENMRS_API_URL}/programenrollment/${enrollmentUuid}`;

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
            await handleApiError(response, `exitProgramEnrollment (${enrollmentUuid})`);
        }
    } catch (error) {
        console.error("Final network error exiting program:", error);
        throw new Error("Network or unexpected error during program exit.");
    }
}


/**
 * Records a change in the patient's internal state within an enrolled program 
 * (e.g., changing from 'Active' to 'Lost to Follow-up').
 * * NOTE: This requires creating a new record on a sub-resource endpoint.
 *
 * @param data The data payload for the state change.
 * @returns A promise that resolves when the state change is successfully recorded.
 */
export async function changeProgramState(data: ChangeProgramStateData): Promise<void> {
    const { enrollmentUuid, stateUuid, stateStartDate } = data;

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        throw new Error("Authentication failed during state change.");
    }
    
    // --- Construct the Program State Payload ---
    const payload = {
        state: stateUuid,
        startDate: stateStartDate,
    };

    // The endpoint is nested under the enrollment UUID
    const url = `${process.env.OPENMRS_API_URL}/programenrollment/${enrollmentUuid}/states`;

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
            await handleApiError(response, `changeProgramState (${enrollmentUuid})`);
        }
    } catch (error) {
        console.error("Final network error changing program state:", error);
        throw new Error("Network or unexpected error during program state change.");
    }
}