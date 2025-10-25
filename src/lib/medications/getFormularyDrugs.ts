'use server';

// Assuming these imports exist in your project structure, mirroring your example
import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; 
// Assuming the handleApiError and interfaces are defined locally or imported
// NOTE: I'll recreate handleApiError locally for this file's context, as it's key to your style.

// Interface matching the expected drug list structure
export interface DrugFormulation {
    uuid: string;
    display: string;
    concept?: { uuid: string; display: string }; // Include if needed
    // Add other fields like strength, dosageForm if necessary
}

// --- Helper for API Error Checking (Imitating your provided structure) ---
async function handleApiError(response: Response) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch drug data: HTTP ${response.status}.`);
}

/**
 * Searches the drug formulary (specific drug formulations) by name.
 * @param query The user's search term (e.g., "Amoxicillin").
 * @returns A promise resolving to an array of DrugFormulation objects.
 */
export async function getFormularyDrugs(query: string): Promise<DrugFormulation[]> {
    if (!query || query.length < 2) return [];

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }

    // URL construction using process.env and the confirmed endpoint structure
    const url = `${process.env.OPENMRS_API_URL}/drug?q=${encodeURIComponent(query)}&v=custom:(uuid,display,concept)`;

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'no-store' // Dynamic search results must not be cached
        });

        if (!response.ok) {
            // This throws an error or redirects
            await handleApiError(response);
            return []; // Should be unreachable, but keeps TypeScript happy
        }

        const data: { results: DrugFormulation[] } = await response.json();
        
        return data.results || [];

    } catch (error) {
        // Catch network errors, JSON parsing errors, and re-thrown errors from handleApiError
        console.error('Final error in getFormularyDrugs:', error);
        return [];
    }
}