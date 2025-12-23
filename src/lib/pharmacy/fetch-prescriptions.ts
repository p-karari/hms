'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { PrescriptionTab, Prescription, PrescriptionStatus } from "./pharmacy";

export interface FetchPrescriptionsParams {
  tab: PrescriptionTab; // 'active' | 'all'
  search?: string;
  page?: number;
  limit?: number;
  locationId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface FetchPrescriptionsResult {
  prescriptions: Prescription[];
  total: number;
  page: number;
  totalPages: number;
}

async function handleApiError(response: Response, source: string) {
  if (response.status === 401 || response.status === 403) {
    redirectToLogin();
    throw new Error(`Authentication failed: HTTP ${response.status}. Redirecting.`);
  }

  const errorText = await response.text();
  console.error(`API Error [${source}] ${response.status}: ${errorText.substring(0, 100)}`);
  throw new Error(`Failed to fetch ${source}: HTTP ${response.status}.`);
}

export async function fetchPrescriptions(
  params: FetchPrescriptionsParams
): Promise<FetchPrescriptionsResult> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    throw new Error('Authentication failed. Redirecting to login.');
  }

  try {
    const {
      tab = 'active',
      search = '',
      page = 1,
      limit = 10,
      locationId,
      fromDate,
      toDate
    } = params;

    // Build query parameters for FHIR API
    const queryParams: Record<string, string> = {
      _count: limit.toString(),
      _getpagesoffset: ((page - 1) * limit).toString(),
      _summary: 'data',
      _query: 'encountersWithMedicationRequests'
    };

    // Add status filter for active prescriptions
    if (tab === 'active') {
      queryParams.status = 'active';
    }

    // Add date range if provided
    if (fromDate) {
      queryParams.date = `ge${fromDate}`;
    }

    // Add location filter if provided
    if (locationId) {
      queryParams.location = locationId;
    }

    // Build URL with query parameters
    const FHIR_ENCOUNTER_URL = `${process.env.OPENMRS_API_URL_ALT}/Encounter`;
    const urlParams = new URLSearchParams(queryParams);
    
    if (toDate) {
      urlParams.append('date', `le${toDate}`);
    }

    // Make API call to fetch prescriptions
    const response = await fetch(`${FHIR_ENCOUNTER_URL}?${urlParams.toString()}`, { 
      headers,
      cache: 'no-store'
    });

    if (!response.ok) {
      await handleApiError(response, 'prescriptions');
      return {
        prescriptions: [],
        total: 0,
        page,
        totalPages: 0
      };
    }

    const data = await response.json();

    if (!data?.entry) {
      return {
        prescriptions: [],
        total: 0,
        page,
        totalPages: 0
      };
    }

    // Transform FHIR response to our Prescription type
    const prescriptions = await transformFHIRToPrescriptions(data.entry, search, headers);
    
    // For demo purposes, filter by search if provided
    let filteredPrescriptions = prescriptions;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredPrescriptions = prescriptions.filter(p =>
        p.patientName.toLowerCase().includes(searchLower) ||
        p.patientId.toLowerCase().includes(searchLower) ||
        p.drugs.toLowerCase().includes(searchLower)
      );
    }

    const total = filteredPrescriptions.length;
    const totalPages = Math.ceil(total / limit);
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPrescriptions = filteredPrescriptions.slice(startIndex, endIndex);

    return {
      prescriptions: paginatedPrescriptions,
      total,
      page,
      totalPages
    };

  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    
    // Preserve the original error message structure
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to fetch prescriptions. Please try again.';
    
    throw new Error(errorMessage);
  }
}

