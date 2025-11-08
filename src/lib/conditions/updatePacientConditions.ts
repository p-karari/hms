'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
async function handleApiError(response: Response, source: string) {
  if (response.status === 401 || response.status === 403) {
    redirectToLogin();
    throw new Error(`Authentication failed: HTTP ${response.status}`);
  }
  const text = await response.text();
  console.error(`OpenMRS API Error [${source}] ${response.status}: ${text.substring(0, 100)}`);
  throw new Error(`Failed: HTTP ${response.status}`);
}
// --- Update Data Interface ---
export interface UpdateConditionData {
    conditionUuid: string;
    clinicalStatus: 'active' | 'resolved'; // Simplified for this update
    endDate?: string | null; // Used only when status is 'resolved'
}

/**
 * Update a patient condition's clinical status using the FHIR R4 API (PUT method).
 * * @param data - Contains the UUID of the condition and the new status/end date.
 */
export async function updatePatientCondition(data: UpdateConditionData): Promise<void> {
    const headers = await getAuthHeaders().catch(() => {
        redirectToLogin();
        throw new Error("Authentication failed during condition update.");
    });

    const fhirConditionUrl = `${process.env.OPENMRS_API_URL_ALT}/Condition/${data.conditionUuid}`;

    // --- Step 1: GET the existing FHIR Condition resource ---
    const getResponse = await fetch(fhirConditionUrl, {
        method: 'GET',
        headers,
    });
    
    if (!getResponse.ok) {
        await handleApiError(getResponse, `getConditionForUpdate (${data.conditionUuid})`);
        return; // Stop if we can't fetch the current resource
    }

    const currentConditionResource: any = await getResponse.json();
    
    // --- Step 2: Apply the updates to the resource ---
    const newClinicalStatusCode = data.clinicalStatus.toLowerCase();
    
    // FHIR clinicalStatus uses a Coding concept
    const newClinicalStatus = {
        coding: [{
            system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
            code: newClinicalStatusCode
        }]
    };
    
    // Apply status change
    currentConditionResource.clinicalStatus = newClinicalStatus;

    // Apply resolution date if status is 'resolved'
    if (newClinicalStatusCode === 'resolved' && data.endDate) {
        // FHIR uses 'abatementDateTime' for the resolution date
        currentConditionResource.abatementDateTime = data.endDate;
    } else if (newClinicalStatusCode !== 'resolved') {
        // Ensure abatementDateTime is cleared if the condition becomes active/inactive
        delete currentConditionResource.abatementDateTime;
    }

    // --- Step 3: PUT the full, updated resource back ---
    const updateResponse = await fetch(fhirConditionUrl, {
        method: 'PUT', // PUT is required for updating (replacing) a resource
        headers: { 
            ...headers, 
            'Content-Type': 'application/fhir+json', // Use FHIR specific content type
        },
        body: JSON.stringify(currentConditionResource)
    });

    if (!updateResponse.ok) {
        // Handle error if the PUT fails
        await handleApiError(updateResponse, `updatePatientCondition (PUT ${data.conditionUuid})`);
    } else {
        console.log(`Successfully updated condition ${data.conditionUuid} to ${newClinicalStatusCode}.`);
    }
}