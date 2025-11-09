'use server';

import { getAuthHeaders, redirectToLogin } from '../auth/auth';
import { Encounter } from './getVisitEncounters';

export interface Visit {
    uuid: string;
    patient: { uuid: string; display: string };
    visitType: { uuid: string; display: string };
    location: { uuid: string; display: string };
    startDatetime: string;
    stopDatetime: string | null;
    encounters?: Encounter[];
}

async function handleApiError(response: Response) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch visit data: HTTP ${response.status}.`);
}



export async function getPatientActiveVisit(patientUuid: string): Promise<Visit | null> {
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return null;
    }

    const url = `${process.env.OPENMRS_API_URL}/visit?patient=${patientUuid}&includeInactive=false&v=full`;

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'no-store' 
        });

        if (!response.ok) {
            await handleApiError(response);
            return null; 
        }

        const data: { results: Visit[] } = await response.json();
        
        return data.results.length > 0 ? data.results[0] : null;

    } catch (error) {
        console.error('Final error in getPatientActiveVisit:', error);
        return null;
    }
}


export async function getPatientActiveVisitCount(patientUuid: string): Promise<number> {
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return 0;
    }

    const url = `${process.env.OPENMRS_API_URL}/visit?patient=${patientUuid}&includeInactive=false&totalCount=true&v=custom:(uuid)`;

    try {
        const response = await fetch(url, { headers, cache: 'no-store' });

        if (!response.ok) {
            await handleApiError(response);
            return 0;
        }

        const data: { results: Visit[], totalCount: number } = await response.json();
        
        return data.totalCount || 0;

    } catch (error) {
        console.error('Final error in getPatientActiveVisitCount:', error);
        return 0;
    }
}