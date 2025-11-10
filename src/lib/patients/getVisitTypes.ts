'use server';

import { getAuthHeaders, redirectToLogin } from '../auth/auth'; 

// --- TYPE DEFINITIONS ---

export interface CodedValue {
  uuid: string;
  display: string;
}

interface FullVisitType extends CodedValue {
    retired: boolean;
}

interface VisitTypeApiResponse {
    results: FullVisitType[];
}

/**
 * Fetches all active Visit Types from the OpenMRS API.
 */
export async function getVisitTypes(): Promise<CodedValue[]> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return [];
  }

  const url = `${process.env.OPENMRS_API_URL}/visittype?v=full`;

  try {
    const res = await fetch(url, { headers });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('OpenMRS Fetch Visit Types Error Details:', errorText);
      throw new Error(`Failed to fetch visit types: ${res.status} - ${errorText.substring(0, 100)}...`);
    }

    const data: VisitTypeApiResponse = await res.json();
    
    const visitTypes: CodedValue[] = data.results
      .filter((vt: FullVisitType) => !vt.retired)
      .map((vt: FullVisitType) => ({
        uuid: vt.uuid,
        display: vt.display,
      }));

    return visitTypes;

  } catch (error: unknown) { 
    if (error instanceof Error) {
        console.error('Error fetching visit types:', error.message);
    } else {
        console.error('Error fetching visit types (unknown type):', error);
    }
    return [];
  }
}