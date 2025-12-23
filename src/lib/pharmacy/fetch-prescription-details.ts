'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { PrescriptionDetails, Condition, PrescriptionHistory } from "./pharmacy";

export interface FetchPrescriptionDetailsParams {
  prescriptionId: string;
  patientId: string;
  encounterId: string;
}

async function handleApiError(response: Response, source: string) {
  const errorText = await response.text();
  console.error(`--- FHIR FETCH ERROR: ${source} ---`);
  console.error(`Status: ${response.status}`);
  console.error(`Body: ${errorText}`);
  console.error(`---------------------------------`);

  if (response.status === 401 || response.status === 403) {
    redirectToLogin();
    throw new Error(`Authentication failed: HTTP ${response.status}`);
  }

  throw new Error(`Failed to fetch ${source}: HTTP ${response.status}.`);
}

export async function fetchPrescriptionDetails(
  params: FetchPrescriptionDetailsParams
): Promise<PrescriptionDetails> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    throw new Error('Authentication failed. Redirecting to login.');
  }

  try {
    const { prescriptionId, patientId, encounterId } = params;

    const [medicationRequest, conditions, history] = await Promise.all([
      fetchMedicationRequest(prescriptionId, headers),
      fetchPatientConditions(patientId, headers),
      fetchPrescriptionHistory(prescriptionId, encounterId, headers)
    ]);

    return {
      prescription: medicationRequest,
      conditions,
      history
    };

  } catch (error) {
    console.error('Error fetching prescription details:', error);
    throw error;
  }
}

async function fetchMedicationRequest(prescriptionId: string, headers: Record<string, string>): Promise<any> {
  const FHIR_URL = `${process.env.OPENMRS_API_URL_ALT}/MedicationRequest/${prescriptionId}?_summary=data`;
  const response = await fetch(FHIR_URL, { headers, cache: 'no-store' });

  if (!response.ok) {
    await handleApiError(response, `medication request ${prescriptionId}`);
  }
  return response.json();
}

async function fetchPatientConditions(patientId: string, headers: Record<string, string>): Promise<Condition[]> {
  try {
    const FHIR_CONDITION_URL = `${process.env.OPENMRS_API_URL_ALT}/Condition`;
    
    // Changed 'clinicalStatus' to 'clinical-status' per FHIR R4 specs
    // Some OpenMRS versions prefer just the patient ID search
    const params = new URLSearchParams({
      patient: patientId,
      'clinical-status': 'active', 
      _summary: 'data'
    });

    const url = `${FHIR_CONDITION_URL}?${params.toString()}`;
    console.log(`Fetching conditions from: ${url}`);

    const response = await fetch(url, { headers, cache: 'no-store' });

    if (!response.ok) {
      await handleApiError(response, `conditions for patient ${patientId}`);
      return [];
    }

    const data = await response.json();
    if (!data?.entry) return [];

    return data.entry.map((entry: any) => ({
      id: entry.resource.id,
      name: entry.resource.code?.text || entry.resource.code?.coding?.[0]?.display || 'Unknown Condition',
      status: entry.resource.clinicalStatus?.coding?.[0]?.code || 'active',
      recordedDate: entry.resource.recordedDate
    }));
  } catch (error) {
    console.error('Failed to fetch conditions (returning empty array):', error);
    return []; // Return empty instead of crashing the whole page
  }
}

async function fetchPrescriptionHistory(
  prescriptionId: string,
  encounterId: string,
  headers: Record<string, string>
): Promise<PrescriptionHistory[]> {
  try {
    const FHIR_DISPENSE_URL = `${process.env.OPENMRS_API_URL_ALT}/MedicationDispense`;
    const params = new URLSearchParams({
      prescription: prescriptionId,
      _summary: 'data'
    });

    const response = await fetch(`${FHIR_DISPENSE_URL}?${params.toString()}`, { headers, cache: 'no-store' });
    const history: PrescriptionHistory[] = [];

    if (response.ok) {
      const data = await response.json();
      if (data?.entry) {
        data.entry.forEach((entry: any) => {
          const dispense = entry.resource;
          history.push({
            id: dispense.id,
            type: 'dispensed',
            date: dispense.whenHandedOver || dispense.whenPrepared,
            performer: dispense.performer?.[0]?.actor?.display || 'Pharmacist',
            details: `Dispensed ${dispense.quantity?.value} ${dispense.quantity?.unit || ''}`,
            status: dispense.status
          });
        });
      }
    }

    const FHIR_ENCOUNTER_URL = `${process.env.OPENMRS_API_URL_ALT}/Encounter/${encounterId}?_summary=data`;
    const encounterResponse = await fetch(FHIR_ENCOUNTER_URL, { headers, cache: 'no-store' });

    if (encounterResponse.ok) {
      const encounter = await encounterResponse.json();
      history.push({
        id: `prescribed-${prescriptionId}`,
        type: 'prescribed',
        date: encounter.period?.start || encounter.encounterDatetime,
        performer: encounter.participant?.[0]?.individual?.display || 'Physician',
        details: 'Medication prescribed',
        status: 'completed'
      });
    }

    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  } catch (error) {
    console.error('Error fetching prescription history:', error);
    return [];
  }
}