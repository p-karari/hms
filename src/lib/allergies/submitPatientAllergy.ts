'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth'; 

// --- Interface for the payload sent to the API ---
export interface NewAllergySubmissionData {
    patientUuid: string;
    allergenUuid: string; 
    allergyType: 'DRUG' | 'FOOD' | 'ENVIRONMENTAL' | 'OTHER';
    severity: 'LOW' | 'MODERATE' | 'HIGH';
    
    reactionUuids: string[]; 
    
    onsetDate?: string;  
    comment?: string;    
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

    const payload = {
        patient: patientUuid,
        allergen: {
            uuid: allergenUuid, 
            allergenType: allergyType.toUpperCase() 
        },
        reactions: reactionUuids.map(uuid => ({

            reaction: uuid 
        })),
        severity: severity,
        onsetDate: onsetDate || null,
        comment: comment || null,
        
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

    } catch (error) {
        console.error("Final network error submitting allergy:", error);
        throw new Error("Network or unexpected error during allergy submission.");
    }
}