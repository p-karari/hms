'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';

// --- Interface for New Condition Submission ---
// NOTE: recorderUuid is used in the client, but it holds the Encounter UUID.
export interface NewConditionSubmissionData {
  patientUuid: string;
  conditionConceptUuid: string; // UUID of the diagnosis concept
  conditionDisplay: string;     // Display text of the condition (Used for display only)
  clinicalStatus: 'active' | 'inactive';
  onsetDate: string;            // ISO format
  recorderUuid: string;         // Holds the Encounter UUID from the client component
}

// --- Interface for Updating Condition ---
export interface UpdateConditionData {
  conditionUuid: string;
  clinicalStatus: 'active' | 'inactive' | 'resolved';
  endDate?: string;
}

// --- Helper ---
async function handleApiError(response: Response, source: string) {
  if (response.status === 401 || response.status === 403) {
    redirectToLogin();
    throw new Error(`Authentication failed: HTTP ${response.status}`);
  }
  const text = await response.text();
  console.error(`OpenMRS API Error [${source}] ${response.status}: ${text.substring(0, 100)}`);
  throw new Error(`Failed: HTTP ${response.status}`);
}

// --- Create Condition ---
export async function createPatientCondition(data: NewConditionSubmissionData) {
  const headers = await getAuthHeaders().catch(() => {
    redirectToLogin();
    throw new Error("Authentication failed during condition creation.");
  });

  const payload = {
    patient: data.patientUuid,
    condition: data.conditionConceptUuid,
    
    onsetDate: data.onsetDate, 

    // FIX: Changed 'status' to 'clinicalStatus' to match the OpenMRS API
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

// --- Update Condition ---
// export async function updatePatientCondition(data: UpdateConditionData) {
//   const headers = await getAuthHeaders().catch(() => {
//     redirectToLogin();
//     throw new Error("Authentication failed during condition update.");
//   });

//   const payload: any = {
//     // Applying the same fix to the update payload
//     conditionStatus: data.clinicalStatus.toUpperCase(),
//   };

//   if (data.endDate && data.clinicalStatus === 'resolved') {
//       payload.dateResolved = data.endDate; 
//   }

//   const url = `${process.env.OPENMRS_API_URL}/condition/${data.conditionUuid}`;

//   const response = await fetch(url, {
//     method: 'POST', 
//     headers: { ...headers, 'Content-Type': 'application/json' },
//     body: JSON.stringify(payload)
//   });

//   if (!response.ok) await handleApiError(response, `updatePatientCondition (${data.conditionUuid})`);
// }

