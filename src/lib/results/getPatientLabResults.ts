'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { ConceptReference } from '@/lib/medications/getPatientMedicationOrders'; // Reusing your existing reference type


export interface LabResult {
    uuid: string;
    display: string;
    
    concept: ConceptReference; 
    obsDatetime: string;       
    
    value: string | number | null;
    valueNumeric: number | null;
    valueText: string | null; 
    
    interpretation: 'NORMAL' | 'ABNORMAL' | 'CRITICAL' | null; 
    
    encounterUuid: string;
}

export async function getPatientLabResults(patientUuid: string): Promise<LabResult[]> {
    if (!patientUuid) {
        console.error("Patient UUID is required to fetch lab results.");
        return [];
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        return [];
    }

    const url = `${process.env.OPENMRS_API_URL}/obs?patient=${patientUuid}&v=full&limit=100`; // Limit ensures performance

    try {
        const response = await fetch(url, { 
            headers, 
            cache: 'no-store' 
        });

        if (!response.ok) {
            await handleApiError(response, "getPatientLabResults");
            return [];
        }

        const data: { results: any[] } = await response.json();
        
        
        const VITAL_SIGN_CONCEPT_NAMES = [
            'Weight (kg)', 'Height (cm)', 'BMI', 'Pulse', 'Respiratory rate', 
            'Temperature (c)', 'Systolic blood pressure', 'Diastolic blood pressure'
        ];

        const labResults = data.results
            .filter(obs => {
                
                if (obs.value === null && !obs.valueCodedName) return false;
                
                
                const conceptDisplay = obs.concept?.display || "";
                return !VITAL_SIGN_CONCEPT_NAMES.includes(conceptDisplay);
            })
            .map(obs => {
                const numericValue = typeof obs.value === 'number' ? obs.value : null;
                const textValue = typeof obs.value === 'string' ? obs.value : obs.valueCodedName || null;
                
                return {
                    uuid: obs.uuid,
                    display: obs.display, 
                    concept: { uuid: obs.concept.uuid, display: obs.concept.display },
                    obsDatetime: obs.obsDatetime,
                    
                    value: numericValue !== null ? numericValue : textValue,
                    valueNumeric: numericValue,
                    valueText: textValue,
                    
                    
                    interpretation: obs.interpretation as LabResult['interpretation'] || null, 
                    
                    encounterUuid: obs.encounter?.uuid || 'N/A',
                } as LabResult;
            });
            
        return labResults;

    } catch (error) {
        console.error("Final error in getPatientLabResults:", error);
        
        return [];
    }
}


async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to fetch observation data for ${source}: HTTP ${response.status}.`);
}