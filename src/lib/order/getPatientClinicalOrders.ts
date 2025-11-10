'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { ConceptReference } from '@/lib/medications/getPatientMedicationOrders'; 

export interface ClinicalOrder {
    uuid: string;
    display: string;
    
    type: 'TestOrder' | 'RadiologyOrder' | 'ProcedureOrder' | 'GeneralOrder';
    action: 'NEW' | 'REVISE' | 'DISCONTINUE' | 'RENEW';
    
    patient: ConceptReference;
    orderer: { uuid: string; display: string; person: { display: string } };
    concept: ConceptReference; 

    dateActivated: string;
    dateStopped: string | null;
    
    status: 'ACTIVE' | 'DISCONTINUED' | 'COMPLETED' | 'DUE';

    instructions?: string;
}

async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch orders data for ${source}: HTTP ${response.status}.`);
}


export async function getPatientClinicalOrders(patientUuid: string): Promise<ClinicalOrder[]> {
    if (!patientUuid) {
        console.error("Patient UUID is required to fetch clinical orders.");
        return [];
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }
    
    const url = `${process.env.OPENMRS_API_URL}/order?patient=${patientUuid}&v=full`; 

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'no-store' 
        });

        if (!response.ok) {
            await handleApiError(response, "getPatientClinicalOrders");
            return [];
        }

        const data: { results: any[] } = await response.json();
        
        const clinicalOrders: ClinicalOrder[] = data.results
            .filter(order => order.type !== 'DrugOrder')
            .map(order => ({
                uuid: order.uuid,
                display: order.display,
                type: order.type as ClinicalOrder['type'],
                action: order.action as ClinicalOrder['action'],
                
                patient: order.patient,
                orderer: order.orderer,
                concept: order.concept,
                
                dateActivated: order.dateActivated,
                dateStopped: order.dateStopped,
                
                status: order.dateStopped || order.action === 'DISCONTINUE'
                        ? 'DISCONTINUED' 
                        : (order.fulfillerStatus === 'RECEIVED' || order.fulfillerStatus === 'COMPLETED' 
                            ? 'COMPLETED' 
                            : 'ACTIVE'), 
                        
                instructions: order.instructions || order.comment,
            }));
        
        return clinicalOrders;

    } catch (error) {
        console.error("Final error in getPatientClinicalOrders:", error);
        return [];
    }
}