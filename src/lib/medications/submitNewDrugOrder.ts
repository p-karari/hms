'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { getConceptUuid } from '../config/concept';
import { SessionContextType } from '../context/session-context';
import { getPatientActiveVisit } from '../visits/getActiveVisit';
import { getOrderTypeUuid } from '../config/orderType';
import { getCareSettingUuid } from '../config/careSetting';
import { createEncounter } from '../encounters/createEncounter'; 

export interface NewOrderFormData {
    patientUuid: string;
    drugUuid: string;
    conceptUuid: string;
    dose: number;
    doseUnitsConceptUuid: string;
    routeConceptUuid: string;
    frequencyConceptUuid: string;
    duration: number;
    quantity: number;
    quantityUnitsConceptUuid: string;
    instructions: string;
    numRefills?: number; 
}

async function handleApiError(response: Response) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error ${response.status}: ${errorText.substring(0, 500)}`);
    throw new Error(`Failed to submit drug order: HTTP ${response.status}.`);
}


export async function submitNewDrugOrder(
    formData: NewOrderFormData,
    sessionData: SessionContextType
): Promise<string> {
    if (!sessionData.isAuthenticated || !sessionData.user.uuid) {
        throw new Error("User must be authenticated to place an order.");
    }

    const activeVisit = await getPatientActiveVisit(formData.patientUuid);
    if (!activeVisit) {
        throw new Error("Cannot place order: Patient does not have an active visit.");
    }

    let encounterUuid: string;
    try {
        encounterUuid = await createEncounter({
            patientUuid: formData.patientUuid,
            encounterTypeName: 'Order',
            sessionData
        });
    } catch (err) {
        console.error('Encounter creation failed:', err);
        throw new Error('Failed to create encounter for drug order.');
    }

    const [orderTypeUuid, careSettingUuid, durationUnitsUuid] = await Promise.all([
        getOrderTypeUuid('Drug Order'),
        getCareSettingUuid('Outpatient'),
        getConceptUuid('Days')
    ]);

    const nowISO = new Date().toISOString();
    const ordererUuid = process.env.NEXT_PUBLIC_DEFAULT_PROVIDER_UUID;
    if (!ordererUuid) {
    throw new Error("Default provider UUID is not set in environment variables.");
    }
    const payload: Record<string, any> = {
        type: "drugorder",
        patient: formData.patientUuid,
        concept: formData.conceptUuid,
        drug: formData.drugUuid,
        orderer: ordererUuid, 
        careSetting: careSettingUuid,
        orderType: orderTypeUuid,
        action: "NEW",
        encounter: encounterUuid, 
        dosingType: "org.openmrs.SimpleDosingInstructions",
        dose: formData.dose,
        doseUnits: formData.doseUnitsConceptUuid,
        route: formData.routeConceptUuid,
        frequency: formData.frequencyConceptUuid,
        duration: formData.duration,
        durationUnits: durationUnitsUuid,
        quantity: formData.quantity,
        quantityUnits: formData.quantityUnitsConceptUuid,
        instructions: formData.instructions,
        dateActivated: nowISO,
        numRefills: formData.numRefills ?? 0 
    };

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
        headers['Content-Type'] = 'application/json';
    } catch {
        redirectToLogin();
        throw new Error("Authentication failed during order submission.");
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
        console.error('Final error in submitNewDrugOrder:', error);
        throw new Error("Failed to finalize medication order.");
    }
}
