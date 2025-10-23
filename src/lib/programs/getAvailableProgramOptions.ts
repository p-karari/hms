'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; 

// --- Corrected Type definition for the program options ---
export type ProgramOption = {
    uuid: string;
    display: string;
};

// --- Helper for API Error Checking (omitted for brevity) ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch available program data: HTTP ${response.status}.`);
}

/**
 * Fetches a list of all non-retired programs available in the OpenMRS instance.
 * This list is used for enrolling a patient into a specific long-term health program.
 *
 * @returns A promise that resolves to an array of ProgramOption objects.
 */
export async function getAvailableProgramOptions(): Promise<ProgramOption[]> {
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }
    
    const apiBaseUrl = process.env.OPENMRS_API_URL;

    try {
        const url = `${apiBaseUrl}/program?v=custom:(uuid,display,retired)`;
        
        const response = await fetch(url, { headers, cache: 'force-cache' });
        
        if (!response.ok) {
            await handleApiError(response, `Search for Programs`);
            return [];
        }

        // --- FIX: Explicitly define the type for the result items here ---
        type ProgramApiResult = ProgramOption & { retired: boolean };

        const data: { results: ProgramApiResult[] } = await response.json();
        
        // Filter out retired programs
        const activePrograms: ProgramOption[] = data.results
            .filter(program => !program.retired)
            // The mapping is now safe because 'program' is correctly typed as ProgramApiResult 
            // which includes uuid and display.
            .map(program => ({ uuid: program.uuid, display: program.display }));

        return activePrograms;

    } catch (error) {
        console.error('Final error fetching available program options:', error);
        return [];
    }
}