'use server';

import { getAuthHeaders } from '@/lib/auth/auth';
import { getEncounterTypeUuid } from '../encounters/encounterType';
import { getSessionLocation } from '../location/location';


export interface DiscontinueOrderSubmissionData {
  patientUuid: string;
  orderUuid: string; 
  conceptUuid: string; 
  orderType: 'testorder' | 'drugorder'; 
  dateStopped?: string; 
}


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

  if (!patientUuid || !orderUuid || !conceptUuid || !orderType) {
    throw new Error('Missing required fields for order discontinuation.');
  }

  const providerUuid = process.env.NEXT_PUBLIC_DEFAULT_PROVIDER_UUID;
  if (!providerUuid) {
    throw new Error(
      'Environment variable NEXT_PUBLIC_DEFAULT_PROVIDER_UUID is missing.',
    );
  }

  try {
    const [headers, encounterTypeUuid, sessionLocation] = await Promise.all([
      getAuthHeaders(),
      getEncounterTypeUuid('Order'), 
      getSessionLocation(),
    ]);

    const payload = {
      encounterType: encounterTypeUuid,
      patient: patientUuid,
      encounterDatetime: dateStopped || new Date().toISOString(), 
      location: sessionLocation?.uuid,
      orders: [
        {
          type: orderType,
          action: 'DISCONTINUE', 
          previousOrder: orderUuid,
          concept: conceptUuid, 
          orderer: providerUuid,
          careSetting: 'OUTPATIENT', 
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