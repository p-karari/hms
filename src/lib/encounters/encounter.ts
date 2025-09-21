'use server'

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// --- New Type Definitions for Encounter Providers ---

/**
 * Defines the role and provider for an encounter.
 */
interface EncounterProvider {
    provider: string;     // The Provider UUID
    encounterRole: string; // The Encounter Role UUID (e.g., "Clinician")
}

// --- Type Definitions for API Payloads and Responses ---

/**
 * Defines the structure of an Observation (Obs) object for the OpenMRS API submission.
 * This is the core clinical data collected during an encounter.
 */
export interface ObsPayload {
    concept: string;     // UUID of the concept (the question or test)
    value: unknown;          // The answer (e.g., number, string, concept UUID, date)
    obsDatetime?: string;
    comment?: string;
    groupMembers?: ObsPayload[];
}

/**
 * Defines the complete structure required for creating a new clinical encounter
 * via the OpenMRS REST API POST /encounter endpoint.
 */
export interface SubmitEncounterData {
    patient: string;           // Patient UUID
    encounterDatetime: string; // ISO-formatted date/time
    encounterType: string;     // Encounter Type UUID
    location: string;          // Location UUID
    // 🎯 FIX: Replace 'provider: string' with 'encounterProviders' array
    encounterProviders?: EncounterProvider[]; // ✅ Correct structure for REST API
    visit?: string;            // Often required for modern OpenMRS encounters (ensure to send it from client)
    obs?: ObsPayload[];        
    orders?: string[];
}

// --- Utility function for handling authentication and redirects ---

/**
 * Checks for JSESSIONID and handles redirection if authentication is missing.
 * @returns The value of the JSESSIONID cookie.
 * @throws {Error} if the cookie is missing and redirect is caught.
 */
async function authenticateAndGetSessionId(): Promise<string> {
    const cookieStore = await cookies();
    const jsessionid = cookieStore.get('JSESSIONID');
    
    if (!jsessionid || !jsessionid.value) {
        cookieStore.delete('JSESSIONID');
        // Note: You must ensure 'cookieStore' is available here if an error occurs.
        // In the catch blocks below, we ensure to call 'await cookies()' if needed.
        redirect('/login');
    }
    return jsessionid.value;
}


// --- Action 1: getEncounterforms (Retrieves Form Definitions) ---

/**
 * Fetches the list of form definitions available in OpenMRS.
 * @returns The JSON response containing the list of forms.
 */
export async function getEncounterforms() {
    const url = `${process.env.OPENMRS_API_URL}/form?v=full`; 
    
    try {
        const jsessionidValue = await authenticateAndGetSessionId();
        const cookieStore = await cookies(); // Used for deletion on 401/403

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cookie': `JSESSIONID=${jsessionidValue}`
            },
            cache: 'no-store'
        })
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                cookieStore.delete('JSESSIONID'); 
                redirect('/login');
            }
            const errorDetail = await response.text();
            throw new Error(`OpenMRS API Error: HTTP ${response.status}. Detail: ${errorDetail.substring(0, 100)}...`);
        }
        
        const data = await response.json();
        return data; 
        
    } catch (error) {
        if (isRedirectError(error)) {
            throw error;
        }
        console.error(error);
        throw new Error("Could not get encounter forms due to a network or server issue.");
    }
}


// --- Action 2: submitEncounter (Creates a New Encounter) ---

/**
 * Submits clinical data to create a new encounter in OpenMRS.
 * @param encounterData - The structured data payload for the encounter.
 * @returns The JSON response of the newly created encounter.
 */
export async function submitEncounter(encounterData: SubmitEncounterData) {
    const url = `${process.env.OPENMRS_API_URL}/encounter`;
    
    try {
        const jsessionidValue = await authenticateAndGetSessionId();
        const cookieStore = await cookies(); // Used for deletion on 401/403

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Cookie': `JSESSIONID=${jsessionidValue}`
            },
            body: JSON.stringify(encounterData), 
            cache: 'no-store'
        })
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                cookieStore.delete('JSESSIONID');
                redirect('/login');
            }
            const errorDetail = await response.text();
            throw new Error(`Encounter Submission Error: HTTP ${response.status}. Detail: ${errorDetail.substring(0, 200)}...`);
        }
        
        const data = await response.json();
        return data; 

    } catch (error) {
        if (isRedirectError(error)) {
            throw error;
        }
        console.error("Error submitting encounter:", error);
        throw new Error("Could not submit the clinical encounter due to an issue with the data or the server.");
    }
}