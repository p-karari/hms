'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; 

// --- Interface for New Immunization Submission (Updated for FHIR context) ---
// Note the inclusion of necessary FHIR fields (lot, manufacturer, dose) 
// and the required Encounter reference (visitUuid).
export interface NewImmunizationSubmissionData {
    patientUuid: string;
    vaccineConceptUuid: string; // The UUID of the vaccine administered
    vaccineDisplay: string;     // The display name of the vaccinef
    occurrenceDateTime: string; // Date and Time of administration (ISO format, e.g., 'YYYY-MM-DDThh:mm:ss.000Z')
    lotNumber: string;
    expirationDate: string;     // Expiration Date (Date only, e.g., 'YYYY-MM-DD')
    manufacturer: string;       // Manufacturer display name
    doseNumber: number;         // Dose number in series (e.g., 1, 2, 3)
    
    // Context needed for FHIR references
    visitUuid: string;          // The UUID of the current active Visit (used as Encounter reference)
    locationUuid: string;       // Location UUID
    practitionerUuid: string;   // The Practitioner UUID who administered/recorded it
}

// --- API Configuration ---
const FHIR_IMMUNIZATION_URL = `${process.env.OPENMRS_API_URL_ALT}/Immunization`;

// --- Helper for API Error Checking ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to submit immunization: HTTP ${response.status}.`);
}

/**
 * Submits a new patient immunization record by creating a FHIR R4 Immunization resource.
 * Uses the confirmed **FHIR R4 API**: /ws/fhir2/R4/Immunization (POST)
 *
 * @param data The structured data payload for the new immunization.
 * @returns A promise that resolves when the immunization is successfully created.
 */
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
    
    // FHIR references
    const patientReference = `Patient/${patientUuid}`;
    const encounterReference = `Encounter/${visitUuid}`; // OpenMRS uses Visit UUID as Encounter reference
    const locationReference = `Location/${locationUuid}`;
    const practitionerReference = `Practitioner/${practitionerUuid}`;

    // 🔑 FHIR Payload construction based on the successful POST example you provided
    const fhirPayload = {
        resourceType: "Immunization",
        status: "completed",
        
        // References
        patient: { type: "Patient", reference: patientReference },
        encounter: { type: "Encounter", reference: encounterReference }, 
        location: { type: "Location", reference: locationReference },

        occurrenceDateTime: occurrenceDateTime,
        
        vaccineCode: {
            coding: [
                {
                    code: vaccineConceptUuid, // OpenMRS Concept UUID
                    display: vaccineDisplay,
                },
            ],
        },
        manufacturer: { display: manufacturer || 'Unknown' },
        lotNumber: lotNumber,
        expirationDate: expirationDate, // FHIR date format ('YYYY-MM-DD')

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
                'Content-Type': 'application/fhir+json' // Use specific FHIR content type
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