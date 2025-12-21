// actions/lab-orders/createEncounter.ts
'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';

export async function createEncounterForOrder(
  orderUuid: string,
  locationUuid: string
): Promise<{ success: boolean; message: string; encounterUuid?: string }> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return { success: false, message: 'Authentication failed' };
  }

  const apiBaseUrl = process.env.OPENMRS_API_URL;
  
  try {
    // First get order details
    const orderUrl = `${apiBaseUrl}/order/${orderUuid}?v=custom:(patient,encounter,dateActivated)`;
    const orderResponse = await fetch(orderUrl, { headers });
    
    if (!orderResponse.ok) {
      throw new Error('Failed to fetch order details');
    }
    
    const order = await orderResponse.json();
    
    // Check if encounter already exists
    if (order.encounter && order.encounter.uuid) {
      return {
        success: true,
        message: 'Encounter already exists',
        encounterUuid: order.encounter.uuid
      };
    }
    
    // Create new encounter for lab results
    const encounterPayload = {
      patient: order.patient.uuid,
      encounterType: '67a71486-1a54-468f-ac3e-7091a9a79584', // Lab Result encounter type
      location: locationUuid,
      encounterDatetime: order.dateActivated || new Date().toISOString(),
      providers: [{
        provider: order.orderer.uuid,
        encounterRole: 'a0b03050-c99b-11e0-9572-0800200c9a66' // Unknown role
      }]
    };
    
    const encounterUrl = `${apiBaseUrl}/encounter`;
    const response = await fetch(encounterUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(encounterPayload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Encounter creation failed:', errorText);
      throw new Error(`Failed to create encounter: ${response.status}`);
    }
    
    const result = await response.json();
    
    return {
      success: true,
      message: 'Encounter created successfully',
      encounterUuid: result.uuid
    };
  } catch (error: any) {
    console.error('Error creating encounter:', error);
    return {
      success: false,
      message: error.message || 'Failed to create encounter'
    };
  }
}