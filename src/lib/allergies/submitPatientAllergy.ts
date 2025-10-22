'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; 

// --- Interface for the payload sent to the API ---
export interface NewAllergySubmissionData {
    patientUuid: string;
    allergenUuid: string; // The UUID of the concept representing the allergen (e.g., Penicillin)
    allergyType: 'DRUG' | 'FOOD' | 'ENVIRONMENTAL' | 'OTHER';
    severity: 'LOW' | 'MODERATE' | 'HIGH';
    
    // An array of UUIDs for the observed reactions (e.g., Rash, Anaphylaxis concepts)
    reactionUuids: string[]; 
    
    onsetDate?: string;  // Optional: Date the patient first experienced the reaction (ISO format)
    comment?: string;    // Optional: Clinician notes
}

// --- Helper for API Error Checking ---
async function handleApiError(response: Response, source: string) {
    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
    }

    const errorText = await response.text();
    console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
    throw new Error(`Failed to submit new allergy: HTTP ${response.status}.`);
}

/**
 * Submits a new allergy or Adverse Drug Reaction (ADR) record for a patient.
 *
 * @param submissionData The structured data payload for the new allergy.
 * @returns A promise that resolves when the allergy is successfully created.
 */
export async function submitPatientAllergy(submissionData: NewAllergySubmissionData): Promise<void> {
    const { 
        patientUuid, 
        allergenUuid, 
        allergyType, 
        severity, 
        reactionUuids, 
        onsetDate, 
        comment 
    } = submissionData;

    if (!patientUuid || !allergenUuid || !allergyType || !severity || reactionUuids.length === 0) {
        throw new Error("Missing required fields (patient, allergen, type, severity, or reactions) for allergy submission.");
    }

    let headers: Record<string, string>;
    try {
        headers = await getAuthHeaders();
    } catch {
        redirectToLogin();
        throw new Error("Authentication failed during allergy submission.");
    }

    // --- Construct the OpenMRS AllergyIntolerance Payload ---
    const payload = {
        patient: patientUuid,
        allergen: {
            // OpenMRS expects the UUID of the concept that is the allergen
            uuid: allergenUuid, 
            allergenType: allergyType.toUpperCase() // DRUG, FOOD, ENVIRONMENTAL, etc.
        },
        // Reactions are often submitted as a list of concept UUIDs
        reactions: reactionUuids.map(uuid => ({
            // If the reaction concept itself isn't provided, use the UUID array directly. 
            // NOTE: The exact structure can vary; check your specific OpenMRS distribution's API documentation.
            // Assuming a simple UUID array for concepts:
            reaction: uuid 
        })),
        severity: severity,
        onsetDate: onsetDate || null,
        comment: comment || null,
        
        // Always set the status to ACTIVE upon creation
        status: 'ACTIVE', 
    };

    const url = `${process.env.OPENMRS_API_URL}/allergyintolerance`;

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
            await handleApiError(response, "submitPatientAllergy");
        }

        // Successfully submitted (response status 201 Created)
    } catch (error) {
        console.error("Final network error submitting allergy:", error);
        throw new Error("Network or unexpected error during allergy submission.");
    }
}