'use server'

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

// Note: In a real system, the API would be called to map the authenticated user 
// to their corresponding OpenMRS Provider UUID.

/**
 * Fetches the Provider UUID associated with the current authenticated user.
 * This is crucial for correctly attributing the clinical encounter.
 * * In a typical OpenMRS environment, this involves first getting the authenticated 
 * user's 'person' UUID, and then finding the corresponding 'provider' record.
 * * For simplicity, we assume we fetch the Provider record based on the current user's
 * name/username (mocked here, but the principle is sound).
 * * @param username The identifier of the current user (e.g., 'admin').
 * @returns The UUID of the Provider record.
 */
export async function getProviderUuid(username: string = 'admin') {
    // The OpenMRS API endpoint to search for providers
    const url = `${process.env.OPENMRS_API_URL}/provider?q=${username}&v=full`; 
    
    const cookieStore = await cookies();
    const jsessionid = cookieStore.get('JSESSIONID');
    
    // Auth Check
    if (!jsessionid || !jsessionid.value) {
        cookieStore.delete('JSESSIONID');
        redirect('/login')
    }

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cookie': `JSESSIONID=${jsessionid.value}`
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                cookieStore.delete('JSESSIONID'); 
                redirect('/login');
            }
            const errorDetail = await response.text();
            throw new Error(`OpenMRS API Error (Provider Lookup): HTTP ${response.status}. Detail: ${errorDetail.substring(0, 100)}...`)
        }

        const data: { results: Array<{ uuid: string }> } = await response.json();

        // Check if a result was found
        if (data.results.length === 0) {
            throw new Error(`No provider found for identifier: ${username}`);
        }

        // Return the UUID of the first matching provider
        return data.results[0].uuid;

    } catch (error: unknown) {
        if (isRedirectError(error)) {
            throw error;
        }
        console.error("Error fetching provider UUID:", error);
        throw new Error("Could not determine the Provider UUID for the current user.")
    }
}
