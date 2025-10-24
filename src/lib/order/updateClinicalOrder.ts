'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';

// --- Interface for the payload sent to the API for updates ---
export interface OrderUpdateData {
    patientUuid: string;
    existingOrderUuid: string; // The UUID of the order being modified
    conceptUuid: string;       // The concept of the original order (required by OpenMRS for updates)
    orderType: 'testorder' | 'radiologyorder' | 'procedureorder' | 'generalorder';
    action: 'DISCONTINUE' | 'REVISE' | 'RENEW'; // The action to perform
    
    // Required context for the OpenMRS update mechanism
    previousOrderUuid: string; // OpenMRS requires the UUID of the order being acted upon
    encounterUuid: string;     // UUID of the current encounter
    
    // Optional details
    reasonText?: string; 
}

// --- Helper for API Error Checking (Matching your structure) ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to update order: HTTP ${response.status}.`);
}

/**
 * Updates an existing non-medication clinical order (e.g., Discontinue, Revise, or Renew) 
 * via a POST request to the OpenMRS /order endpoint.
 *
 * @param updateData The structured data for the order update.
 * @returns A promise that resolves when the order is successfully updated.
 */
export async function updateClinicalOrder(updateData: OrderUpdateData): Promise<void> {
    const { 
        patientUuid, conceptUuid, orderType, 
        action, previousOrderUuid, encounterUuid, reasonText 
    } = updateData;

    if (!patientUuid || !conceptUuid || !orderType || !encounterUuid || !previousOrderUuid) {
        throw new Error("Missing required fields for order update.");
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        throw new Error("Authentication failed during order update.");
    }

    // --- Construct the OpenMRS Order Update Payload ---
    // Note: To Discontinue/Revise, OpenMRS creates a *new* order record 
    // that references the 'previousOrder', effectively closing the old one.
    const payload = {
        type: orderType, 
        patient: patientUuid,
        concept: conceptUuid,
        encounter: encounterUuid,
        action: action, 
        previousOrder: previousOrderUuid, // Key field linking to the order being modified
        orderReasonText: reasonText || null,

        // For RENEW or REVISE actions, you might need to carry over or change fields
        // e.g., if REVISE, you'd include the revised instructions/urgency here.
    };

    const url = `${process.env.OPENMRS_API_URL}/order`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            await handleApiError(response, `updateClinicalOrder: ${action}`);
        }

        // Successfully updated (response status 201 Created)
    } catch (error) {
        console.error("Final network error updating order:", error);
        throw new Error("Network or unexpected error during order update.");
    }
}