'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; 

export interface PatientLocation {
    uuid: string;
    display: string;
    name: string;
}

async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch location data: HTTP ${response.status}.`);
}


export async function getPatientLocations(patientUuid: string): Promise<PatientLocation[]> {
    console.log(patientUuid)
    
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }

    const url = `${process.env.OPENMRS_API_URL}/location?v=custom:(uuid,display,name)`;

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'force-cache' 
        });

        if (!response.ok) {
            await handleApiError(response, "getPatientLocations");
            return [];
        }

        const data: { results: PatientLocation[] } = await response.json();
        
        const activeLocations = data.results.filter((loc: any) => !loc.retired);
        
        return activeLocations;

    } catch (error) {
        console.error('Final error in getPatientLocations:', error);
        return [];
    }
}