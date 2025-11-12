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

export interface UpdateConditionData {
    conditionUuid: string;
    clinicalStatus: 'active' | 'resolved'; 
    endDate?: string | null; 
}

export async function updatePatientCondition(data: UpdateConditionData): Promise<void> {
    const headers = await getAuthHeaders().catch(() => {
        redirectToLogin();
        throw new Error("Authentication failed during condition update.");
    });

    const fhirConditionUrl = `${process.env.OPENMRS_API_URL_ALT}/Condition/${data.conditionUuid}`;

    const getResponse = await fetch(fhirConditionUrl, {
        method: 'GET',
        headers,
    });
    
    if (!getResponse.ok) {
        await handleApiError(getResponse, `getConditionForUpdate (${data.conditionUuid})`);
        return; 
    }

    const currentConditionResource: any = await getResponse.json();
    
    const newClinicalStatusCode = data.clinicalStatus.toLowerCase();
    
    const newClinicalStatus = {
        coding: [{
            system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
            code: newClinicalStatusCode
        }]
    };
    
    currentConditionResource.clinicalStatus = newClinicalStatus;

    if (newClinicalStatusCode === 'resolved' && data.endDate) {
        currentConditionResource.abatementDateTime = data.endDate;
    } else if (newClinicalStatusCode !== 'resolved') {
        delete currentConditionResource.abatementDateTime;
    }

    const updateResponse = await fetch(fhirConditionUrl, {
        method: 'PUT', 
        headers: { 
            ...headers, 
            'Content-Type': 'application/fhir+json', 
        },
        body: JSON.stringify(currentConditionResource)
    });

    if (!updateResponse.ok) {
        await handleApiError(updateResponse, `updatePatientCondition (PUT ${data.conditionUuid})`);
    } else {
        console.log(`Successfully updated condition ${data.conditionUuid} to ${newClinicalStatusCode}.`);
    }
}