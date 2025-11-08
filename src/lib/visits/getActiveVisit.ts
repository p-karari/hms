// src/lib/patients/manageVisits.ts (Updated Server Actions)
'use server';

import { getAuthHeaders, redirectToLogin } from '../auth/auth';
import { Encounter } from './getVisitEncounters';
// Ensure 'Visit' interface is correctly imported or defined here
// Assuming the following structure for API responses:
export interface Visit {
    uuid: string;
    patient: { uuid: string; display: string };
    visitType: { uuid: string; display: string };
    location: { uuid: string; display: string };
    startDatetime: string;
    stopDatetime: string | null;
    encounters?: Encounter[];
    // ... potentially other fields
}

// --- Helper for Error Checking ---
async function handleApiError(response: Response) {
    // 401 Unauthorized or 403 Forbidden indicate authentication/permission issues
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        // Throw an error that stops execution and gets caught by the caller's try/catch
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    // Handle all other non-OK responses
    const errorText = await response.text();
    console.error(`OpenMRS API Error ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch visit data: HTTP ${response.status}.`);
}

// --- 1. Fetch Single Active Visit ---

/**
 * Fetches the single active visit for a patient, if one exists, using includeInactive=false.
 * @param patientUuid The UUID of the patient.
 * @returns The active Visit object or null.
 */
export async function getPatientActiveVisit(patientUuid: string): Promise<Visit | null> {
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        // Auth failure before API call
        redirectToLogin();
        return null;
    }

    // Use includeInactive=false to fetch only the active visit
    const url = `${process.env.OPENMRS_API_URL}/visit?patient=${patientUuid}&includeInactive=false&v=full`;

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'no-store' // CRITICAL: Prevents Next.js from serving stale data
        });

        if (!response.ok) {
            // This throws an error or redirects
            await handleApiError(response);
            return null; // Should be unreachable, but keeps TypeScript happy
        }

        const data: { results: Visit[] } = await response.json();
        
        // The API now reliably returns a single item array or an empty array
        return data.results.length > 0 ? data.results[0] : null;

    } catch (error) {
        // Catch network errors, JSON parsing errors, and re-thrown errors from handleApiError
        console.error('Final error in getPatientActiveVisit:', error);
        return null;
    }
}

// --- 2. Fetch Active Visit Count (New Action) ---

/**
 * Fetches the count of active visits for a patient.
 * NOTE: This relies on the API endpoint returning a "totalCount" property.
 * @param patientUuid The UUID of the patient.
 * @returns The count (number) of active visits.
 */
export async function getPatientActiveVisitCount(patientUuid: string): Promise<number> {
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return 0;
    }

    // Use totalCount=true to get the count directly
    const url = `${process.env.OPENMRS_API_URL}/visit?patient=${patientUuid}&includeInactive=false&totalCount=true&v=custom:(uuid)`;

    try {
        const response = await fetch(url, { headers, cache: 'no-store' });

        if (!response.ok) {
            await handleApiError(response);
            return 0;
        }

        // The response will now contain a 'totalCount' field alongside 'results'
        const data: { results: Visit[], totalCount: number } = await response.json();
        
        return data.totalCount || 0;

    } catch (error) {
        console.error('Final error in getPatientActiveVisitCount:', error);
        return 0;
    }
}