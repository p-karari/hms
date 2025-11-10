'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; 

export type ProgramOption = {
    uuid: string;
    display: string;
};

async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch available program data: HTTP ${response.status}.`);
}


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

        type ProgramApiResult = ProgramOption & { retired: boolean };

        const data: { results: ProgramApiResult[] } = await response.json();
        
        const activePrograms: ProgramOption[] = data.results
            .filter(program => !program.retired)
            
            .map(program => ({ uuid: program.uuid, display: program.display }));

        return activePrograms;

    } catch (error) {
        console.error('Final error fetching available program options:', error);
        return [];
    }
}