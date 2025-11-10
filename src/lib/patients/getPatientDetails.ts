'use server';

import { getAuthHeaders, redirectToLogin } from '../auth/auth';

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
  links: any[]; 
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

export interface Person {
  uuid: string;
  display: string;
  gender: string;
  age: number;
  birthdate: string;
  birthdateEstimated: boolean;
  dead: boolean; 
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

export interface PatientDetailsType {
  uuid: string;
  display: string;
  identifiers: Identifier[];
  person: Person;
  voided: boolean;
  auditInfo: any;
  links: any[];
  resourceVersion: string;

  hasAllergies?: boolean; 
}

export async function getPatientDetails(patientUuid: string): Promise<PatientDetailsType | null> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return null;
  }

  try {
    const res = await fetch(
      `${process.env.OPENMRS_API_URL}/patient/${patientUuid}?v=full`,
      { headers }
    );

    if (!res.ok) {
      if (res.status === 404) return null; 
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