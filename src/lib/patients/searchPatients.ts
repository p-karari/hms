'use server';

import { getAuthHeaders, redirectToLogin } from '../auth/auth';

// Simplified type for use in a list/table view
export interface ListPatient {
  uuid: string;
  display: string;
  gender: string;
  age?: number;
  birthdate: string;
  identifiers: { identifier: string; identifierType: { display: string } }[];
}

/**
 * Search for and fetch a list of patients.
 */
export async function searchPatients(query: string = '', limit: number = 20): Promise<ListPatient[]> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return [];
  }

  // Use the name/identifier search endpoint
  const url = `${process.env.OPENMRS_API_URL}/patient?q=${query}&limit=${limit}&v=default`;

  try {
    const res = await fetch(url, { headers });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to search patients: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    // Use the 'default' representation which gives essential details for the list.
    return data.results as ListPatient[];

  } catch (error) {
    console.error('Error searching patients:', error);
    return [];
  }
}