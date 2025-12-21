// actions/lab-orders/submitLabResults.ts
'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { updateOrderStatus } from './updateOrderStatus';
import { createEncounterForOrder } from './createEncounter';
import { LabResultSubmission, LabResultField } from './lab-order';

export async function submitLabResults(
  data: LabResultSubmission
): Promise<{ success: boolean; message: string }> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return { success: false, message: 'Authentication failed' };
  }

  const apiBaseUrl = process.env.OPENMRS_API_URL;
  
  try {
    // 1. Ensure we have an encounter
    let encounterUuid = data.encounterUuid;
    const locationUuid = process.env.OPENMRS_LOCATION_UUID || 'Unknown';
    
    if (!encounterUuid) {
      const encounterResult = await createEncounterForOrder(data.orderUuid, locationUuid);
      if (!encounterResult.success) {
        throw new Error(`Failed to create encounter: ${encounterResult.message}`);
      }
      encounterUuid = encounterResult.encounterUuid!;
    }
    
    // 2. Get patient UUID from the order (CRITICAL FIX)
    const patientUuid = await getOrderPatientUuid(data.orderUuid, headers, (apiBaseUrl ?? ''));
    
    // 3. Prepare observations based on test type
    const observations = [];
    
    if (data.panelConceptUuid) {
      // Panel test: Create one observation with groupMembers
      const panelObservation = {
        concept: data.panelConceptUuid,
        person: patientUuid, // ✅ REQUIRED: Add patient UUID
        encounter: encounterUuid,
        order: data.orderUuid,
        obsDatetime: new Date().toISOString(),
        status: 'FINAL',
        groupMembers: data.results.map(result => ({
          concept: result.conceptUuid,
          person: patientUuid, 
          value: result.value,
          status: 'FINAL'
        }))
      };
      observations.push(panelObservation);
    } else {
      // Single test: Create individual observations
      for (const result of data.results) {
        const observation = {
          concept: result.conceptUuid,
          person: patientUuid, // ✅ REQUIRED: Add patient UUID
          encounter: encounterUuid,
          order: data.orderUuid,
          obsDatetime: new Date().toISOString(),
          status: 'FINAL',
          value: result.value
        };
        observations.push(observation);
      }
    }
    
    console.log('Submitting observations:', JSON.stringify(observations, null, 2));
    
    // 4. Create observations in batch
    for (const obs of observations) {
      const obsUrl = `${apiBaseUrl}/obs`;
      const response = await fetch(obsUrl, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(obs)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Observation creation failed:', errorText);
        throw new Error(`Failed to create observation: ${response.status}`);
      }
      
      console.log('Observation created successfully');
    }
    
    // 5. Create a DISCONTINUE order (OpenMRS pattern)
    const currentUserUuid = await getCurrentUserUuid();
    const discontinuePayload = {
      previousOrder: data.orderUuid,
      type: 'testorder',
      action: 'DISCONTINUE',
      careSetting: '6f0c9a92-6f24-11e3-af88-005056821db0', // Outpatient
      concept: data.panelConceptUuid || data.results[0].conceptUuid,
      encounter: encounterUuid,
      orderer: currentUserUuid,
      patient: patientUuid,
      urgency: 'ROUTINE',
      instructions: data.comment || 'Test Results Entered'
    };
    
    console.log('Creating DISCONTINUE order:', JSON.stringify(discontinuePayload, null, 2));
    
    const orderUrl = `${apiBaseUrl}/order`;
    const orderResponse = await fetch(orderUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(discontinuePayload)
    });
    
    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.warn('Discontinue order creation failed:', errorText);
      console.warn('Continuing anyway - results were saved');
      // Continue anyway - results are already saved
    } else {
      console.log('DISCONTINUE order created successfully');
    }
    
    // 6. Update order status to COMPLETED
    const statusResult = await updateOrderStatus(data.orderUuid, {
      fulfillerStatus: 'COMPLETED',
      fulfillerComment: data.comment || 'Test Results Entered'
    });
    
    if (!statusResult.success) {
      return {
        success: false,
        message: `Results saved but failed to update status: ${statusResult.message}`
      };
    }
    
    console.log('Order status updated to COMPLETED');
    
    return {
      success: true,
      message: 'Lab results submitted successfully'
    };
    
  } catch (error: any) {
    console.error('Error submitting lab results:', error);
    return {
      success: false,
      message: error.message || 'Failed to submit lab results'
    };
  }
}

async function getCurrentUserUuid(): Promise<string> {
  // Get current user UUID from session
  // This needs to be implemented based on your auth system
  // For now, using a fallback or getting from session
  try {
    // Try to get from your auth system
    // Example: const session = await getSession();
    // return session?.user?.openmrsUuid || '65acee3a-4f8b-445a-95c3-a6e3f4cafd89';
    return '65acee3a-4f8b-445a-95c3-a6e3f4cafd89'; // Example admin UUID
  } catch {
    return '65acee3a-4f8b-445a-95c3-a6e3f4cafd89'; // Fallback
  }
}

async function getOrderPatientUuid(orderUuid: string, headers: any, apiBaseUrl: string): Promise<string> {
  const orderUrl = `${apiBaseUrl}/order/${orderUuid}?v=custom:(patient)`;
  const response = await fetch(orderUrl, { headers });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to fetch order for patient UUID:', errorText);
    throw new Error(`Failed to get patient UUID from order: ${response.status}`);
  }
  
  const order = await response.json();
  
  if (!order.patient || !order.patient.uuid) {
    throw new Error('Order does not have a patient UUID');
  }
  
  return order.patient.uuid;
}