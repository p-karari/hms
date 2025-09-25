'use server';

import { redirectToLogin, getAuthHeaders } from '../auth/auth';

export interface Patient {
  uuid: string;
  display: string;
  gender: string;
  birthdate: string;
  identifiers: { identifier: string; identifierType: string }[];
  // Add other fields you need
}

/**
 * Fetches all patients or optionally filtered by search query.
 * @param search Optional search string to filter patients by name or identifier
 * @param limit Optional number of patients to return (default 50)
 */
export async function getPatients(search?: string, limit: number = 50): Promise<Patient[]> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return [];
  }

  try {
    const queryParams = new URLSearchParams();
    queryParams.set('v', 'full'); // fetch full patient details
    queryParams.set('limit', limit.toString());
    if (search) queryParams.set('q', search);

    const res = await fetch(`${process.env}/ws/rest/v1/patient?${queryParams.toString()}`, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      console.error(`Failed to fetch patients: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    return (data.results || []) as Patient[];
  } catch (error) {
    console.error('Error fetching patients:', error);
    return [];
  }
}
