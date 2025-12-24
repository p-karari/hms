'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { revalidatePath } from 'next/cache';

export type PrescriptionAction = 'pause' | 'close' | 'reactivate';

export interface UpdatePrescriptionStatusParams {
  prescriptionId: string;
  action: PrescriptionAction;
  reason?: string;
  performedBy: string;
  performedById: string;
}

async function handleApiError(response: Response, source: string) {
  const errorText = await response.text();
  console.error(`--- FHIR API ERROR: ${source} ---`);
  console.error(`Status: ${response.status} ${response.statusText}`);
  console.error(`Response Body: ${errorText}`);
  console.error(`---------------------------------`);

  if (response.status === 401 || response.status === 403) {
    redirectToLogin();
    throw new Error(`Authentication failed: HTTP ${response.status}`);
  }

  throw new Error(`FHIR Error: ${response.status}. Check server logs.`);
}

export async function updatePrescriptionStatus(
  params: UpdatePrescriptionStatusParams
): Promise<{
  success: boolean;
  message: string;
}> {
  let authHeaders: Record<string, string>;
  try {
    authHeaders = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return { success: false, message: 'Authentication failed.' };
  }

  try {
    const { prescriptionId, action, reason, performedBy, performedById } = params;

    const statusMap: Record<PrescriptionAction, string> = {
      pause: 'on-hold',
      close: 'cancelled',
      reactivate: 'active'
    };

    /**
     * Using JSON Merge Patch (application/merge-patch+json)
     * We send a partial resource matching the FHIR MedicationRequest structure.
     */
    const updatePayload = {
      resourceType: "MedicationRequest",
      id: prescriptionId,
      status: statusMap[action]
    };

    const FHIR_URL = `${process.env.OPENMRS_API_URL_ALT}/MedicationRequest/${prescriptionId}`;

    console.log(`--- INITIATING ${action.toUpperCase()} ACTION ---`);
    console.log(`URL: ${FHIR_URL}`);
    console.log(`Payload:`, JSON.stringify(updatePayload, null, 2));

    // Remove any conflicting Content-Type from shared auth headers
    const cleanHeaders = { ...authHeaders };
    Object.keys(cleanHeaders).forEach(key => {
      if (key.toLowerCase() === 'content-type') delete cleanHeaders[key];
    });

    const updateResponse = await fetch(FHIR_URL, {
      method: 'PATCH',
      headers: {
        ...cleanHeaders,
        'Accept': 'application/fhir+json',
        'Content-Type': 'application/merge-patch+json'
      },
      body: JSON.stringify(updatePayload)
    });

    if (!updateResponse.ok) {
      await handleApiError(updateResponse, `Prescription ${action} [${prescriptionId}]`);
    }

    // Process Audit Entry
    await createStatusChangeAudit({
      prescriptionId,
      action,
      reason,
      performedBy,
      performedById
    }, cleanHeaders);

    revalidatePath('/pharmacy/dispensing');

    return {
      success: true,
      message: `Prescription ${action === 'close' ? 'closed' : action + 'd'} successfully.`
    };

  } catch (error) {
    console.error('--- CRITICAL ACTION FAILURE ---');
    console.error(error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

async function createStatusChangeAudit(params: {
  prescriptionId: string;
  action: PrescriptionAction;
  reason?: string;
  performedBy: string;
  performedById: string;
}, headers: Record<string, string>): Promise<void> {
  try {
    const auditEntry = {
      resourceType: 'Task',
      status: 'completed',
      intent: 'order',
      code: {
        coding: [{
          system: 'http://fhir.openmrs.org/code-system/task-code',
          code: 'PRESCRIPTION_STATUS_CHANGE',
          display: 'Prescription Status Change'
        }]
      },
      focus: { reference: `MedicationRequest/${params.prescriptionId}` },
      description: `Prescription ${params.action}d by ${params.performedBy}`,
      note: params.reason ? [{ text: params.reason }] : undefined,
      requester: {
        reference: `Practitioner/${params.performedById}`,
        display: params.performedBy
      },
      authoredOn: new Date().toISOString()
    };

    const response = await fetch(`${process.env.OPENMRS_API_URL_ALT}/Task`, {
      method: 'POST',
      headers: { 
        ...headers,
        'Content-Type': 'application/fhir+json' 
      },
      body: JSON.stringify(auditEntry)
    });

    if (!response.ok) {
      console.warn('Audit Task failed with status:', response.status);
    }
  } catch (err) {
    console.warn('Audit Task could not be created:', err);
  }
}