'use server';

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// --- Utility function for handling authentication and redirects (copied for self-containment) ---

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
        redirect('/login');
    }
    return jsessionid.value;
}

// --- Action: getActiveEncounterUuid ---

/**
 * Fetches the UUID of the patient's most recent active (unclosed) encounter.
 * This is crucial for linking new orders to the current clinical context.
 * * @param patientUuid The UUID of the patient.
 * @returns A promise that resolves to the active encounter UUID (string) or null if none is found.
 */
export async function getActiveEncounterUuid(patientUuid: string): Promise<string | null> {
    if (!patientUuid) {
        console.error("Patient UUID is required to fetch active encounter.");
        return null;
    }

    // Query for encounters by patient, sorted by descending date, limited to 1.
    // We rely on the client or API filters to ensure the returned encounter is considered "active."
    // In many distributions, an encounter is considered active if 'stopDate' or 'endDate' is null.
    // The OpenMRS REST endpoint for /encounter doesn't natively support filtering by a null end date
    // or by 'active' status, so we fetch the most recent and check client-side.
    const url = `${process.env.OPENMRS_API_URL}/encounter?patient=${patientUuid}&v=custom:(uuid,encounterDatetime,encounterType,visit:(uuid,stopDatetime))&limit=1`;

    try {
        const jsessionidValue = await authenticateAndGetSessionId();
        const cookieStore = cookies(); 

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cookie': `JSESSIONID=${jsessionidValue}`
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                (await cookieStore).delete('JSESSIONID');
                redirect('/login');
            }
            const errorDetail = await response.text();
            throw new Error(`OpenMRS API Error: HTTP ${response.status}. Detail: ${errorDetail.substring(0, 100)}...`);
        }

        const data: { results: any[] } = await response.json();

        if (data.results.length === 0) {
            return null; // No encounters found
        }
        
        const mostRecentEncounter = data.results[0];
        
        // --- Logic to Determine 'Active' ---
        // We consider the most recent encounter active if it does NOT have a 'stopDate'.
        // This is a common pattern for defining the 'current' or 'active' encounter.
        if (mostRecentEncounter.stopDate === null) {
            return mostRecentEncounter.uuid;
        }

        // If the most recent one has a stopDate, there is no currently active encounter.
        return null;

    } catch (error) {
        if (isRedirectError(error)) {
            throw error;
        }
        console.error("Error fetching active encounter:", error);
        // Do not throw a fatal error here; gracefully return null.
        return null; 
    }
}