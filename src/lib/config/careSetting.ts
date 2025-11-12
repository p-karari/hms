'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; 

async function handleApiError(response: Response) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error ${response.status}: ${errorText.substring(0, 500)}`);
    throw new Error(`Failed to fetch Care Setting: HTTP ${response.status}.`);
}


export async function getCareSettingUuid(name: string): Promise<string> {
    if (!name) {
        throw new Error("Care Setting name is required for lookup.");
    }
    
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        throw new Error("Authentication required for config lookup.");
    }

    const url = `${process.env.OPENMRS_API_URL}/caresetting?q=${encodeURIComponent(name)}&v=custom:(uuid)`;

    try {
        const response = await fetch(url, { headers, cache: 'force-cache' });

        if (!response.ok) {
            await handleApiError(response);
            return '';
        }

        const data: { results: { uuid: string }[] } = await response.json();
        
        if (data.results.length === 0) {
            throw new Error(`Care Setting not found for name: ${name}`);
        }
        
        return data.results[0].uuid;

    } catch (error) {
        console.error('Final error in getCareSettingUuid:', error);
        throw new Error(`Could not resolve Care Setting UUID for ${name}.`);
    }
}