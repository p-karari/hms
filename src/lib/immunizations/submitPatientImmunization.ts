'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; 


export interface NewImmunizationSubmissionData {
    patientUuid: string;
    vaccineConceptUuid: string; 
    vaccineDisplay: string;     
    occurrenceDateTime: string; 
    lotNumber: string;
    expirationDate: string;     
    manufacturer: string;       
    doseNumber: number;         
    visitUuid: string;          
    locationUuid: string;       
    practitionerUuid: string;   
}

const FHIR_IMMUNIZATION_URL = `${process.env.OPENMRS_API_URL_ALT}/Immunization`;

async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to submit immunization: HTTP ${response.status}.`);
}

export async function submitPatientImmunization(data: NewImmunizationSubmissionData): Promise<void> {
    const { 
        patientUuid, 
        vaccineConceptUuid, 
        vaccineDisplay,
        occurrenceDateTime, 
        lotNumber,
        expirationDate,
        manufacturer,
        doseNumber,
        visitUuid, 
        locationUuid, 
        practitionerUuid 
    } = data;

    if (!patientUuid || !vaccineConceptUuid || !occurrenceDateTime || !visitUuid || !locationUuid || !practitionerUuid) {
        throw new Error("Missing critical required fields for immunization submission.");
    }

    const headers = await getAuthHeaders().catch(() => {
        redirectToLogin();
        throw new Error("Authentication failed during immunization submission.");
    });
    
    const patientReference = `Patient/${patientUuid}`;
    const encounterReference = `Encounter/${visitUuid}`;
    const locationReference = `Location/${locationUuid}`;
    const practitionerReference = `Practitioner/${practitionerUuid}`;

    const fhirPayload = {
        resourceType: "Immunization",
        status: "completed",
        
        patient: { type: "Patient", reference: patientReference },
        encounter: { type: "Encounter", reference: encounterReference }, 
        location: { type: "Location", reference: locationReference },

        occurrenceDateTime: occurrenceDateTime,
        
        vaccineCode: {
            coding: [
                {
                    code: vaccineConceptUuid, 
                    display: vaccineDisplay,
                },
            ],
        },
        manufacturer: { display: manufacturer || 'Unknown' },
        lotNumber: lotNumber,
        expirationDate: expirationDate, 

        performer: [
            {
                actor: {
                    type: "Practitioner",
                    reference: practitionerReference,
                },
            },
        ],
        protocolApplied: [
            {
                doseNumberPositiveInt: doseNumber,
            },
        ],
    };

    try {
        const response = await fetch(FHIR_IMMUNIZATION_URL, {
            method: 'POST',
            headers: { 
                ...headers, 
                'Content-Type': 'application/fhir+json' 
            },
            body: JSON.stringify(fhirPayload)
        });

        if (!response.ok) {
            await handleApiError(response, 'submitPatientImmunization (FHIR)');
        }
    } catch (error) {
        console.error("Final network error submitting immunization:", error);
        throw new Error("Network or unexpected error during immunization submission.");
    }
}