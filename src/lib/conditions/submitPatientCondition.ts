'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';


export interface NewConditionSubmissionData {
  patientUuid: string;
  conditionConceptUuid: string; 
  conditionDisplay: string;    
  clinicalStatus: 'active' | 'inactive';
  onsetDate: string;            
  recorderUuid: string;         
}

export interface UpdateConditionData {
  conditionUuid: string;
  clinicalStatus: 'active' | 'inactive' | 'resolved';
  endDate?: string;
}

async function handleApiError(response: Response, source: string) {
  if (response.status === 401 || response.status === 403) {
    redirectToLogin();
    throw new Error(`Authentication failed: HTTP ${response.status}`);
  }
  const text = await response.text();
  console.error(`OpenMRS API Error [${source}] ${response.status}: ${text.substring(0, 100)}`);
  throw new Error(`Failed: HTTP ${response.status}`);
}

export async function createPatientCondition(data: NewConditionSubmissionData) {
  const headers = await getAuthHeaders().catch(() => {
    redirectToLogin();
    throw new Error("Authentication failed during condition creation.");
  });

  const payload = {
    patient: data.patientUuid,
    condition: data.conditionConceptUuid,
    
    onsetDate: data.onsetDate, 

    clinicalStatus: data.clinicalStatus.toUpperCase(), 
  };

  const url = `${process.env.OPENMRS_API_URL}/condition`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) await handleApiError(response, 'createPatientCondition');
}
