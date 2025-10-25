'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { getCareSettingUuid } from '../config/careSetting';
import { getOrderTypeUuid } from '../config/orderType';
import { SessionContextType } from '../context/session-context';
import { DOSING_TYPE } from '../config/openmrsConfig';
// import { SessionContextType } from '@/components/context/SessionContext';
// import { getCareSettingUuid } from '@/config/careSetting';
// import { getOrderTypeUuid } from '@/config/orderType';
// import { DOSING_TYPE } from '@/lib/config/openmrsConfig'; 

// --- Interface for Incoming Form Data ---
export interface AmendOrderData {
    patientUuid: string;
    previousOrderUuid: string; // The UUID of the order being amended/revised
    instructions: string; // New instructions/reason for revision
    conceptUuid: string; 
    drugUuid: string;
    dose: number; // The NEW dose
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

/**
 * Amends (revises) an existing active drug order.
 * @param data - Order details, including the active order UUID and revised fields.
 * @param sessionData - Context data for the orderer/provider.
 * @returns A promise that resolves to the UUID of the newly created (revised) order.
 */
export async function amendDrugOrder(data: AmendOrderData, sessionData: SessionContextType): Promise<string> {
    if (!sessionData.isAuthenticated || !sessionData.user.uuid) {
        throw new Error("User must be authenticated to amend an order.");
    }

    // 1. Fetch Configuration UUIDs
    const [orderTypeUuid, careSettingUuid] = await Promise.all([
        getOrderTypeUuid('Drug Order'),
        getCareSettingUuid('Outpatient'), 
    ]);

    const nowISO = new Date().toISOString();
    const ordererUuid = sessionData.user.uuid;
    
    // 2. Construct the Payload
    const payload = {
        "type": "drugorder",
        "patient": data.patientUuid,
        "action": "REVISE", // Key difference: REVISE action
        "previousOrder": data.previousOrderUuid,
        "orderer": ordererUuid,
        "careSetting": careSettingUuid,
        "orderType": orderTypeUuid,
        "dateActivated": nowISO,
        "instructions": data.instructions,

        "concept": data.conceptUuid, 
        "drug": data.drugUuid, 
        "dosingType": DOSING_TYPE,
        "dose": data.dose, // The revised value
        "doseUnits": data.doseUnitsConceptUuid,
        "route": data.routeConceptUuid,
        "frequency": data.frequencyConceptUuid,
        "duration": data.duration,
        "durationUnits": data.durationUnitsConceptUuid,
        "quantity": data.quantity,
        "quantityUnits": data.quantityUnitsConceptUuid,
    };

    // 3. Submit the POST Request
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