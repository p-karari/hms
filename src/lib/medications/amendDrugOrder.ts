'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { getCareSettingUuid } from '../config/careSetting';
import { getOrderTypeUuid } from '../config/orderType';
import { SessionContextType } from '../context/session-context';
import { DOSING_TYPE } from '../config/openmrsConfig';


// --- Interface for Incoming Form Data ---
export interface AmendOrderData {
    patientUuid: string;
    previousOrderUuid: string; 
    instructions: string; 
    conceptUuid: string; 
    drugUuid: string;
    dose: number; 
    doseUnitsConceptUuid: string;
    routeConceptUuid: string;
    frequencyConceptUuid: string;
    duration: number;
    durationUnitsConceptUuid: string;
    quantity: number;
    quantityUnitsConceptUuid: string;
}

// --- Helper for API Error Checking ---
async function handleApiError(response: Response) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }
    const errorText = await response.text();
    console.error(`OpenMRS API Error ${response.status}: ${errorText.substring(0, 500)}`);
    throw new Error(`Failed to amend drug order: HTTP ${response.status}.`);
}


export async function amendDrugOrder(data: AmendOrderData, sessionData: SessionContextType): Promise<string> {
    if (!sessionData.isAuthenticated || !sessionData.user.uuid) {
        throw new Error("User must be authenticated to amend an order.");
    }

    const [orderTypeUuid, careSettingUuid] = await Promise.all([
        getOrderTypeUuid('Drug Order'),
        getCareSettingUuid('Outpatient'), 
    ]);

    const nowISO = new Date().toISOString();
    const ordererUuid = sessionData.user.uuid;
    
    const payload = {
        "type": "drugorder",
        "patient": data.patientUuid,
        "action": "REVISE", 
        "previousOrder": data.previousOrderUuid,
        "orderer": ordererUuid,
        "careSetting": careSettingUuid,
        "orderType": orderTypeUuid,
        "dateActivated": nowISO,
        "instructions": data.instructions,

        "concept": data.conceptUuid, 
        "drug": data.drugUuid, 
        "dosingType": DOSING_TYPE,
        "dose": data.dose, 
        "doseUnits": data.doseUnitsConceptUuid,
        "route": data.routeConceptUuid,
        "frequency": data.frequencyConceptUuid,
        "duration": data.duration,
        "durationUnits": data.durationUnitsConceptUuid,
        "quantity": data.quantity,
        "quantityUnits": data.quantityUnitsConceptUuid,
    };

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
        headers['Content-Type'] = 'application/json';
    } catch {
        redirectToLogin();
        throw new Error("Authentication failed during order amendment.");
    }

    const url = `${process.env.OPENMRS_API_URL}/order`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            cache: 'no-store'
        });

        if (response.status !== 201) { 
            await handleApiError(response);
        }

        const newOrderData: { uuid: string } = await response.json();
        return newOrderData.uuid;

    } catch (error) {
        console.error('Final error in amendDrugOrder:', error);
        throw new Error("Failed to finalize medication order amendment.");
    }
}