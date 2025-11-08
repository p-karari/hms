'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';

// --- Core Allergy Interface ---
export interface Allergy {
  uuid: string;
  display: string;
  patient: { uuid: string };
  allergen: { uuid?: string; display: string } | null;
  reactions: { uuid: string; display: string }[];
  severity: { uuid?: string; display: string } | null;
  allergyType: 'DRUG' | 'FOOD' | 'ENVIRONMENTAL' | 'OTHER';
  comment: string | null;
  onsetDate: string | null;
  voided?: boolean;
}

// --- Handle API Errors ---
async function handleApiError(response: Response, source: string) {
  if (response.status === 401 || response.status === 403) {
    redirectToLogin();
    throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
  }

  const errorText = await response.text();
  console.error(`OpenMRS API Error [${source}] ${response.status}: ${errorText.substring(0, 120)}`);
  throw new Error(`Failed to fetch allergies: HTTP ${response.status}.`);
}

/**
 * Fetches allergy/ADR list for a specific patient.
 */
export async function getPatientAllergies(patientUuid: string): Promise<Allergy[]> {
  if (!patientUuid) {
    console.error('Patient UUID is required to fetch allergies.');
    return [];
  }

  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return [];
  }

  const url = `${process.env.OPENMRS_API_URL}/patient/${patientUuid}/allergy?v=full`;

  try {
    const response = await fetch(url, {
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      await handleApiError(response, 'getPatientAllergies');
      return [];
    }

    const data = await response.json();
    const allergiesArray = Array.isArray(data.results) ? data.results : data;

    return allergiesArray.map((a: any) => ({
      uuid: a.uuid,
      display: a.display || 'Unknown',
      patient: { uuid: a.patient?.uuid || '' },
      allergen: a.allergen
        ? {
            uuid: a.allergen.codedAllergen?.uuid || undefined,
            display: a.allergen.codedAllergen?.display || a.allergen.nonCodedAllergen || 'Unknown',
          }
        : null,
      severity: a.severity
        ? {
            uuid: a.severity.uuid,
            display: a.severity.display || 'Unknown',
          }
        : null,
      allergyType: a.allergen?.allergenType === 'ENVIRONMENT' ? 'ENVIRONMENTAL' : a.allergen?.allergenType || 'OTHER',
      comment: a.comment || null,
      onsetDate: a.onsetDate || null,
      reactions: Array.isArray(a.reactions)
        ? a.reactions.map((r: any) => ({
            uuid: r.reaction?.uuid || '',
            display: r.reaction?.display || 'Unknown',
          }))
        : [],
      voided: a.voided || false,
    })).filter((a: Allergy) => !a.voided);

  } catch (error) {
    console.error('Final error in getPatientAllergies:', error);
    return [];
  }
}
