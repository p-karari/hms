'use server';

import { redirectToLogin, getAuthHeaders } from '../auth/auth';

export interface Visit {
  uuid: string;
  patient: { uuid: string; display: string };
  visitType: { uuid: string; display: string };
  startDatetime: string;
  stopDatetime?: string | null;
  location?: { uuid: string; display: string };
  voided?: boolean;
  voidReason?: string;
}

export interface VisitDetail {
    uuid: string;
    patientUuid: string;
    openmrsId: string; // Changed from idNumber to openmrsId
    name: string; // Just the name without ID
    gender: string;
    age: number | string;
    visitType: string;
    visitStartTime: string;
    phoneNumber?: string; // Added phone number
    locationUuid?: string; // Added location UUID for filtering
    locationDisplay?: string; // Added location display name
}

interface PersonAttribute {
  uuid: string;
  value: string;
  attributeType: {
    uuid: string;
    display: string;
    name?: string;
  };
}

interface Person {
  uuid: string;
  display: string;
  gender: string;
  age: number;
  birthdate: string;
  attributes?: PersonAttribute[];
}

interface PatientIdentifier {
    uuid: string;
    identifier: string;
    identifierType: { 
      uuid: string; 
      display: string;
      name?: string;
    };
    preferred: boolean;
}

interface FullVisitPatient {
    uuid: string;
    display: string; // This is "10001NG - James Mike"
    person?: Person;
    identifiers: PatientIdentifier[];
}

interface FullVisit extends Visit {
    patient: FullVisitPatient;
}

interface VisitApiResponse {
    results: FullVisit[];
    totalCount?: number; 
}

// Helper to extract OpenMRS ID from identifiers
function getOpenMRSIdFromPatient(patient: FullVisitPatient): string {
  if (!patient.identifiers || patient.identifiers.length === 0) {
    return 'N/A';
  }
  
  // Look for OpenMRS ID specifically
  const openmrsId = patient.identifiers.find(id => 
    id.identifierType.name?.toLowerCase().includes('openmrs') ||
    id.identifierType.display?.toLowerCase().includes('openmrs id')
  );
  
  if (openmrsId) {
    return openmrsId.identifier;
  }
  
  // Fall back to preferred identifier
  const preferredId = patient.identifiers.find(id => id.preferred);
  if (preferredId) {
    return preferredId.identifier;
  }
  
  // Fall back to first identifier
  return patient.identifiers[0]?.identifier || 'N/A';
}

// Helper to extract just the name (without ID prefix)
function getPatientNameFromDisplay(display: string): string {
  if (display.includes(' - ')) {
    return display.split(' - ')[1].trim();
  }
  return display;
}

const TELEPHONE_UUID = process.env.OPENMRS_ATTRIBUTE_TELEPHONE_UUID;

function getPhoneNumberFromPerson(person?: Person): string {
  if (!person?.attributes || person.attributes.length === 0) return 'N/A';

  const phoneAttribute = person.attributes.find(
    attr => attr.attributeType.uuid === TELEPHONE_UUID
  );

  return phoneAttribute?.value || 'N/A';
}


function processVisitToDetail(visit: FullVisit): VisitDetail { 
    const patient = visit.patient;

    if (!patient) {
        return {
            uuid: visit.uuid,
            patientUuid: 'N/A',
            openmrsId: 'N/A',
            name: 'Unknown Patient',
            gender: 'N/A',
            age: 'N/A', 
            visitType: visit.visitType.display || 'N/A',
            visitStartTime: visit.startDatetime,
            phoneNumber: 'N/A',
            locationUuid: visit.location?.uuid,
            locationDisplay: visit.location?.display
        };
    }
    
    return {
        uuid: visit.uuid,
        patientUuid: patient.uuid,
        openmrsId: getOpenMRSIdFromPatient(patient),
        name: getPatientNameFromDisplay(patient.display),
        gender: patient.person?.gender || 'N/A',
        age: patient.person?.age || 'N/A', 
        visitType: visit.visitType.display,
        visitStartTime: visit.startDatetime,
        phoneNumber: getPhoneNumberFromPerson(patient.person),
        locationUuid: visit.location?.uuid, // Extract location UUID
        locationDisplay: visit.location?.display // Extract location display name
    };
}

export async function getDashboardVisitData(): Promise<{ 
  detailedVisits: VisitDetail[], 
  activeVisits: number, 
  totalVisitsToday: number 
}> {
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return { detailedVisits: [], activeVisits: 0, totalVisitsToday: 0 };
    }

    try {
        // Get active visits with full patient details including attributes AND location
        // Added location:(uuid,display) to the custom representation
        const activeVisitsUrl = `${process.env.OPENMRS_API_URL}/visit?v=custom:(uuid,patient:(uuid,display,identifiers:(uuid,identifier,identifierType:(uuid,display,name),preferred),person:(uuid,display,gender,age,birthdate,attributes:(uuid,value,attributeType:(uuid,display,name)))),visitType:(uuid,display),location:(uuid,display),startDatetime,stopDatetime)&includeInactive=false`;

        const activeRes = await fetch(
            activeVisitsUrl,
            { 
                headers,
                cache: 'no-store' 
            }
        );

        if (!activeRes.ok) throw new Error(`Failed to fetch active visits: ${activeRes.status}`);
        
        const activeData: VisitApiResponse = await activeRes.json();
        const activeVisits: FullVisit[] = activeData.results && Array.isArray(activeData.results) ? activeData.results : [];
        
        // Log raw visit data including location for debugging
        console.log("=== RAW VISIT DATA (first visit) ===");
        if (activeVisits.length > 0) {
            console.log("Visit location:", activeVisits[0].location);
            console.log("Visit location UUID:", activeVisits[0].location?.uuid);
            console.log("Visit location display:", activeVisits[0].location?.display);
        }
        
        const detailedVisits = activeVisits.map(processVisitToDetail);
        const activeVisitsCount = detailedVisits.length;

        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const totalTodayUrl = `${process.env.OPENMRS_API_URL}/visit?v=custom:(uuid)&fromDate=${today}&totalCount=true`;

        const totalTodayRes = await fetch(
            totalTodayUrl,
            { 
                headers,
                cache: 'no-store'
            }
        );

        if (!totalTodayRes.ok) throw new Error(`Failed to fetch total visits today: ${totalTodayRes.status}`);
        
        const totalTodayData: { totalCount: number, results: { uuid: string }[] } = await totalTodayRes.json();
        const totalVisitsTodayCount = totalTodayData.totalCount || 0;
        
        console.log("Total detailed visits:", detailedVisits.length);
        
        // Log processed visit details including location
        console.log("=== PROCESSED VISIT DETAILS (first visit) ===");
        if (detailedVisits.length > 0) {
            console.log("Processed locationUuid:", detailedVisits[0].locationUuid);
            console.log("Processed locationDisplay:", detailedVisits[0].locationDisplay);
        }

        return {
            detailedVisits: detailedVisits,
            activeVisits: activeVisitsCount,
            totalVisitsToday: totalVisitsTodayCount,
        };

    } catch (error: unknown) {
        
        if (error instanceof Error) {
            console.error('Error fetching dashboard visit data:', error.message);
        } else {
            console.error('Error fetching dashboard visit data (unknown type):', error);
        }
        
        return { detailedVisits: [], activeVisits: 0, totalVisitsToday: 0 };
    }
}