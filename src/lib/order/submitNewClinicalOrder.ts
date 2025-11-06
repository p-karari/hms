'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';

// --- Interface for the payload sent to the API ---
export interface NewOrderSubmissionData {
    patientUuid: string;
    conceptUuid: string;
    orderType: 'testorder' | 'drugorder'; // Only supported types now
    dateActivated?: string;
    instructions?: string;
    encounterUuid: string;
    specimenSourceUuid?: string; // Only used for lab/test orders
    urgency?: 'Routine' | 'Stat';
}

// --- Helper for API Error Checking ---
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
 * Submits a new clinical order (drug or lab/test) to OpenMRS safely.
 * Prevents unsupported order types from being sent to the API.
 */
export async function submitNewClinicalOrder(submissionData: NewOrderSubmissionData): Promise<void> {
    const { patientUuid, conceptUuid, orderType, encounterUuid, instructions, specimenSourceUuid, urgency } = submissionData;

    if (!patientUuid || !conceptUuid || !orderType || !encounterUuid) {
        throw new Error("Missing required fields (patientUuid, conceptUuid, orderType, encounterUuid) for order submission.");
    }

    // --- Validate supported order types ---
    const supportedOrderTypes = ['testorder', 'drugorder'];
    if (!supportedOrderTypes.includes(orderType)) {
        throw new Error(`Unsupported order type "${orderType}". Only ${supportedOrderTypes.join(', ')} are allowed.`);
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        throw new Error("Authentication failed during order submission.");
    }

    // --- Construct payload ---
    const payload: Record<string, any> = {
        type: orderType,
        patient: patientUuid,
        concept: conceptUuid,
        encounter: encounterUuid,
        action: "NEW",
        urgency: urgency || 'ROUTINE',
        instructions: instructions || null,
        ...(orderType === 'testorder' && { specimenSource: specimenSourceUuid || null })
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

        // Order submitted successfully
    } catch (error) {
        console.error("Final network error submitting order:", error);
        throw new Error("Network or unexpected error during order submission.");
    }
}
