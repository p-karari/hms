'use server';

import { getAuthHeaders, redirectToLogin } from '../auth/auth';

// Define complex types for the patient object
export interface Identifier {
  uuid: string;
  identifier: string;
  identifierType: { uuid: string; display: string };
  preferred: boolean;
}

export interface Address {
  uuid: string;
  address1: string;
  address2: string;
  cityVillage: string;
  stateProvince: string;
  country: string;
  postalCode: string;
  preferred: boolean;
}

export interface PersonAttribute {
  uuid: string;
  value: string;
  attributeType: { uuid: string; display: string };
}

export interface PatientDetailsType {
  uuid: string;
  display: string;
  gender: string;
  age?: number; // Calculated on the server
  birthdate: string;
  birthdateEstimated: boolean;
  isDead: boolean;
  identifiers: Identifier[];
  addresses: Address[];
  attributes: PersonAttribute[];
  hasAllergies?: boolean;
  // Include name details which are part of the 'full' representation
  person: {
    names: { uuid: string; givenName: string; familyName: string; preferred: boolean }[];
  }
}

/**
 * Fetch a single, full patient record using their UUID.
 */
export async function getPatientDetails(patientUuid: string): Promise<PatientDetailsType | null> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    // If auth fails, redirect to login
    redirectToLogin();
    return null;
  }

  try {
    // Use v=full to get a comprehensive set of patient data (identifiers, addresses, attributes, etc.)
    const res = await fetch(
      `${process.env.OPENMRS_API_URL}/patient/${patientUuid}?v=full`,
      { headers }
    );

    if (!res.ok) {
      if (res.status === 404) return null; // Patient not found
      const errorText = await res.text();
      throw new Error(`Failed to fetch patient details: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    return data as PatientDetailsType;

  } catch (error) {
    console.error('Error fetching patient details:', error);
    return null;
  }
}