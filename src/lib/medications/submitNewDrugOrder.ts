'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { getConceptUuid } from '../config/concept'; // Still used for duration units
import { SessionContextType } from '../context/session-context';
import { getPatientActiveVisit } from '../visits/getActiveVisit';
import { getEncounterTypeUuid } from '../encounters/encounterType';
import { getEncounterRoleUuid } from '../encounters/encounterRole';
// Import new or existing helper functions for CareSetting and OrderType
import { getOrderTypeUuid } from '../config/orderType'; 
import { getCareSettingUuid } from '../config/careSetting'; 

// --- UPDATED Interface for Incoming Form Data (Receives UUIDs directly) ---
export interface NewOrderFormData {
    patientUuid: string;
    drugUuid: string; 
    conceptUuid: string; 
    dose: number;
    doseUnitsConceptUuid: string; // 🎯 Change: Now accepts UUID
    routeConceptUuid: string; // 🎯 Change: Now accepts UUID
    frequencyConceptUuid: string; // 🎯 Change: Now accepts UUID
    duration: number;
    // NOTE: Sending the name 'Days' to get the UUID, or accepting the UUID for 'Days' is needed here.
    // For simplicity, we will search for 'Days' UUID below, but you could also pass it from the form.
    quantity: number;
    quantityUnitsConceptUuid: string; // 🎯 Change: Now accepts UUID
    instructions: string;
}

// --- Helper for API Error Checking ---
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
 * Submits a new drug order to the OpenMRS API.
 * @param formData - The data from the client-side prescription form (now contains direct UUIDs).
 * @param sessionData - The necessary context data (user, location) from the SessionContext.
 * @returns A promise that resolves to the UUID of the newly created order.
 */
export async function submitNewDrugOrder(formData: NewOrderFormData, sessionData: SessionContextType): Promise<string> {
    if (!sessionData.isAuthenticated || !sessionData.user.uuid) {
        throw new Error("User must be authenticated to place an order.");
    }

    // 1. Fetch Dynamic Contexts
    const activeVisit = await getPatientActiveVisit(formData.patientUuid);
    if (!activeVisit) {
        throw new Error("Cannot place order: Patient does not have an active visit.");
    }
    
    // 2. Fetch Configuration UUIDs (Dynamically, eliminating all hardcoded values)
    const [
        encounterTypeUuid,
        encounterRoleUuid,
        orderTypeUuid, // 🎯 Dynamically fetched
        careSettingUuid, // 🎯 Dynamically fetched
        durationUnitsUuid // 🎯 Dynamically fetched
    ] = await Promise.all([
        getEncounterTypeUuid('Vitals'), 
        getEncounterRoleUuid('Clinician'),
        getOrderTypeUuid('Drug Order'), // Assume helper exists to search /ordertype?q=Drug Order
        getCareSettingUuid('Outpatient'), // Assume helper exists to search /caresetting?q=Outpatient
        getConceptUuid('Days') // Searching for the 'Days' concept UUID for duration units
    ]);
    
    // 3. Construct the Payload
    const nowISO = new Date().toISOString();
    const ordererUuid = sessionData.user.uuid;
    const locationUuid = sessionData.sessionLocation.uuid;

    const payload = {
        "type": "drugorder",
        "patient": formData.patientUuid,
        "concept": formData.conceptUuid,
        "drug": formData.drugUuid, 
        "orderer": ordererUuid,
        "careSetting": careSettingUuid, // 🎯 Now dynamic
        "orderType": orderTypeUuid, // 🎯 Now dynamic
        "action": "NEW",
        
        "encounter": {
            "patient": formData.patientUuid,
            "encounterType": encounterTypeUuid,
            "visit": activeVisit.uuid,
            "location": locationUuid,
            "encounterDatetime": nowISO,
            "encounterProviders": [ 
                {
                    "provider": ordererUuid,
                    "encounterRole": encounterRoleUuid
                }
            ]
        },

        // Dosing Details (UUIDs come directly from form data, eliminating lookup errors)
        "dosingType": "org.openmrs.SimpleDosingInstructions", // 🎯 String constant, as discussed
        "dose": formData.dose,
        "doseUnits": formData.doseUnitsConceptUuid,
        "route": formData.routeConceptUuid,
        "frequency": formData.frequencyConceptUuid,
        "duration": formData.duration,
        "durationUnits": durationUnitsUuid, // 🎯 Now dynamic
        "quantity": formData.quantity,
        "quantityUnits": formData.quantityUnitsConceptUuid,
        "instructions": formData.instructions,
        "dateActivated": nowISO
    };

    // 4. Submit the POST Request
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