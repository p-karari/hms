'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';

export interface PatientInfo {
  id: string;
  name: string;
  identifier: string;
  age: number;
  gender: string;
  birthDate: string;
  location: string;
  locationId: string;
}

async function handleApiError(response: Response, source: string) {
  if (response.status === 401 || response.status === 403) {
    redirectToLogin();
    throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
  }

  const errorText = await response.text();
  console.error(`API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
  throw new Error(`Failed to fetch ${source}: HTTP ${response.status}.`);
}

export async function fetchPatientInfo(patientId: string): Promise<PatientInfo | null> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return null;
  }

  try {
    const FHIR_PATIENT_URL = `${process.env.OPENMRS_API_URL_ALT}/Patient`;
    const response = await fetch(`${FHIR_PATIENT_URL}/${patientId}?_summary=data`, { 
      headers,
      cache: 'no-store'
    });

    if (!response.ok) {
      await handleApiError(response, `patient info for ID ${patientId}`);
      return null;
    }

    const patient = await response.json();

    // Extract OpenMRS ID
    const openmrsIdentifier = patient.identifier?.find((id: any) => 
      id.type?.coding?.[0]?.code === '05a29f94-c0ed-11e2-94be-8c13b969e334'
    );

    // Get patient's active encounter to find current location
    let location = 'Unknown Location';
    let locationId = '';
    
    try {
      // Fetch patient's active encounters to get current location
      const FHIR_ENCOUNTER_URL = `${process.env.OPENMRS_API_URL_ALT}/Encounter`;
      const encounterParams = new URLSearchParams({
        patient: patientId,
        status: 'in-progress,finished',
        _sort: '-date',
        _count: '1',
        _summary: 'data'
      });
      
      const encounterResponse = await fetch(`${FHIR_ENCOUNTER_URL}?${encounterParams.toString()}`, {
        headers,
        cache: 'no-store'
      });

      if (encounterResponse.ok) {
        const encounterData = await encounterResponse.json();
        
        if (encounterData?.entry?.[0]?.resource?.location?.[0]?.location?.reference) {
          const locationRef = encounterData.entry[0].resource.location[0].location.reference;
          locationId = locationRef.split('/')[1];
          location = encounterData.entry[0].resource.location[0].location.display || 'Encounter Location';
          console.log('DEBUG - Found location from encounter:', { location, locationId });
        }
      }
      
      // If no encounter location, try patient's managingOrganization
      if (!locationId && patient.managingOrganization?.reference) {
        locationId = patient.managingOrganization.reference.split('/')[1];
        location = patient.managingOrganization.display || 'Organization Location';
        console.log('DEBUG - Using managingOrganization location:', { location, locationId });
      }
      
      // If still no location, use a default location from system
      if (!locationId) {
        // Try to get a default pharmacy location
        const defaultLocation = await getDefaultPharmacyLocation(headers);
        if (defaultLocation) {
          locationId = defaultLocation.uuid;
          location = defaultLocation.display;
          console.log('DEBUG - Using default pharmacy location:', { location, locationId });
        }
      }
      
    } catch (error) {
      console.warn('Error fetching patient location:', error);
    }

    console.log('DEBUG - Final location values:', { location, locationId });

    // Calculate age from birth date
    let age = 0;
    if (patient.birthDate) {
      const birthDate = new Date(patient.birthDate);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }

    // Get patient name
    const name = patient.name?.[0]?.text || 
                `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`.trim();

    const patientInfo = {
      id: patient.id,
      name,
      identifier: openmrsIdentifier?.value || 'Unknown',
      age,
      gender: patient.gender || 'unknown',
      birthDate: patient.birthDate || '',
      location,
      locationId
    };

    console.log('DEBUG - Final PatientInfo object:', patientInfo);
    
    return patientInfo;

  } catch (error) {
    console.error('Error fetching patient info:', error);
    return null;
  }
}

// Helper function to get default pharmacy location
async function getDefaultPharmacyLocation(headers: Record<string, string>): Promise<{uuid: string, display: string} | null> {
  try {
    const url = `${process.env.OPENMRS_API_URL_ALT}/Location?_tag=pharmacy&_summary=data&_count=1`;
    const response = await fetch(url, { headers, cache: 'no-store' });
    
    if (response.ok) {
      const data = await response.json();
      if (data?.entry?.[0]?.resource) {
        const location = data.entry[0].resource;
        return {
          uuid: location.id,
          display: location.name || 'Pharmacy'
        };
      }
    }
    
    // Fallback: try to get any active location
    const fallbackUrl = `${process.env.OPENMRS_API_URL_ALT}/Location?_summary=data&_count=1`;
    const fallbackResponse = await fetch(fallbackUrl, { headers, cache: 'no-store' });
    
    if (fallbackResponse.ok) {
      const data = await fallbackResponse.json();
      if (data?.entry?.[0]?.resource) {
        const location = data.entry[0].resource;
        return {
          uuid: location.id,
          display: location.name || 'Clinic'
        };
      }
    }
  } catch (error) {
    console.warn('Error getting default location:', error);
  }
  
  return null;
}