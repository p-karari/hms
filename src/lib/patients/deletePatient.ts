'use server';

import { cookies } from 'next/headers';

interface DeletePatientOptions {
  patientUuid: string;
  reason?: string;
}

/**
 * Soft deletes (voids) a patient in OpenMRS.
 * Throws an error if deletion fails.
 */
export async function deletePatient({ patientUuid, reason = 'Deleted via application' }: DeletePatientOptions) {
  if (!patientUuid) throw new Error('Patient UUID is required');

  // Example: fetch auth headers from cookies/session
  const cookieStore = await cookies();
  const token = cookieStore.get('openmrs_session')?.value;
  if (!token) throw new Error('No OpenMRS session token found');

  const url = `${process.env.OPENMRS_API_BASE_URL}/ws/rest/v1/patient/${patientUuid}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Basic ${token}`, // adjust if using token-based auth
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });

  // handle redirect errors from OpenMRS REST endpoints
  if (response.status === 302) {
    throw new Error('Redirect encountered while deleting patient');
  }

  if (!response.ok) {
    const errorDetail = await response.text();
    throw new Error(`Failed to delete patient: ${errorDetail}`);
  }

  return { success: true, patientUuid };
}
