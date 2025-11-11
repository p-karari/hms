'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; 

export interface AllergyAlert {
    uuid: string;
    display: string;
    patient: { uuid: string };
    allergen: {
        coded: { uuid: string; display: string };
    };
    reaction: { concept: { uuid: string; display: string } }[];
    severity: string;
}

async function handleApiError(response: Response) {
    if (response.status === 404 || response.status === 400) {
        console.warn(`Allergy module endpoint not found or disabled. Status: ${response.status}`);
        return [];
    }
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error ${response.status}: ${errorText.substring(0, 500)}`);
    throw new Error(`Failed to fetch allergy data: HTTP ${response.status}.`);
}


export async function getAllergyAndInteractionAlerts(patientUuid: string): Promise<AllergyAlert[]> {
    if (!patientUuid) {
        console.error("Patient UUID is required to fetch allergy alerts.");
        return [];
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }
    
    const url = `${process.env.OPENMRS_API_URL}/allergyintolerance?patient=${patientUuid}&v=full`;

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'no-store'
        });

        if (!response.ok) {
            const failureResponse = await handleApiError(response);
            if (Array.isArray(failureResponse)) return failureResponse; 
        }

        const data: { results: AllergyAlert[] } = await response.json();
        

        return data.results || [];

    } catch (error) {
        console.error("Final error in getAllergyAndInteractionAlerts:", error);
        return [];
    }
}