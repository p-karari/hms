'use server';

import { getAuthHeaders } from '@/lib/auth/auth';
import { getEncounterTypeUuid } from '../encounters/encounterType';
import { getSessionLocation } from '../location/location';

/**
 * Data required to discontinue an existing clinical order.
 */
export interface DiscontinueOrderSubmissionData {
  patientUuid: string;
  orderUuid: string; // The UUID of the existing order to discontinue
  conceptUuid: string; // The concept UUID of the original order
  orderType: 'testorder' | 'drugorder'; // The type of the original order
  dateStopped?: string; // Optional date/time the order was stopped
}

/**
 * Submits a clinical order action to DISCONTINUE an existing order.
 * This is done by creating an encounter that contains the 'DISCONTINUE' order action.
 */
export async function discontinueClinicalOrder(
  submissionData: DiscontinueOrderSubmissionData,
): Promise<void> {
  const {
    patientUuid,
    orderUuid,
    conceptUuid,
    orderType,
    dateStopped,
  } = submissionData;

  // --- Validate required fields ---
  if (!patientUuid || !orderUuid || !conceptUuid || !orderType) {
    throw new Error('Missing required fields for order discontinuation.');
  }

  // Use the same provider logic as your submitNewClinicalOrder
  const providerUuid = process.env.NEXT_PUBLIC_DEFAULT_PROVIDER_UUID;
  if (!providerUuid) {
    throw new Error(
      'Environment variable NEXT_PUBLIC_DEFAULT_PROVIDER_UUID is missing.',
    );
  }

  try {
    // Fetch helper data
    const [headers, encounterTypeUuid, sessionLocation] = await Promise.all([
      getAuthHeaders(),
      getEncounterTypeUuid('Order'), // Still uses the 'Order' encounter type
      getSessionLocation(),
    ]);

    // Construct encounter payload (OpenMRS expected structure)
    const payload = {
      encounterType: encounterTypeUuid,
      patient: patientUuid,
      // Use dateStopped or current time for the encounter datetime
      encounterDatetime: dateStopped || new Date().toISOString(), 
      location: sessionLocation?.uuid,
      orders: [
        {
          type: orderType,
          action: 'DISCONTINUE', // Key difference: The action is DISCONTINUE
          previousOrder: orderUuid, // Key difference: Must link to the order being stopped
          concept: conceptUuid, // Still required, must match the original order's concept
          orderer: providerUuid,
          careSetting: 'OUTPATIENT', // Assuming the same care setting
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
      console.error('OpenMRS Discontinue Submission Error:', errorText);
      throw new Error(
        `Order discontinuation failed: HTTP ${response.status}`,
      );
    }

    console.log('✅ Discontinue order encounter submitted successfully.');
  } catch (error) {
    console.error('Final network error discontinuing order:', error);
    throw new Error(
      'Network or unexpected error during order discontinuation.',
    );
  }
}