'use server';

import { redirectToLogin, getAuthHeaders } from '../auth/auth';

// --- TYPE DEFINITIONS ---

export interface Observation {
  uuid: string;
  display: string;
  concept: { uuid: string; display: string };
  value: unknown; 
 
}

export interface Encounter {
  uuid: string;
  encounterType: string;
  patient: { uuid: string; display: string };
  encounterDatetime: string;
  location: { uuid: string; display: string };
  providers?: { uuid: string; display: string; encounterRole: string }[];
  obs?: Observation[]; 
}

interface EncounterApiResponse {
    results: Encounter[];
}


/**
 * Fetch all encounters for a patient.
 */
export async function getEncounters(patientUuid: string): Promise<Encounter[]> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return [];
  }

  try {
    const res = await fetch(
      `${process.env.OPENMRS_API_URL}/encounter?patient=${patientUuid}&v=full`,
      { headers }
    );
    
    if (!res.ok) throw new Error(`Failed to fetch encounters: ${res.status}`);
    
    const data: EncounterApiResponse = await res.json();
    return data.results || [];
  } catch (error: unknown) { 
    if (error instanceof Error) {
        console.error('Error fetching encounters:', error.message);
    } else {
        console.error('Error fetching encounters (unknown type):', error);
    }
    return [];
  }
}

/**
 * Create a new encounter for a patient.
 */
export async function createEncounter(patientUuid: string, encounter: Partial<Encounter>): Promise<Encounter | null> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return null;
  }

  try {
    const res = await fetch(`${process.env.OPENMRS_API_URL}/encounter`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...encounter, patient: patientUuid }),
    });

    if (!res.ok) throw new Error(`Failed to create encounter: ${res.status}`);
    return await res.json();
  } catch (error: unknown) { 
    if (error instanceof Error) {
        console.error('Error creating encounter:', error.message);
    } else {
        console.error('Error creating encounter (unknown type):', error);
    }
    return null;
  }
}

/**
 * Update an existing encounter by UUID.
 */
export async function updateEncounter(encounterUuid: string, encounter: Partial<Encounter>): Promise<Encounter | null> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return null;
  }

  try {
    const res = await fetch(`${process.env.OPENMRS_API_URL}/encounter/${encounterUuid}`, {
      method: 'POST', 
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(encounter),
    });

    if (!res.ok) throw new Error(`Failed to update encounter: ${res.status}`);
    return await res.json();
  } catch (error: unknown) { 
    if (error instanceof Error) {
        console.error('Error updating encounter:', error.message);
    } else {
        console.error('Error updating encounter (unknown type):', error);
    }
    return null;
  }
}

/**
 * Soft-delete an encounter by voiding it.
 */
export async function deleteEncounter(encounterUuid: string, reason: string = 'Deleted via UI'): Promise<boolean> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return false;
  }

  try {
    const res = await fetch(`${process.env.OPENMRS_API_URL}/encounter/${encounterUuid}`, {
      method: 'DELETE',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });

    if (!res.ok) throw new Error(`Failed to delete encounter: ${res.status}`);
    return true;
  } catch (error: unknown) { 
    if (error instanceof Error) {
        console.error('Error deleting encounter:', error.message);
    } else {
        console.error('Error deleting encounter (unknown type):', error);
    }
    return false;
  }
}