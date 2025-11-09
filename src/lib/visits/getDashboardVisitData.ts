'use server';

import { redirectToLogin,getAuthHeaders } from '../auth/auth';

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
    idNumber: string;
    name: string;
    gender: string;
    age: number | string;
    visitType: string;
    visitStartTime: string; 
}

interface PatientIdentifier {
    uuid: string;
    identifier: string;
    identifierType: { uuid: string; display: string };
    preferred: boolean;
}

interface FullVisitPatient {
    uuid: string;
    display: string;
    person?: {
        uuid: string;
        gender: string;
        age: number;
    };
    identifiers: PatientIdentifier[];
}

interface FullVisit extends Visit {
    patient: FullVisitPatient;
}

interface VisitApiResponse {
    results: FullVisit[];
    totalCount?: number; 
}



function processVisitToDetail(visit: FullVisit): VisitDetail { 
    const patient = visit.patient;

    if (!patient) {
        return {
            uuid: visit.uuid,
            patientUuid: 'N/A',
            idNumber: 'N/A',
            name: visit.patient.display || 'Unknown Patient',
            gender: 'N/A',
            age: 'N/A', 
            visitType: visit.visitType.display || 'N/A',
            visitStartTime: visit.startDatetime,
        };
    }
    
    const primaryIdentifier = patient.identifiers?.find(id => id.preferred) || patient.identifiers?.[0];
    
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


export async function getDashboardVisitData(): Promise<{ detailedVisits: VisitDetail[], activeVisits: number, totalVisitsToday: number }> {
    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return { detailedVisits: [], activeVisits: 0, totalVisitsToday: 0 };
    }

    try {
        const activeVisitsUrl = `${process.env.OPENMRS_API_URL}/visit?v=full&includeResource=patient,visitType,location&includeInactive=false`;

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
        
        const detailedVisits = activeVisits.map(processVisitToDetail);
        const activeVisitsCount = detailedVisits.length;


        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const totalTodayUrl = `${process.env.OPENMRS_API_URL}/visit?v=custom:(uuid)&fromDate=${today}&totalCount=true`;

        const totalTodayRes = await fetch(
            totalTodayUrl,
            { 
                headers,
                cache: 'no-store' // Ensure we get the latest count
            }
        );

        if (!totalTodayRes.ok) throw new Error(`Failed to fetch total visits today: ${totalTodayRes.status}`);
        
        const totalTodayData: { totalCount: number, results: { uuid: string }[] } = await totalTodayRes.json();
        const totalVisitsTodayCount = totalTodayData.totalCount || 0;
        
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