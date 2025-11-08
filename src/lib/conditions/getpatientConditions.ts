'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';

// --- Concept Reference Type (Retained for completeness) ---
export interface ConceptReference {
    uuid: string;
    display: string;
}

// --- Condition Interface (Retained as your target FHIR-like structure) ---
export interface Condition {
    uuid: string;
    patient: { uuid: string };
    
    // Diagnosis concept
    code: {
        coding: Array<{
            system?: string;
            code?: string;
            display: string;
        }>;
    };

    clinicalStatus: 'active' | 'inactive' | 'resolved' | string;
    verificationStatus?: 'confirmed' | 'unconfirmed' | 'provisional' | string;

    onsetDateTime: string | null;
    abatementDateTime: string | null;

    encounter?: { uuid: string } | null;
}

// --- Helper for API Error Handling (Retained) ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        // Use a standard error message before redirecting
        console.error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch patient conditions: HTTP ${response.status}.`);
}

/**
 * Fetch all clinical conditions (active and resolved) for a patient using the FHIR R4 endpoint.
 * Maps FHIR Condition resources found in a Bundle to the target Condition structure.
 */
export async function getPatientConditions(patientUuid: string): Promise<Condition[]> {
    if (!patientUuid) {
        console.error("Patient UUID is required to fetch conditions.");
        return [];
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }

    // 🎯 REVISED ROUTE: Using the confirmed working FHIR endpoint.
    // We use the patient query parameter directly on the FHIR Condition resource.
    const url = `${process.env.OPENMRS_API_URL_ALT}/Condition?patient=${patientUuid}&_count=100`;

    try {
        const response = await fetch(url, {
            headers,
            cache: 'no-store',
        });

        if (!response.ok) {
            await handleApiError(response, "getPatientConditions (FHIR)");
            return [];
        }

        // The response is a FHIR Bundle object.
        const bundle: { resourceType: 'Bundle'; entry: Array<{ resource: any }> } = await response.json();
        
        // Count FHIR resources that are actually Conditions.
        const fhirConditionEntries = (bundle.entry || [])
            .filter(e => e.resource && e.resource.resourceType === 'Condition');

        console.log(`FHIR API returned ${fhirConditionEntries.length} Condition records.`);

        const conditions: Condition[] = fhirConditionEntries.map(entry => {
                const c = entry.resource;
                
                // 🔑 MAPPING FHIR FIELDS TO TARGET INTERFACE:
                // FHIR 'id' is used as OpenMRS UUID.
                const conditionUuid = c.id; 
                
                // clinicalStatus and code map directly to the target structure.
                const clinicalStatus = c.clinicalStatus?.coding?.[0]?.code?.toLowerCase() || 'unknown';

                // FHIR uses 'onsetDateTime' and 'abatementDateTime' directly.
                const onsetDateTime = c.onsetDateTime || null;
                const abatementDateTime = c.abatementDateTime || c.abatementString || null;
                
                // FHIR R4 Condition does not have a standard 'verificationStatus', but 
                // we can map 'code' and 'display' from the coding array.
                const coding = c.code?.coding?.map((codingItem: any) => ({
                    system: codingItem.system,
                    code: codingItem.code,
                    display: codingItem.display,
                })) || [];
                
                // FHIR 'subject' field provides the patient UUID (e8c6b2bc-...)
                const patientReference = c.subject?.reference?.split('/').pop() || patientUuid;

                // FHIR 'encounter' field provides the encounter reference (Encounter/uuid)
                const encounterUuid = c.encounter?.reference?.split('/').pop();

                return {
                    uuid: conditionUuid,
                    patient: { uuid: patientReference },
                    code: { coding: coding },
                    clinicalStatus: clinicalStatus,
                    verificationStatus: c.verificationStatus?.coding?.[0]?.code?.toLowerCase(), // If present
                    onsetDateTime: onsetDateTime,
                    abatementDateTime: abatementDateTime, 
                    encounter: encounterUuid ? { uuid: encounterUuid } : null,
                };
            });
            
        return conditions;

    } catch (error) {
        console.error('Final error in getPatientConditions (Re-throwing):', error);
        throw new Error("Condition fetch failed due to an unexpected error during communication or parsing.");
    }
}