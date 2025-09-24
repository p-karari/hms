'use server';

import { getAuthHeaders, redirectToLogin } from '../auth/auth';

// --- Type Definitions for OpenMRS Observation Values ---

// Represents a coded value (e.g., a diagnosis or a selection from a list)
export interface CodedValue {
  uuid: string;
  display: string;
}

// Observation interface with explicit value typing
export interface Observation {
  uuid: string;
  obsDatetime: string;
  concept: CodedValue;
  // OpenMRS REST can return different value types. We check for the most common ones.
  value?: string | number | boolean | CodedValue | null;
  valueNumeric?: number;
  valueText?: string;
  valueCoded?: CodedValue;
  valueDatetime?: string;
  valueBoolean?: boolean;
}

// --- Action Function ---

export async function getPatientObservations(patientUuid: string): Promise<Observation[]> {

  let headers: Record<string, string>;

  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return [];
  }

  // Using v=full to ensure we get all the value fields (valueNumeric, valueText, etc.)
  const url = `${process.env.OPENMRS_API_URL}/obs?patient=${patientUuid}&v=full`;

  const response = await fetch(url, {
      headers: {
        ...headers,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch observations: ${errorText}`);
  }

  const data = await response.json();
  // We can trust the data structure matches our interface based on the v=full response
  return data.results as Observation[];
}