'use server';

import { getAuthHeaders, redirectToLogin } from '../auth/auth';

export interface CodedValue {
  uuid: string;
  display: string;
}

export interface Observation {
  uuid: string;
  obsDatetime: string;
  concept: CodedValue;
  value?: string | number | boolean | CodedValue | null;
  valueNumeric?: number;
  valueText?: string;
  valueCoded?: CodedValue;
  valueDatetime?: string;
  valueBoolean?: boolean;
}

// Cache for concept UUIDs
const conceptCache = new Map<string, string>();

// Function to get concept UUID by name
async function getConceptUuidByName(conceptName: string, headers: Record<string, string>): Promise<string | null> {
  // Check cache first
  if (conceptCache.has(conceptName)) {
    return conceptCache.get(conceptName) || null;
  }

  try {
    const searchUrl = `${process.env.OPENMRS_API_URL}/concept?q=${encodeURIComponent(conceptName)}&v=custom:(uuid,name)&limit=1`;
    const response = await fetch(searchUrl, { headers, cache: 'no-store' });
    
    if (!response.ok) {
      console.error(`Failed to fetch concept: ${conceptName}`);
      return null;
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const uuid = data.results[0].uuid;
      conceptCache.set(conceptName, uuid);
      return uuid;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching concept ${conceptName}:`, error);
    return null;
  }
}

// Get vital concept UUIDs dynamically
async function getVitalConceptUuids(headers: Record<string, string>): Promise<string[]> {
  const vitalConcepts = [
    'Weight (kg)',
    'Height (cm)',
    'Temperature (C)',
    'Systolic blood pressure',
    'Diastolic blood pressure',
    'Pulse',
    'Respiratory rate'
  ];

  const uuids = await Promise.all(
    vitalConcepts.map(concept => getConceptUuidByName(concept, headers))
  );

  // Filter out null values
  return uuids.filter((uuid): uuid is string => uuid !== null);
}

export async function getPatientObservations(patientUuid: string): Promise<Observation[]> {
  let headers: Record<string, string>;

  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return [];
  }

  try {
    // Get vital concept UUIDs dynamically
    const vitalConceptUuids = await getVitalConceptUuids(headers);
    
    if (vitalConceptUuids.length === 0) {
      console.warn('No vital concept UUIDs found');
      return [];
    }

    // OPTION 1: Fetch with concept filter (most optimized)
    const url = `${process.env.OPENMRS_API_URL}/obs?patient=${patientUuid}&concept=${vitalConceptUuids.join(',')}&v=custom:(uuid,obsDatetime,valueNumeric,concept:(uuid),encounter:(encounterDatetime))&limit=100&sort=desc`;
    
    console.log('Fetching vitals for patient:', patientUuid);
    console.log('URL:', url);

    const response = await fetch(url, {
      headers: {
        ...headers,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      throw new Error(`Failed to fetch observations: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Fetched observations count:', data.results?.length || 0);
    
    // Transform to match the expected interface
    const observations: Observation[] = (data.results || []).map((obs: any) => ({
      uuid: obs.uuid,
      obsDatetime: obs.obsDatetime,
      concept: { uuid: obs.concept.uuid, display: '' },
      valueNumeric: obs.valueNumeric,
      value: obs.valueNumeric
    }));

    return observations;

  } catch (error) {
    console.error('Error in getPatientObservations:', error);
    return [];
  }
}

// Fallback function using your existing approach
export async function getPatientObservationsFallback(patientUuid: string): Promise<Observation[]> {
  let headers: Record<string, string>;

  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return [];
  }

  // Use the original approach but with optimized fields
  const url = `${process.env.OPENMRS_API_URL}/obs?patient=${patientUuid}&v=custom:(uuid,obsDatetime,valueNumeric,concept:(uuid,name))&limit=100&sort=desc`;
  
  console.log('Fallback fetch URL:', url);

  try {
    const response = await fetch(url, {
      headers: {
        ...headers,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch observations: ${errorText}`);
    }

    const data = await response.json();
    console.log('Fallback fetched observations count:', data.results?.length || 0);
    
    // Filter for numeric vital observations
    const vitalObservations = (data.results || []).filter((obs: any) => {
      const conceptName = obs.concept.name?.toLowerCase() || '';
      return (
        obs.valueNumeric !== null &&
        obs.valueNumeric !== undefined &&
        (
          conceptName.includes('weight') ||
          conceptName.includes('height') ||
          conceptName.includes('temperature') ||
          conceptName.includes('blood pressure') ||
          conceptName.includes('systolic') ||
          conceptName.includes('diastolic') ||
          conceptName.includes('pulse') ||
          conceptName.includes('respiratory') ||
          conceptName.includes('temp') ||
          conceptName.includes('bp')
        )
      );
    });

    // Transform to match the expected interface
    return vitalObservations.map((obs: any) => ({
      uuid: obs.uuid,
      obsDatetime: obs.obsDatetime,
      concept: { 
        uuid: obs.concept.uuid, 
        display: obs.concept.name || '' 
      },
      valueNumeric: obs.valueNumeric,
      value: obs.valueNumeric
    }));

  } catch (error) {
    console.error('Error in fallback:', error);
    return [];
  }
}