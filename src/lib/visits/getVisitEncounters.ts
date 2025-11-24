'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; 

interface ResourceReference {
    uuid: string;
    display: string;
}

export interface Diagnosis {
    certainty: string;
    display: string;
    diagnosis: {
        coded: {
            uuid: string;
            display: string;
        };
    };
    rank: number;
}

export interface Observation {
    uuid: string;
    display: string;
    concept: ResourceReference;
    value: any;
    obsDatetime: string;
}

export interface Order {
    uuid: string;
    orderType: ResourceReference;
    concept: ResourceReference;
    display: string;
}

export interface Encounter {
    uuid: string;
    display: string;
    encounterDatetime: string;
    encounterType: ResourceReference;
    location: ResourceReference | null;
    provider: ResourceReference | null;
    diagnoses: Diagnosis[];
    obs: Observation[];
    orders: Order[];
}

export interface VisitWithEncounters {
    uuid: string;
    visitType: ResourceReference;
    startDatetime: string;
    stopDatetime: string | null;
    location: ResourceReference;
    encounters: Encounter[];
}

async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch visit history: HTTP ${response.status}.`);
}

export async function getPatientVisitsWithEncounters(patientUuid: string): Promise<VisitWithEncounters[]> {
    if (!patientUuid) {
        console.warn("Patient UUID is required to fetch visit history.");
        return [];
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch (e) {
        console.error("Could not retrieve auth headers:", e);
        redirectToLogin();
        return [];
    }
    
    // Enhanced custom representation to include diagnoses, obs, and orders
    const customRep = 'v=custom:(uuid,visitType:(display),startDatetime,stopDatetime,location:(display),encounters:(uuid,display,encounterDatetime,encounterType:(display),location:(display),encounterProviders:(uuid,provider:(display)),diagnoses,obs:(uuid,display,concept:(display),value,obsDatetime),orders:(uuid,display,orderType,concept:(display))))&includeInactive=false';
    const url = `${process.env.OPENMRS_API_URL}/visit?patient=${patientUuid}&${customRep}`;

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'no-store'
        });

        if (!response.ok) {
            await handleApiError(response, `getPatientVisitsWithEncounters (${patientUuid})`);
            return [];
        }

        const data: { results: any[] } = await response.json();
        
        const visits: VisitWithEncounters[] = data.results.map((visit: any) => ({
            uuid: visit.uuid,
            visitType: visit.visitType as ResourceReference,
            startDatetime: visit.startDatetime,
            stopDatetime: visit.stopDatetime,
            location: visit.location as ResourceReference,
            
            encounters: visit.encounters.map((enc: any): Encounter => {
                const primaryProvider = enc.encounterProviders?.find((ep: any) => ep.primary);
                const providerRef = primaryProvider 
                    ? primaryProvider.provider 
                    : (enc.encounterProviders?.length > 0 ? enc.encounterProviders[0].provider : null);

                const mappedProvider: ResourceReference | null = providerRef
                    ? { uuid: providerRef.uuid, display: providerRef.display } 
                    : null;

                return {
                    uuid: enc.uuid,
                    display: enc.display,
                    encounterDatetime: enc.encounterDatetime,
                    encounterType: enc.encounterType as ResourceReference,
                    location: enc.location as ResourceReference,
                    provider: mappedProvider,
                    diagnoses: enc.diagnoses || [],
                    obs: enc.obs || [],
                    orders: enc.orders || [],
                };
            }),
        }));
        
        // Sort visits by start date, most recent first
        return visits.sort((a, b) => 
            new Date(b.startDatetime).getTime() - new Date(a.startDatetime).getTime()
        );

    } catch (error) {
        console.error('Final error in getPatientVisitsWithEncounters:', error);
        return [];
    }
}