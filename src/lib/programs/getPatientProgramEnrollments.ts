'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';

export interface ConceptReference {
    uuid: string;
    display: string; 
    // Added 'name' to the ConceptReference type to support robust display logic in the client component
    name?: string; 
}

// --- Core Program Enrollment Interfaces ---

export interface ProgramState {
    uuid: string;
    startDate: string; 
    state: ConceptReference; 
    creator: { uuid: string; display: string } | null;
}

export interface ProgramEnrollment {
    uuid: string;
    
    program: { 
        uuid: string; 
        display: string;
        name?: string; 
        description?: string;
    }; 
    
    display: string;
    dateEnrolled: string;
    dateCompleted: string | null; 
    voided: boolean;
    states: ProgramState[];
    location: { uuid: string; display: string };
}

// --- Helper for API Error Checking ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch program enrollments: HTTP ${response.status}.`);
}

/**
 * Fetches the complete list of clinical program enrollments (active and historical) 
 * for a specific patient.
 * * NOTE: This uses the /programenrollment endpoint, which is standard in OpenMRS.
 * * @param patientUuid The UUID of the patient.
 * @returns A promise that resolves to an array of ProgramEnrollment objects.
 */
export async function getPatientProgramEnrollments(patientUuid: string): Promise<ProgramEnrollment[]> {
    if (!patientUuid) {
        console.error("Patient UUID is required to fetch program enrollments.");
        return [];
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }

    const url = `${process.env.OPENMRS_API_URL}/programenrollment?patient=${patientUuid}&v=full`;

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'no-store' 
        });

        if (!response.ok) {
            await handleApiError(response, "getPatientProgramEnrollments");
            return [];
        }

        const data: { results: ProgramEnrollment[] } = await response.json();
        
        const activeRecords = data.results.filter(enrollment => !enrollment.voided);
        
        activeRecords.sort((a, b) => new Date(b.dateEnrolled).getTime() - new Date(a.dateEnrolled).getTime());
        console.log(activeRecords)
        return activeRecords;

    } catch (error) {
        console.error('Final error in getPatientProgramEnrollments:', error);
        return [];
    }
}