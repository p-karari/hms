'use server';

import { getAuthHeaders, redirectToLogin } from '../auth/auth';

export interface Patient {
  uuid: string;
  display: string;
  gender: string;
  birthdate: string;
  identifiers: { identifier: string; identifierType: string }[];
}

export async function getPatientByIds(uuids: string[]): Promise<Patient[]> {
  if (!uuids || uuids.length === 0) return [];

  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return [];
  }

  try {
    const patients: Patient[] = [];

    for (const uuid of uuids) {
      const res = await fetch(`${process.env.OPENMRS_API_URL}/patient/${uuid}`, {
        method: 'GET',
        headers,
      });

      if (!res.ok) {
        console.error(`Failed to fetch patient ${uuid}: ${res.status} ${res.statusText}`);
        continue;
      }

      const data = await res.json();
      patients.push(data as Patient);
    }

    return patients;
  } catch (error) {
    console.error('Error fetching patients by UUIDs:', error);
    return [];
  }
}
