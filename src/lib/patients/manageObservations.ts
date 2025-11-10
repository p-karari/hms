'use server';

import { getAuthHeaders, redirectToLogin } from '../auth/auth'; 
import { CodedValue } from './getVisitTypes'; 

export interface ObsData {
  person: string;         
  concept: string;        
  value: string | number; 
  encounter: string;      
  obsDatetime?: string;   
  location?: string;      
}

// Interface for the response (full Observation object)
export interface Observation {
  uuid: string;
  display: string;
  concept: CodedValue;
  value: string | number;
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

    const data = await res.json();
    return data; 
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error creating observations:', errorMessage);
    return null;
  }
}