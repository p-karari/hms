'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';

// --- Interface for the payload sent to the API ---
export interface NewOrderSubmissionData {
    patientUuid: string;
    conceptUuid: string; // The specific test, procedure, or consult being ordered
    orderType: 'testorder' | 'radiologyorder' | 'procedureorder' | 'generalorder';
    
    // Core Order Fields
    dateActivated?: string; // Optional: Defaults to "now" if not supplied
    instructions?: string;  // Instructions for the fulfiller/lab
    encounterUuid: string;  // UUID of the current encounter (REQUIRED by OpenMRS for most orders)
    
    // Optional details specific to Lab/Imaging
    specimenSourceUuid?: string; // e.g., for lab tests
    urgency?: 'ROUTINE' | 'STAT' | 'ASAP';
}

// --- Helper for API Error Checking (Matching your structure) ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to submit new order: HTTP ${response.status}.`);
}

/**
 * Submits a new non-medication clinical order (Lab, Radiology, Procedure) 
 * via a POST request to the OpenMRS /order endpoint.
 *
 * @param submissionData The structured data for the new order.
 * @returns A promise that resolves when the order is successfully created.
 */
export async function submitNewClinicalOrder(submissionData: NewOrderSubmissionData): Promise<void> {
    const { patientUuid, conceptUuid, orderType, encounterUuid, instructions, specimenSourceUuid, urgency } = submissionData;

    if (!patientUuid || !conceptUuid || !orderType || !encounterUuid) {
        throw new Error("Missing required fields (patientUuid, conceptUuid, orderType, encounterUuid) for order submission.");
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        throw new Error("Authentication failed during order submission.");
    }

    // --- Construct the OpenMRS Order Payload ---
    const payload = {
        type: orderType, 
        patient: patientUuid,
        concept: conceptUuid,
        encounter: encounterUuid,
        action: "NEW", // Always NEW for creation
        urgency: urgency || 'ROUTINE',
        instructions: instructions || null,
        
        // Conditional fields specific to order types (e.g., TestOrder)
        ...(orderType === 'testorder' && {
            specimenSource: specimenSourceUuid || null,
            // You may need to add additional test-specific fields here (e.g., frequency/schedule)
        }),
        
        // Add other order-type specific properties for Radiology/Procedure if necessary
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
            await handleApiError(response, "submitNewClinicalOrder");
        }

        // Successfully submitted (response status 201 Created)
    } catch (error) {
        console.error("Final network error submitting order:", error);
        throw new Error("Network or unexpected error during order submission.");
    }
}