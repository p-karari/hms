'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { SessionContextType } from '../context/session-context';

export interface DiscontinueOrderData {
    orderUuid: string; 
    discontinueReason: string;
}

async function handleApiError(response: Response) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error ${response.status}: ${errorText.substring(0, 500)}`);
    throw new Error(`Failed to discontinue drug order: HTTP ${response.status}.`);
}


export async function discontinueDrugOrder(data: DiscontinueOrderData, sessionData: SessionContextType): Promise<boolean> {
    if (!sessionData.isAuthenticated || !sessionData.user.uuid) {
        throw new Error("User must be authenticated to discontinue an order.");
    }

    const ordererUuid = sessionData.user.uuid;
    const nowISO = new Date().toISOString();

    const payload = {
        "action": "DISCONTINUE", 
        "previousOrder": data.orderUuid, 
        "dateStopped": nowISO,
        "orderer": ordererUuid,
        "type": "drugorder", 
        "orderReasonNonCoded": data.discontinueReason,
    };

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

        if (response.status !== 201) { 
            await handleApiError(response);
        }

        return true;

    } catch (error) {
        console.error('Final error in discontinueDrugOrder:', error);
        return false;
    }
}