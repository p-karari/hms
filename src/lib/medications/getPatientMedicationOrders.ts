'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
export interface ConceptReference {
    uuid: string;
    display: string;
}

export interface DrugOrder {
    uuid: string;
    display: string;
    action: 'NEW' | 'REVISE' | 'DISCONTINUE' | 'RENEW';
    
    patient: ConceptReference; 
    orderer: { uuid: string; display: string; person: { display: string } };
    concept: ConceptReference;
    drug: { uuid: string; display: string; strength: string };

    dateActivated: string;
    dateStopped: string | null;

    dose: number;
    doseUnits: ConceptReference;      
    route: ConceptReference;           
    frequency: ConceptReference;       
    
    duration: number;
    durationUnits: ConceptReference;   
    
    quantity: number;
    quantityUnits: ConceptReference;   
    
    instructions?: string;
}

async function handleApiError(response: Response) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch orders data: HTTP ${response.status}.`);
}


export async function getPatientMedicationOrders(patientUuid: string): Promise<DrugOrder[]> {
    if (!patientUuid) {
        console.error("Patient UUID is required to fetch medication orders.");
        return [];
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }
    
    const url = `${process.env.OPENMRS_API_URL}/order?t=drugorder&patient=${patientUuid}&v=full`;

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'no-store' 
        });

        if (!response.ok) {
            await handleApiError(response);
            return [];
        }

        const data: { results: DrugOrder[] } = await response.json();
        
        return data.results || [];

    } catch (error) {
        console.error("Final error in getPatientMedicationOrders:", error);
        return [];
    }
}