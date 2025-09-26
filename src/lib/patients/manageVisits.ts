'use server';

import { redirectToLogin,getAuthHeaders } from '../auth/auth';

export interface Visit {
  uuid: string;
  patient: { uuid: string; display: string };
  visitType: { uuid: string; display: string };
  startDatetime: string;
  stopDatetime?: string;
  location?: { uuid: string; display: string };
  voided?: boolean;
  voidReason?: string;
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
export async function updateVisit(visitUuid: string, visit: Partial<Visit>): Promise<Visit | null> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return null;
  }

  try {
    const res = await fetch(`${process.env.OPENMRS_API_URL}/visit/${visitUuid}`, {
      method: 'POST', // OpenMRS uses POST for updates
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(visit),
    });

    if (!res.ok) throw new Error(`Failed to update visit: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Error updating visit:', error);
    return null;
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
