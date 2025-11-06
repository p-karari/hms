'use server';

import { getAuthHeaders, redirectToLogin } from '../auth/auth';

// Define complex types for the patient object
export interface Identifier {
  uuid: string;
  identifier: string;
  identifierType: { uuid: string; display: string; links: any[] }; // Added 'links' for completeness
  preferred: boolean;
}

export interface Name {
  uuid: string;
  display: string;
  givenName: string;
  middleName: string | null;
  familyName: string;
  preferred: boolean;
  voided: boolean;
  links: any[]; // Added 'links' for completeness
  resourceVersion: string;
}

export interface Address {
  uuid: string;
  display: string;
  preferred: boolean;
  address1: string | null;
  address2: string | null;
  cityVillage: string | null;
  stateProvince: string | null;
  country: string | null;
  postalCode: string | null;
  countyDistrict: string | null;
  // Included other address fields as they are present in v=full
  address3: string | null; 
  address4: string | null; 
  address5: string | null; 
  address6: string | null; 
  voided: boolean;
  links: any[];
  resourceVersion: string;
}

export interface PersonAttribute {
  uuid: string;
  value: string;
  attributeType: { uuid: string; display: string };
}

// Updated Person structure to match the nested JSON data
export interface Person {
  uuid: string;
  display: string;
  gender: string;
  age: number;
  birthdate: string;
  birthdateEstimated: boolean;
  dead: boolean; // Renamed from isDead
  deathDate: string | null;
  causeOfDeath: string | null;
  preferredName: Name;
  preferredAddress: Address | null;
  names: Name[];
  addresses: Address[];
  attributes: PersonAttribute[];
  voided: boolean;
  auditInfo: any;
  links: any[];
  resourceVersion: string;
}

// Updated PatientDetailsType
export interface PatientDetailsType {
  uuid: string;
  display: string;
  identifiers: Identifier[];
  // The demographic fields and addresses are now correctly nested under 'person'
  person: Person;
  voided: boolean;
  auditInfo: any;
  links: any[];
  resourceVersion: string;

  // NOTE: You can remove these root properties as they are now under 'person'
  // and are redundant or potentially outdated at the root level of the patient resource.
  // gender?: string;
  // age?: number;
  // birthdate?: string;
  // birthdateEstimated?: boolean;
  // isDead?: boolean;
  // addresses?: Address[];
  // attributes?: PersonAttribute[];
  hasAllergies?: boolean; // This one remains as it's not in the 'person' object
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
    // console.log('Fetched patient details from OpenMRS:', JSON.stringify(data, null, 2));

    return data as PatientDetailsType;

  } catch (error) {
    console.error('Error fetching patient details:', error);
    return null;
  }
}