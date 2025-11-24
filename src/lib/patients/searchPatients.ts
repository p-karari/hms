'use server';

import { getAuthHeaders, redirectToLogin } from '../auth/auth';

export interface ListPatient {
  uuid: string;
  display: string;
  gender: string;
  age?: number;
  birthdate: string;
  identifiers: { 
    uuid: string;
    identifier: string; 
    identifierType: { 
      uuid: string; 
      display: string;
      name?: string;
    }; 
    preferred: boolean;
  }[];
  person?: {
    display: string;
    uuid: string;
    gender: string;
    age: number;
    birthdate: string;
    attributes?: Array<{
      uuid: string;
      value: any; 
      display?: string; // Sometimes value is an object, display holds the string
      attributeType: {
        uuid: string;
        display: string;
        name?: string;
      };
    }>;
  };
}

/**
 * Enhanced Search: Handles leading zeros and cleans special characters
 */
export async function searchPatients(query: string = '', limit: number = 20): Promise<ListPatient[]> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return [];
  }

  // 1. Clean the query: Remove spaces/dashes common in phone numbers
  let cleanQuery = query.trim().replace(/[-\s]/g, '');
  if (!cleanQuery) return [];

  const baseUrl = `${process.env.OPENMRS_API_URL}/patient`;
  const representation = `v=custom:(uuid,display,identifiers:(uuid,identifier,identifierType:(uuid,display,name),preferred),person:(uuid,display,gender,age,birthdate,attributes:(uuid,value,display,attributeType:(uuid,display,name))))`;

  try {
    // Attempt 1: Standard search
    let res = await fetch(`${baseUrl}?q=${cleanQuery}&limit=${limit}&${representation}`, { headers });
    let data = await res.json();

    // Attempt 2: Fallback for Integer attributes (strip leading zero)
    // If no results found and query starts with '0', try searching without it
    if ((!data.results || data.results.length === 0) && cleanQuery.startsWith('0')) {
      const fallbackQuery = cleanQuery.substring(1);
      const fallbackRes = await fetch(`${baseUrl}?q=${fallbackQuery}&limit=${limit}&${representation}`, { headers });
      data = await fallbackRes.json();
    }

    return (data.results || []) as ListPatient[];

  } catch (error) {
    console.error('Error searching patients:', error);
    return [];
  }
}

/**
 * Helper: Safely extract Phone Number from Attribute (handles Integer and String)
 */
export async function getPhoneNumber(patient: ListPatient): Promise<string> {
  const attributes = patient.person?.attributes || [];
  const phoneAttr = attributes.find(attr => {
    const name = (attr.attributeType.name || attr.attributeType.display || '').toLowerCase();
    return name.includes('phone') || name.includes('telephone');
  });
  
  if (!phoneAttr) return 'N/A';

  // Handle case where OpenMRS returns value as an object or a primitive
  const val = typeof phoneAttr.value === 'object' ? phoneAttr.value?.display : phoneAttr.value;
  
  // Ensure we return a string and re-add the leading zero if it looks like a phone number but is missing it
  let finalVal = String(val ?? 'N/A');
  if (finalVal !== 'N/A' && finalVal.length >= 9 && !finalVal.startsWith('0')) {
    return `0${finalVal}`;
  }
  return finalVal;
}

/**
 * Helper: Extract Id Number Attribute
 */
export async function getIdNumber(patient: ListPatient): Promise<string> {
  const attributes = patient.person?.attributes || [];
  const idAttr = attributes.find(attr => {
    const name = (attr.attributeType.name || attr.attributeType.display || '').toLowerCase();
    return name.includes('id number');
  });
  
  if (!idAttr) return 'N/A';
  const val = typeof idAttr.value === 'object' ? idAttr.value?.display : idAttr.value;
  return String(val ?? 'N/A');
}

export async function getOpenMRSId(patient: ListPatient): Promise<string> {
  if (!patient.identifiers || patient.identifiers.length === 0) return 'N/A';
  const openmrsId = patient.identifiers.find(id => 
    id.identifierType.name?.toLowerCase().includes('openmrs') ||
    id.identifierType.display?.toLowerCase().includes('openmrs id')
  );
  return openmrsId?.identifier || patient.identifiers.find(id => id.preferred)?.identifier || patient.identifiers[0].identifier;
}

export async function getPatientName(patient: ListPatient): Promise<string> {
  if (patient.person?.display) return patient.person.display;
  const display = patient.display;
  return display.includes(' - ') ? display.split(' - ')[1].trim() : display;
}