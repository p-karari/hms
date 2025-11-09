'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; // Assuming shared location for auth utilities

export interface Visit {
    uuid: string;
    patient: { uuid: string; display: string };
    visitType: { uuid: string; display: string };
    location: { uuid: string; display: string };
    startDatetime: string;
    stopDatetime: string | null;
    encounters?: { uuid: string; display: string }[]; // Full v=full may include this summary
}

async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch visit history: HTTP ${response.status}.`);
}


export async function getPatientVisitHistory(patientUuid: string): Promise<Visit[]> {
    if (!patientUuid) {
        console.error("Patient UUID is required to fetch visit history.");
        return [];
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }

    const url = `${process.env.OPENMRS_API_URL}/visit?patient=${patientUuid}&includeInactive=true&v=full`;

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'no-store' 
        });

        if (!response.ok) {
            await handleApiError(response, "getPatientVisitHistory");
            return [];
        }

        const data: { results: Visit[] } = await response.json();
        
        return Array.isArray(data.results) ? data.results : [];

    } catch (error) {
        console.error('Final error in getPatientVisitHistory:', error);
        return [];
    }
}