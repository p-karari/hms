'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';

export interface ConceptReference {
    uuid: string;
    display: string;
}

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

        const bundle: { resourceType: 'Bundle'; entry: Array<{ resource: any }> } = await response.json();
        
        const fhirConditionEntries = (bundle.entry || [])
            .filter(e => e.resource && e.resource.resourceType === 'Condition');

        console.log(`FHIR API returned ${fhirConditionEntries.length} Condition records.`);

        const conditions: Condition[] = fhirConditionEntries.map(entry => {
                const c = entry.resource;

                const conditionUuid = c.id; 
                
                const clinicalStatus = c.clinicalStatus?.coding?.[0]?.code?.toLowerCase() || 'unknown';

                const onsetDateTime = c.onsetDateTime || null;
                const abatementDateTime = c.abatementDateTime || c.abatementString || null;
                

                const coding = c.code?.coding?.map((codingItem: any) => ({
                    system: codingItem.system,
                    code: codingItem.code,
                    display: codingItem.display,
                })) || [];
                
                const patientReference = c.subject?.reference?.split('/').pop() || patientUuid;

                const encounterUuid = c.encounter?.reference?.split('/').pop();

                return {
                    uuid: conditionUuid,
                    patient: { uuid: patientReference },
                    code: { coding: coding },
                    clinicalStatus: clinicalStatus,
                    verificationStatus: c.verificationStatus?.coding?.[0]?.code?.toLowerCase(), 
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