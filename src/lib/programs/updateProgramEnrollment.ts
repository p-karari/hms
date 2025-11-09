'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';

export interface NewEnrollmentData {
    patientUuid: string;
    programUuid: string;     
    dateEnrolled: string;     
    locationUuid?: string;    
}

export interface ExitProgramData {
    enrollmentUuid: string;   
    dateCompleted: string;   
    
    outcomeConceptUuid?: string; 
}

export interface ChangeProgramStateData {
    enrollmentUuid: string;   
    stateUuid: string;        
    stateStartDate: string;   
}


async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to perform program action: HTTP ${response.status}.`);
}


export async function createProgramEnrollment(data: NewEnrollmentData): Promise<void> {
    const { patientUuid, programUuid, dateEnrolled, locationUuid } = data;

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        throw new Error("Authentication failed during enrollment creation.");
    }
    
    const payload = {
        patient: patientUuid,
        program: programUuid,
        dateEnrolled: dateEnrolled,
        location: locationUuid,
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


export async function changeProgramState(data: ChangeProgramStateData): Promise<void> {
    const { enrollmentUuid, stateUuid, stateStartDate } = data;

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        throw new Error("Authentication failed during state change.");
    }
    
    const payload = {
        state: stateUuid,
        startDate: stateStartDate,
    };

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