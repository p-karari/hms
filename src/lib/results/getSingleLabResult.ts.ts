'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { LabResult } from './getPatientLabResults'; // Reusing the defined LabResult interface

// --- Helper for API Error Checking (Matching your structure) ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch observation data for ${source}: HTTP ${response.status}.`);
}

/**
 * Fetches the full details of a single Observation (Lab Result) by its UUID.
 * * @param obsUuid The UUID of the specific Observation to fetch.
 * @returns A promise that resolves to a single, simplified LabResult object, or null.
 */
export async function getSingleLabResult(obsUuid: string): Promise<LabResult | null> {
    if (!obsUuid) {
        console.error("Observation UUID is required to fetch details.");
        return null;
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return null;
    }

    // Use v=full to ensure we get all nested concept and value details
    const url = `${process.env.OPENMRS_API_URL}/obs/${obsUuid}?v=full`;

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'no-store' // Result details should be current
        });

        if (!response.ok) {
            await handleApiError(response, `getSingleLabResult: ${obsUuid}`);
            return null;
        }

        const obs: any = await response.json();
        
        // --- Mapping Logic (Similar to getPatientLabResults) ---
        const numericValue = typeof obs.value === 'number' ? obs.value : null;
        const textValue = typeof obs.value === 'string' ? obs.value : obs.valueCodedName || null;
        
        return {
            uuid: obs.uuid,
            display: obs.display, 
            concept: { uuid: obs.concept.uuid, display: obs.concept.display },
            obsDatetime: obs.obsDatetime,
            
            value: numericValue !== null ? numericValue : textValue,
            valueNumeric: numericValue,
            valueText: textValue,
            
            interpretation: obs.interpretation as LabResult['interpretation'] || null, 
            encounterUuid: obs.encounter?.uuid || 'N/A',
        } as LabResult;

    } catch (error) {
        console.error("Final error in getSingleLabResult:", error);
        return null;
    }
}