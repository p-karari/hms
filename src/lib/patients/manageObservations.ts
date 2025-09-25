'use server';

import { getAuthHeaders, redirectToLogin } from '../auth/auth'; // Assuming path to your auth utilities
import { CodedValue } from './getVisitTypes'; // Reusing the CodedValue interface

// Interface for a single observation object to be sent to the API
export interface ObsData {
  person: string;         // Patient UUID (required by the obs endpoint)
  concept: string;        // Concept UUID (e.g., 'Weight', 'Temperature')
  value: string | number; // The recorded vital sign value
  encounter: string;      // Encounter UUID (to link the obs)
  obsDatetime?: string;   // Optional: defaults to encounter time
  location?: string;      // Optional: defaults to encounter location
}

// Interface for the response (full Observation object)
export interface Observation {
  uuid: string;
  display: string;
  concept: CodedValue;
  value: string | number;
  // ... other properties
}

/**
 * Creates one or more Observations.
 * The OpenMRS REST API can accept an array of Obs objects in a single POST.
 */
export async function createObservations(obs: ObsData[]): Promise<Observation[] | null> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return null;
  }

  const url = `${process.env.OPENMRS_API_URL}/obs`;
  
  try {
    // The API accepts an array of Obs JSON objects
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(obs),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('OpenMRS Create Observations Error Details:', errorText);
      throw new Error(`Failed to create observations: ${res.status} - ${errorText.substring(0, 150)}...`);
    }

    // The REST API often returns an array of the created Obs objects
    const data = await res.json();
    return data; // Returns the array of created observations
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error creating observations:', errorMessage);
    return null;
  }
}