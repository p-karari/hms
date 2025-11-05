'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { getConceptUuid } from '../config/concept';
import { SessionContextType } from '../context/session-context';
import { getPatientActiveVisit } from '../visits/getActiveVisit';
import { getEncounterTypeUuid } from '../encounters/encounterType';
import { getEncounterRoleUuid } from '../encounters/encounterRole';
import { getOrderTypeUuid } from '../config/orderType';
import { getCareSettingUuid } from '../config/careSetting';
import { getActiveEncounterUuid } from '../encounters/getActiveEncounterUuid'; // ✅ new import

// --- Interface for Form Data ---
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
}

// --- Helper for API Error Handling ---
async function handleApiError(response: Response) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error ${response.status}: ${errorText.substring(0, 500)}`);
    throw new Error(`Failed to submit drug order: HTTP ${response.status}.`);
}

/**
 * Submits a new drug order linked to an active encounter (if available).
 */
export async function submitNewDrugOrder(formData: NewOrderFormData, sessionData: SessionContextType): Promise<string> {
    if (!sessionData.isAuthenticated || !sessionData.user.uuid) {
        throw new Error("User must be authenticated to place an order.");
    }

    // 1️⃣ Fetch patient visit + encounter context
    const [activeVisit, activeEncounterUuid] = await Promise.all([
        getPatientActiveVisit(formData.patientUuid),
        getActiveEncounterUuid(formData.patientUuid)
    ]);

    if (!activeVisit) {
        throw new Error("Cannot place order: Patient does not have an active visit.");
    }

    if (!activeEncounterUuid) {
        throw new Error("Cannot place order: No active encounter found for this patient.");
    }

    // 2️⃣ Fetch dynamic configuration UUIDs
    const [
        // encounterTypeUuid,
        // encounterRoleUuid,
        orderTypeUuid,
        careSettingUuid,
        durationUnitsUuid
    ] = await Promise.all([
        getEncounterTypeUuid('Vitals'),
        getEncounterRoleUuid('Clinician'),
        getOrderTypeUuid('Drug Order'),
        getCareSettingUuid('Outpatient'),
        getConceptUuid('Days')
    ]);

    // 3️⃣ Construct payload using existing encounter UUID
    const nowISO = new Date().toISOString();
    const ordererUuid = sessionData.user.uuid;
    // const locationUuid = sessionData.sessionLocation.uuid;

    const payload = {
        type: "drugorder",
        patient: formData.patientUuid,
        concept: formData.conceptUuid,
        drug: formData.drugUuid,
        orderer: ordererUuid,
        careSetting: careSettingUuid,
        orderType: orderTypeUuid,
        action: "NEW",
        encounter: activeEncounterUuid, // ✅ Use existing encounter UUID instead of full object

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
        dateActivated: nowISO
    };

    // 4️⃣ Submit to OpenMRS
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
