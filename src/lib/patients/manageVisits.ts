'use server';

import { redirectToLogin,getAuthHeaders } from '../auth/auth';
import { Encounter } from '../visits/getVisitEncounters';

export interface Visit {
  uuid: string;
  patient: { uuid: string; display: string };
  visitType: { uuid: string; display: string };
  startDatetime: string;
  stopDatetime: string | null;
  location?: { uuid: string; display: string };
  voided?: boolean;
  voidReason?: string;
  encounters?: Encounter[];
}

/**
 * Fetch all visits for a patient.
 */
export async function getVisits(patientUuid: string): Promise<Visit[]> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return [];
  }

  try {
    const res = await fetch(
      `${process.env.OPENMRS_API_URL}/visit?patient=${patientUuid}&v=full`,
      { headers }
    );
    if (!res.ok) throw new Error(`Failed to fetch visits: ${res.status}`);
    const data = await res.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching visits:', error);
    return [];
  }
}

/**
 * Create a new visit for a patient.
 */
export async function createVisit(patientUuid: string, visit: Partial<Visit>): Promise<Visit | null> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return null;
  }

  try {
    const res = await fetch(`${process.env.OPENMRS_API_URL}/visit`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ...visit,
         patient: patientUuid,
         visitType: visit.visitType?.uuid || visit.visitType,
         location: visit.location?.uuid || visit.location
       }),
    });

if (!res.ok) {
      // ✅ FIX: Read and log the detailed server error response body
      const errorText = await res.text();
      console.error('OpenMRS Visit Creation Error Details:', errorText);
      // Throw a more informative error that includes the status
      throw new Error(`Failed to create visit: ${res.status} - ${errorText.substring(0, 150)}...`);
    }
    return await res.json();
  } catch (error) {
    console.error('Error creating visit:', error);
    return null;
  }
}

/**
 * Update an existing visit by UUID.
 */
export async function updateVisit(visitUuid: string, visit: Partial<Visit>): Promise<Visit> {
  let headers: Record<string, string>;
  
  try {
    headers = await getAuthHeaders();
  } catch {
    // If authentication fails, immediately redirect and throw a specific error
    redirectToLogin();
    throw new Error("Authentication failed during visit update. Redirecting.");
  }

  try {
    const res = await fetch(`${process.env.OPENMRS_API_URL}/visit/${visitUuid}`, {
      method: 'POST', // OpenMRS uses POST for updates
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(visit),
      cache: 'no-store', // Ensure the request is not cached
    });

    if (!res.ok) {
      // 🛑 THROW the API-specific error, including the status and response body text
      const errorText = await res.text();
      console.error(`OpenMRS API Error ${res.status} for visit ${visitUuid}: ${errorText.substring(0, 100)}`);
      throw new Error(`Failed to update visit: ${res.status} - ${errorText.substring(0, 50)}...`);
    }
    
    // If successful (res.ok is true), return the updated data
    return await res.json() as Visit;

  } catch (error) {
    // 🛑 Re-throw any caught error (Network, JSON parsing, or the API error above)
    // This allows the client-side PatientActions component to catch the failure and display an error.
    console.error('Critical network or processing error during visit update:', error);
    throw error; 
  }
}

/**
 * Soft-delete a visit by voiding it.
 */
export async function deleteVisit(visitUuid: string, reason: string = 'Deleted via UI'): Promise<boolean> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return false;
  }

  try {
    const res = await fetch(`${process.env.OPENMRS_API_URL}/visit/${visitUuid}`, {
      method: 'DELETE',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });

    if (!res.ok) throw new Error(`Failed to delete visit: ${res.status}`);
    return true;
  } catch (error) {
    console.error('Error deleting visit:', error);
    return false;
  }
}


