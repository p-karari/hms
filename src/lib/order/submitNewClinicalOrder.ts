'use server';

import { getAuthHeaders } from '@/lib/auth/auth';
// import { getEncounterTypeUuid } from '@/lib/config/encounter'; // your helper
// import { getProviderUuid } from '@/lib/config/provider'; // uses env
import { getEncounterTypeUuid } from '../encounters/encounterType';
import { getSessionLocation } from '../location/location';
// import { getSessionLocation } from '@/lib/session/getSessionLocation'; // adjust path if needed

export interface NewOrderSubmissionData {
  patientUuid: string;
  conceptUuid: string;
  orderType: 'testorder' | 'drugorder';
  dateActivated?: string;
  instructions?: string;
  specimenSourceUuid?: string;
  urgency?: 'ROUTINE' | 'STAT';
}

/**
 * Submits a new clinical order (lab/test or drug) by creating an encounter that contains the order.
 * This mirrors the behavior of the official OpenMRS frontend.
 */
export async function submitNewClinicalOrder(submissionData: NewOrderSubmissionData): Promise<void> {
  const {
    patientUuid,
    conceptUuid,
    orderType,
    dateActivated,
    instructions,
    specimenSourceUuid,
    urgency,
  } = submissionData;

  // --- Validate required fields ---
  if (!patientUuid || !conceptUuid || !orderType) {
    throw new Error('Missing required fields for order submission.');
  }

const providerUuid = process.env.NEXT_PUBLIC_DEFAULT_PROVIDER_UUID;
if (!providerUuid) {
  throw new Error("Environment variable NEXT_PUBLIC_DEFAULT_PROVIDER_UUID is missing.");
}

  try {
    // Fetch helper data
    const [headers, encounterTypeUuid, sessionLocation] = await Promise.all([
      getAuthHeaders(),
      getEncounterTypeUuid('Order'),
      getSessionLocation(),
    ]);

    // Construct encounter payload (OpenMRS expected structure)
    const payload = {
      encounterType: encounterTypeUuid,
      patient: patientUuid,
      encounterDatetime: dateActivated || new Date().toISOString(),
      location: sessionLocation?.uuid,
      orders: [
        {
          type: orderType,
          action: 'NEW',
          urgency: urgency || 'ROUTINE',
          concept: conceptUuid,
          careSetting: 'OUTPATIENT',
          orderer: providerUuid,
          instructions: instructions || '',
          ...(orderType === 'testorder' && specimenSourceUuid
            ? { specimenSource: specimenSourceUuid }
            : {}),
        },
      ],
    };

    const url = `${process.env.OPENMRS_API_URL}/encounter`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenMRS Encounter Submission Error:', errorText);
      throw new Error(`Order submission failed: HTTP ${response.status}`);
    }

    console.log('✅ Order encounter submitted successfully.');
  } catch (error) {
    console.error('Final network error submitting order:', error);
    throw new Error('Network or unexpected error during order submission.');
  }
}