async function transformFHIRToPrescriptions(
  entries: any[],
  search?: string,
  headers?: Record<string, string>
): Promise<Prescription[]> {
  const prescriptions: Prescription[] = [];
  
  // Group encounters with medication requests
  const encounterMap = new Map();
  const medicationRequests: any[] = [];

  entries.forEach(entry => {
    const resource = entry.resource;
    if (resource.resourceType === 'Encounter') {
      encounterMap.set(resource.id, resource);
    } else if (resource.resourceType === 'MedicationRequest') {
      medicationRequests.push(resource);
    }
  });

  // Process each medication request
  for (const medRequest of medicationRequests) {
    const encounter = encounterMap.get(medRequest.encounter?.reference?.split('/')[1]);
    if (!encounter) continue;

    // Extract patient info from encounter
    const patientDisplay = encounter.subject?.display || '';
    const patientMatch = patientDisplay.match(/(.+?)\s*\(OpenMRS ID:\s*([^,]+)/);
    
    // Extract prescriber info
    const prescriber = encounter.participant?.[0]?.individual?.display || 'Unknown';
    
    // Extract drug info - FIXED: Get both display and UUID
    const drugDisplay = medRequest.medicationReference?.display || 
                       medRequest.medicationCodeableConcept?.text || 
                       'Unknown Drug';
    
    // FIXED: Properly extract drug UUID from medicationReference
    let drugUuid = '';
    if (medRequest.medicationReference?.reference) {
      drugUuid = medRequest.medicationReference.reference.split('/')[1];
    } else if (medRequest.medicationCodeableConcept?.coding?.[0]?.code) {
      // Fallback to concept code if no reference
      drugUuid = medRequest.medicationCodeableConcept.coding[0].code;
    }

    // Determine status
    let status: PrescriptionStatus = 'active';
    if (medRequest.status === 'completed' || medRequest.status === 'cancelled') {
      status = 'completed';
    } else if (medRequest.status === 'on-hold') {
      status = 'paused';
    }

    // FIXED: Fetch last dispenser info
    let lastDispenser = '';
    let lastDispenseDate = '';
    if (headers) {
      try {
        const lastDispense = await fetchLastDispenseForPrescription(medRequest.id, headers);
        if (lastDispense) {
          lastDispenser = lastDispense.dispenser;
          lastDispenseDate = lastDispense.date;
        }
      } catch (error) {
        console.warn(`Failed to fetch last dispense for ${medRequest.id}:`, error);
      }
    }

    const prescription: Prescription = {
      id: medRequest.id,
      encounterId: encounter.id,
      created: encounter.period?.start || medRequest.authoredOn,
      patientName: patientMatch ? patientMatch[1].trim() : 'Unknown',
      patientId: patientMatch ? patientMatch[2].trim() : 'Unknown',
      patientUuid: encounter.subject?.reference?.split('/')[1],
      prescriber,
      drugs: drugDisplay,
      drugUuid: drugUuid, // FIXED: Now properly populated
      lastDispenser: lastDispenser, // FIXED: Now populated
      lastDispenseDate: lastDispenseDate, // Added date
      status,
      dosage: medRequest.dosageInstruction?.[0],
      quantity: medRequest.dispenseRequest?.quantity,
      refills: medRequest.dispenseRequest?.numberOfRepeatsAllowed || 0,
      instructions: medRequest.dosageInstruction?.[0]?.additionalInstruction?.[0]?.text || 'No special instructions'
    };

    prescriptions.push(prescription);
  }

  // Sort by creation date (newest first)
  return prescriptions.sort((a, b) => 
    new Date(b.created).getTime() - new Date(a.created).getTime()
  );
}

async function fetchLastDispenseForPrescription(
  prescriptionId: string, 
  headers: Record<string, string>
): Promise<{ dispenser: string; date: string } | null> {
  try {
    const FHIR_MEDICATION_DISPENSE_URL = `${process.env.OPENMRS_API_URL_ALT}/MedicationDispense`;
    const params = new URLSearchParams({
      prescription: prescriptionId,
      _summary: 'data',
      _sort: '-whenhandedover',
      _count: '1'
    });

    const response = await fetch(`${FHIR_MEDICATION_DISPENSE_URL}?${params.toString()}`, {
      headers,
      cache: 'no-store'
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (!data?.entry?.[0]) {
      return null;
    }

    const dispense = data.entry[0].resource;
    const dispenser = dispense.performer?.[0]?.actor?.display || 'Unknown';
    const date = dispense.whenHandedOver || '';

    return { dispenser, date };
  } catch (error) {
    console.warn(`Error fetching last dispense for ${prescriptionId}:`, error);
    return null;
  }
}