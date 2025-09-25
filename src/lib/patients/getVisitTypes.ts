'use server';

import { getAuthHeaders, redirectToLogin } from '../auth/auth'; 

// --- TYPE DEFINITIONS ---

// A simplified interface for a Coded Value (like Visit Type or Location)
export interface CodedValue {
  uuid: string;
  display: string;
}

// 1. Interface matching the OpenMRS 'full' representation for a single Visit Type
interface FullVisitType extends CodedValue {
    retired: boolean;
    // The 'full' representation includes many other properties, but 'retired' is essential for filtering.
    // Example: description, duration, patientCount, etc.
}

// 2. Interface for the overall API response structure
interface VisitTypeApiResponse {
    results: FullVisitType[];
    // Can include startIndex, size, totalCount, etc.
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

    // Explicitly type the parsed JSON data
    const data: VisitTypeApiResponse = await res.json();
    
    // Replace (vt: any) with (vt: FullVisitType)
    const visitTypes: CodedValue[] = data.results
      .filter((vt: FullVisitType) => !vt.retired)
      .map((vt: FullVisitType) => ({
        uuid: vt.uuid,
        display: vt.display,
      }));

    return visitTypes;

  } catch (error: unknown) { // Use unknown for safety
    if (error instanceof Error) {
        console.error('Error fetching visit types:', error.message);
    } else {
        console.error('Error fetching visit types (unknown type):', error);
    }
    return [];
  }
}