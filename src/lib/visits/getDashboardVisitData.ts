// src/lib/patients/manageVisits.js (SERVER ACTION)
'use server';

import { redirectToLogin,getAuthHeaders } from '../auth/auth';

// --- TYPE DEFINITIONS ---

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

// New Interface for easier UI consumption
export interface VisitDetail {
    uuid: string;
    patientUuid: string;
    idNumber: string;
    name: string;
    gender: string;
    age: number | string; // Can be number or 'N/A'
    visitType: string;
    visitStartTime: string; 
}

// Interface for the Identifier sub-object
interface PatientIdentifier {
    uuid: string;
    identifier: string;
    identifierType: { uuid: string; display: string };
    preferred: boolean;
}

// Interface for the Patient structure returned inside the V=FULL visit endpoint
interface FullVisitPatient {
    uuid: string;
    display: string;
    // Includes elements from the 'person' sub-resource
    person?: {
        uuid: string;
        gender: string;
        age: number;
        // ... other person properties
    };
    identifiers: PatientIdentifier[];
}

// Interface for the raw visit data returned by the API
interface FullVisit extends Visit {
    patient: FullVisitPatient; // Use the detailed patient structure
}

// Interface for the standard OpenMRS API response wrapper
interface VisitApiResponse {
    results: FullVisit[];
}


/**
 * Helper to process raw OpenMRS patient data into a simpler VisitDetail structure.
 * @param visit The raw OpenMRS visit object (v=full).
 * @returns {VisitDetail} The simplified detail object.
 */
// Cast the incoming visit to the detailed structure for safety
function processVisitToDetail(visit: FullVisit): VisitDetail { 
    const patient = visit.patient; // Patient is already typed as FullVisitPatient
    
    // Identifier check is safe because 'patient.identifiers' is typed
    const primaryIdentifier = patient.identifiers.find(id => id.preferred) || patient.identifiers[0];
    
    return {
        uuid: visit.uuid,
        patientUuid: patient.uuid,
        idNumber: primaryIdentifier?.identifier || 'N/A',
        name: patient.display,
        gender: patient.person?.gender || 'N/A',
        age: patient.person?.age || 'N/A', 
        visitType: visit.visitType.display,
        visitStartTime: visit.startDatetime,
    };
}


/**
 * Fetches data for the Active Visit Dashboard (All active visits and total visits today).
 * This replaces the mock function in the UI.
 */
export async function getDashboardVisitData(): Promise<{ detailedVisits: VisitDetail[], activeVisits: number, totalVisitsToday: number }> {
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return { detailedVisits: [], activeVisits: 0, totalVisitsToday: 0 };
    }

    try {
        // --- 1. Fetch All Active Visits ---
        const activeRes = await fetch(
            `${process.env.OPENMRS_API_URL}/visit?v=full&includeResource=patient,visitType,location&active=true`,
            { headers }
        );
        if (!activeRes.ok) throw new Error(`Failed to fetch active visits: ${activeRes.status}`);
        
        // Type the response
        const activeData: VisitApiResponse = await activeRes.json();
        const activeVisits: FullVisit[] = activeData.results || [];
        
        // Process active visits into the detailed structure
        const detailedVisits = activeVisits.map(processVisitToDetail);


        // --- 2. Fetch Total Visits Today ---
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const totalTodayRes = await fetch(
            `${process.env.OPENMRS_API_URL}/visit?v=custom:(uuid)&fromDate=${today}`,
            { headers }
        );
        if (!totalTodayRes.ok) throw new Error(`Failed to fetch total visits today: ${totalTodayRes.status}`);
        
        const totalTodayData: { results: { uuid: string }[] } = await totalTodayRes.json();
        const totalVisitsTodayCount = totalTodayData.results ? totalTodayData.results.length : 0;
        
        return {
            detailedVisits: detailedVisits,
            activeVisits: detailedVisits.length,
            totalVisitsToday: totalVisitsTodayCount,
        };

    } catch (error: unknown) { // Replaced 'catch (error)' with 'catch (error: unknown)'
        
        // Safely log the error detail using type narrowing
        if (error instanceof Error) {
            console.error('Error fetching dashboard visit data:', error.message);
        } else {
            console.error('Error fetching dashboard visit data (unknown type):', error);
        }
        
        return { detailedVisits: [], activeVisits: 0, totalVisitsToday: 0 };
    }
}