'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; 

export interface DrugFormulation {
    uuid: string;
    display: string;
    concept?: { uuid: string; display: string }; 
}

async function handleApiError(response: Response) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch drug data: HTTP ${response.status}.`);
}


export async function getFormularyDrugs(query: string): Promise<DrugFormulation[]> {
    if (!query || query.length < 2) return [];

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }

    const url = `${process.env.OPENMRS_API_URL}/drug?q=${encodeURIComponent(query)}&v=custom:(uuid,display,concept)`;

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'no-store' 
        });

        if (!response.ok) {
            await handleApiError(response);
            return []; 
        }

        const data: { results: DrugFormulation[] } = await response.json();
        
        return data.results || [];

    } catch (error) {
        console.error('Final error in getFormularyDrugs:', error);
        return [];
    }
}