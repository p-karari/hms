'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
export type ConceptReference = { uuid: string; display: string; };

export interface Immunization {
    uuid: string; 
    vaccineConcept: ConceptReference; 
    
    administrationDate: string;
    
    encounter: { uuid: string } | null;
    
    doseSequence: number | null; 
    
    provider: { uuid: string; display: string } | null;
    
    location: { uuid: string; display: string } | null;
    
    lotNumber?: string;
    manufacturerDisplay?: string;
    expirationDate?: string;
}

const FHIR_IMMUNIZATION_URL = `${process.env.OPENMRS_API_URL_ALT}/Immunization`;

async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch immunizations: HTTP ${response.status}.`);
}


export async function getPatientImmunizations(patientUuid: string): Promise<Immunization[]> {
    if (!patientUuid) {
        console.error("Patient UUID is required to fetch immunizations.");
        return [];
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }
    
    const fetchUrl = `${FHIR_IMMUNIZATION_URL}?patient=${patientUuid}&_count=100&_summary=data`;

    try {
        const response = await fetch(fetchUrl, { headers, cache: 'no-store' });

        if (!response.ok) {
            await handleApiError(response, `getPatientImmunizations for Patient ${patientUuid}`);
            return [];
        }

        const fhirBundle: any = await response.json();
        
        const immunizations: Immunization[] = (fhirBundle.entry || [])
            .map((entry: any) => entry.resource)
            .filter((resource: any) => resource?.resourceType === 'Immunization' && resource.status === 'completed')
            .map((r: any) => {
                const primaryCoding = r.vaccineCode?.coding?.[0] || {};
                
                const performer = r.performer?.[0]?.actor;
                
                const location = r.location;
                
                return {
                    uuid: r.id, 
                    vaccineConcept: {
                        uuid: primaryCoding.code || 'unknown', 
                        display: primaryCoding.display || r.vaccineCode?.text || 'Unknown Vaccine',
                    },
                    administrationDate: r.occurrenceDateTime || 'Unknown Date', 
                    
                    encounter: r.encounter?.reference ? { uuid: r.encounter.reference.split('/')[1] } : null,
                    location: location?.reference ? { 
                        uuid: location.reference.split('/')[1], 
                        display: location.display || 'Unknown Location' 
                    } : null,
                    
                    doseSequence: r.protocolApplied?.[0]?.doseNumberPositiveInt || null,
                    
                    provider: performer ? { 
                        uuid: performer.reference?.split('/')[1] || 'unknown', 
                        display: performer.display || 'Unknown Provider' 
                    } : null,
                    
                    lotNumber: r.lotNumber,
                    manufacturerDisplay: r.manufacturer?.display,
                    expirationDate: r.expirationDate,
                };
            });
            
        return immunizations;

    } catch (error) {
        console.error('Final error in getPatientImmunizations:', error);
        return [];
    }
}