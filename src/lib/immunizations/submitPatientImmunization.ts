'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; 

// --- Interface for New Immunization Submission ---
export interface NewImmunizationSubmissionData {
    patientUuid: string;
    vaccineConceptUuid: string; // The UUID of the vaccine administered (e.g., 'MMR')
    administrationDate: string; // Date of administration (ISO format)
    locationUuid: string;       // Location where the vaccine was given
    providerUuid: string;       // The provider who administered/recorded it
    // Optional: doseSequence (If your implementation tracks this via another Obs)
}

// --- Configuration Constants ---
// NOTE: These concept UUIDs/names must match your OpenMRS configuration
const IMMUNIZATION_ENCOUNTER_TYPE_NAME = "IMMUNIZATION RECORD";
const VACCINE_ADMINISTERED_CONCEPT_NAME = "VACCINE ADMINISTERED";
const VACCINE_ROUTE_CONCEPT_NAME = "VACCINE ROUTE"; // e.g., 'Intramuscular' (if tracked)
const DEFAULT_ROUTE_CONCEPT_UUID = "uuid-for-intramuscular-concept"; 


// --- Helper for API Error Checking ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to submit immunization: HTTP ${response.status}.`);
}

/**
 * Submits a new patient immunization record by creating an Encounter with necessary Observations (Obs).
 *
 * @param submissionData The structured data payload for the new immunization.
 * @returns A promise that resolves when the immunization is successfully created.
 */
export async function submitPatientImmunization(submissionData: NewImmunizationSubmissionData): Promise<void> {
    const { 
        patientUuid, 
        vaccineConceptUuid, 
        administrationDate, 
        locationUuid, 
        providerUuid 
    } = submissionData;

    if (!patientUuid || !vaccineConceptUuid || !administrationDate || !locationUuid || !providerUuid) {
        throw new Error("Missing required fields for immunization submission.");
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        throw new Error("Authentication failed during immunization submission.");
    }
    
    // --- STEP 1: Get the UUIDs for required concept/type names (if not hardcoded) ---
    // NOTE: In a real app, this lookup should be cached or done in a startup action.
    const getConceptUuidByName = async (name: string): Promise<string> => {
        const searchUrl = `${process.env.OPENMRS_API_URL}/concept?q=${encodeURIComponent(name)}&v=custom:(uuid)`;
        const response = await fetch(searchUrl, { headers, cache: 'force-cache' });
        const data = await response.json();
        return data.results?.[0]?.uuid;
    };
    
    const getEncounterTypeUuidByName = async (name: string): Promise<string> => {
        const searchUrl = `${process.env.OPENMRS_API_URL}/encountertype?q=${encodeURIComponent(name)}&v=custom:(uuid)`;
        const response = await fetch(searchUrl, { headers, cache: 'force-cache' });
        const data = await response.json();
        return data.results?.[0]?.uuid;
    };
    
    // Perform necessary lookups
    const [encounterTypeUuid, vaccineAdministeredConceptUuid, vaccineRouteConceptUuid] = await Promise.all([
        getEncounterTypeUuidByName(IMMUNIZATION_ENCOUNTER_TYPE_NAME),
        getConceptUuidByName(VACCINE_ADMINISTERED_CONCEPT_NAME),
        getConceptUuidByName(VACCINE_ROUTE_CONCEPT_NAME),
    ]);
    
    if (!encounterTypeUuid || !vaccineAdministeredConceptUuid) {
        throw new Error("Missing critical concept/encounter type configurations for immunization recording.");
    }

    // --- STEP 2: Construct the Encounter Payload ---
    const payload = {
        patient: patientUuid,
        encounterType: encounterTypeUuid,
        encounterDatetime: administrationDate, // Use administration date as encounter date
        location: locationUuid,
        // The provider recorded against the encounter
        encounterProviders: [
            {
                provider: providerUuid,
                encounterRole: "uuid-for-clinician-role" // Specific role required by some OpenMRS setups
            }
        ],
        // The observations (Obs) that document the vaccine and details
        obs: [
            {
                // Obs 1: The administered vaccine (concept=VACCINE ADMINISTERED, value=MMR)
                person: patientUuid,
                obsDatetime: administrationDate,
                concept: vaccineAdministeredConceptUuid,
                value: vaccineConceptUuid, // The actual vaccine concept UUID
            },
            {
                // Obs 2: The route (concept=VACCINE ROUTE, value=INTRAMUSCULAR)
                person: patientUuid,
                obsDatetime: administrationDate,
                concept: vaccineRouteConceptUuid,
                value: DEFAULT_ROUTE_CONCEPT_UUID, 
            },
            // Add other required Obs here (e.g., Lot Number, Dose Quantity)
        ]
    };

    const url = `${process.env.OPENMRS_API_URL}/encounter`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            await handleApiError(response, "submitPatientImmunization");
        }

        // Successfully submitted (response status 201 Created)
    } catch (error) {
        console.error("Final network error submitting immunization:", error);
        throw new Error("Network or unexpected error during immunization submission.");
    }
}