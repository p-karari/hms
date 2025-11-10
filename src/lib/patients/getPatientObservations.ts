'use server';

import { getAuthHeaders, redirectToLogin } from '../auth/auth';


export interface CodedValue {
  uuid: string;
  display: string;
}

export interface Observation {
  uuid: string;
  obsDatetime: string;
  concept: CodedValue;
  value?: string | number | boolean | CodedValue | null;
  valueNumeric?: number;
  valueText?: string;
  valueCoded?: CodedValue;
  valueDatetime?: string;
  valueBoolean?: boolean;
}


export async function getPatientObservations(patientUuid: string): Promise<Observation[]> {

  let headers: Record<string, string>;

  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return [];
  }

  const url = `${process.env.OPENMRS_API_URL}/obs?patient=${patientUuid}&v=full`;
  console.log('getPatientObservations function running, url = :', url);
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
  return data.results as Observation[];
}