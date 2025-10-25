'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { SessionContextType } from '../context/session-context';
// import { SessionContextType } from '@/components/context/SessionContext';

// --- Interface for Incoming Data ---
export interface DiscontinueOrderData {
    orderUuid: string; // The UUID of the order being discontinued (used in previousOrder field)
    discontinueReason: string;
}

// --- Helper for API Error Checking ---
async function handleApiError(response: Response) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error ${response.status}: ${errorText.substring(0, 500)}`);
    throw new Error(`Failed to discontinue drug order: HTTP ${response.status}.`);
}

/**
 * Discontinues an active medication order by creating a new DISCONTINUE order.
 * @param data - Order UUID and reason for discontinuation.
 * @param sessionData - Context data for the orderer/provider.
 * @returns A promise that resolves to true upon successful discontinuation.
 */
export async function discontinueDrugOrder(data: DiscontinueOrderData, sessionData: SessionContextType): Promise<boolean> {
    if (!sessionData.isAuthenticated || !sessionData.user.uuid) {
        throw new Error("User must be authenticated to discontinue an order.");
    }

    const ordererUuid = sessionData.user.uuid;
    const nowISO = new Date().toISOString();

    // 2. Construct the Payload
    const payload = {
        "action": "DISCONTINUE", // Key action
        "previousOrder": data.orderUuid, // Reference the order to stop
        "dateStopped": nowISO,
        "orderer": ordererUuid,
        "type": "drugorder", 
        "orderReasonNonCoded": data.discontinueReason,
    };

    // 3. Submit the POST Request
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
        headers['Content-Type'] = 'application/json';
    } catch {
        redirectToLogin();
        throw new Error("Authentication failed during order discontinuation.");
    }

    const url = `${process.env.OPENMRS_API_URL}/order`; 

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            cache: 'no-store'
        });

        // The API returns 201 Created because a new order record (the discontinuation) is created
        if (response.status !== 201) { 
            await handleApiError(response);
        }

        return true;

    } catch (error) {
        console.error('Final error in discontinueDrugOrder:', error);
        return false;
    }
}