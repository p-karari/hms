'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { ConceptReference } from '@/lib/medications/getPatientMedicationOrders'; // Reusing ConceptReference type

// --- Core Program Enrollment Interfaces ---

// Represents a state within a program (e.g., "Active on Treatment", "Lost to Follow-up")
export interface ProgramState {
    uuid: string;
    startDate: string; // Date the patient entered this specific state
    // The concept that defines the state (e.g., 'ON ANTIRETROVIRALS')
    state: ConceptReference; 
    // The provider/person who recorded this state change
    creator: { uuid: string; display: string } | null;
}

// Represents the patient's enrollment in one specific program
export interface ProgramEnrollment {
    uuid: string;
    
    // The program the patient is enrolled in (e.g., 'HIV Program')
    program: { uuid: string; display: string }; 
    
    // Date the patient first enrolled in the program
    dateEnrolled: string;
    
    // Date the patient exited/completed the program (if applicable)
    dateCompleted: string | null; 
    
    // The current status/state of the patient within the program
    voided: boolean;
    
    // The chronological history of states the patient has passed through in the program
    states: ProgramState[];
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

    // Fetch all program enrollments for the patient. v=full is necessary to get the states history.
    const url = `${process.env.OPENMRS_API_URL}/programenrollment?patient=${patientUuid}&v=full`;

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'no-store' // Critical for up-to-date status
        });

        if (!response.ok) {
            await handleApiError(response, "getPatientProgramEnrollments");
            return [];
        }

        const data: { results: ProgramEnrollment[] } = await response.json();
        
        // Filter out voided enrollment records defensively
        const activeRecords = data.results.filter(enrollment => !enrollment.voided);
        
        // Sort by enrollment date, newest first
        activeRecords.sort((a, b) => new Date(b.dateEnrolled).getTime() - new Date(a.dateEnrolled).getTime());
        
        return activeRecords;

    } catch (error) {
        console.error('Final error in getPatientProgramEnrollments:', error);
        return [];
    }
}