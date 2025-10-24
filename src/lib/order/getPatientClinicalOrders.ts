'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { ConceptReference } from '@/lib/medications/getPatientMedicationOrders'; // Reusing your existing reference type

// --- Interface for a Non-Drug Clinical Order (Base on DrugOrder but simplified) ---
export interface ClinicalOrder {
    uuid: string;
    display: string;
    
    // Order Type (Crucial for filtering and display)
    type: 'TestOrder' | 'RadiologyOrder' | 'ProcedureOrder' | 'GeneralOrder';
    action: 'NEW' | 'REVISE' | 'DISCONTINUE' | 'RENEW';
    
    // Core References
    patient: ConceptReference;
    orderer: { uuid: string; display: string; person: { display: string } };
    concept: ConceptReference; // The concept being ordered (e.g., 'CBC', 'CT Scan')

    // Timing
    dateActivated: string;
    dateStopped: string | null;
    
    // Status/Fulfillment (This is often inferred or found in a nested property)
    status: 'ACTIVE' | 'DISCONTINUED' | 'COMPLETED' | 'DUE';

    // Instructions/Details (specific to the order type)
    instructions?: string;
}

// --- Helper for API Error Checking (Matching your structure) ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch orders data for ${source}: HTTP ${response.status}.`);
}

/**
 * Fetches the patient's entire non-medication clinical order history.
 * Fetches all order types *except* drug orders.
 * * @param patientUuid The UUID of the patient whose orders are being fetched.
 * @returns A promise that resolves to an array of ClinicalOrder objects.
 */
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
    
    // The OpenMRS REST API allows fetching all order types except DrugOrder (t=drugorder)
    // We use v=full to ensure we get nested details like concept and orderer information.
    const url = `${process.env.OPENMRS_API_URL}/order?patient=${patientUuid}&v=full`; 
    // NOTE: If your API only returns drug orders by default, you may need to append &t=testorder,radiologyorder,procedureorder

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'no-store' // Clinical orders must always be fresh
        });

        if (!response.ok) {
            await handleApiError(response, "getPatientClinicalOrders");
            return [];
        }

        const data: { results: any[] } = await response.json();
        
        // Filter out Drug Orders and map to our simplified ClinicalOrder interface
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
                
                // Status is often derived from dateStopped or a status field if available
                status: order.dateStopped 
                        ? 'DISCONTINUED' 
                        : (order.fulfillerStatus === 'RECEIVED' || order.fulfillerStatus === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE'), // Simplified status
                        
                instructions: order.instructions || order.comment,
            }));
        
        return clinicalOrders;

    } catch (error) {
        console.error("Final error in getPatientClinicalOrders:", error);
        return [];
    }
}