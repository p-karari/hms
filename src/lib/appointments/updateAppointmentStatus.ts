'use server';

import { redirectToLogin, getAuthHeaders } from '../auth/auth';

// Define the structure for status update request
export interface AppointmentStatusUpdate {
  uuid: string;
  status: 'Scheduled' | 'CheckedIn' | 'Completed' | 'Cancelled' | 'Missed';
  cancelReason?: string; // Optional reason for cancellation
}

// Define the response structure (similar to your existing appointment response)
export interface UpdatedAppointmentResponse {
  uuid: string;
  startDateTime: number;
  endDateTime: number;
  service: { uuid: string; name: string };
  location: { uuid: string; name: string };
  comments: string;
  recurring: boolean;
  status: string;
  cancelReason?: string;
}

/**
 * Updates the status of an existing appointment in OpenMRS.
 * @param statusUpdate The appointment UUID and new status with optional cancel reason.
 * @returns A Promise resolving to the updated Appointment object, or null on failure.
 */
export async function updateAppointmentStatus(statusUpdate: AppointmentStatusUpdate): Promise<UpdatedAppointmentResponse | null> {
  console.log("updateAppointmentStatus function running.");

  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return null;
  }

  // Correct endpoint for status change
  const url = `${process.env.OPENMRS_API_URL}/appointments/${statusUpdate.uuid}/status-change`;

  // Prepare payload for status change endpoint
  const payload: any = {
    toStatus: statusUpdate.status
  };

  // Include cancel reason if provided and status is Cancelled
  if (statusUpdate.status === 'Cancelled' && statusUpdate.cancelReason) {
    payload.cancelReason = statusUpdate.cancelReason;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Appointment status update failed (${res.status}). Error: ${errorText.substring(0, 300)}`);
      return null;
    }
    
    const updatedAppointment: UpdatedAppointmentResponse = await res.json();
    
    console.log(`Appointment ${updatedAppointment.uuid} status successfully updated to ${updatedAppointment.status}.`);

    return updatedAppointment;

  } catch (error) {
    console.error('Critical network or parsing error during appointment status update:', error);
    return null;
  }
}

/**
 * Alternative method using direct PUT to appointment resource if status-change doesn't work
 */
export async function updateAppointmentStatusDirect(statusUpdate: AppointmentStatusUpdate): Promise<UpdatedAppointmentResponse | null> {
  console.log("updateAppointmentStatusDirect function running.");

  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return null;
  }

  const url = `${process.env.OPENMRS_API_URL}/appointment/${statusUpdate.uuid}`;

  try {
    // First, get the current appointment to preserve other fields
    const getRes = await fetch(url, {
      method: 'GET',
      headers: headers,
    });

    if (!getRes.ok) {
      const errorText = await getRes.text();
      console.error(`Failed to fetch current appointment (${getRes.status}). Error: ${errorText.substring(0, 300)}`);
      return null;
    }

    const currentAppointment = await getRes.json();
    
    // Update only the status and cancel reason
    const updatedAppointment = {
      ...currentAppointment,
      status: statusUpdate.status
    };

    if (statusUpdate.status === 'Cancelled' && statusUpdate.cancelReason) {
      updatedAppointment.cancelReason = statusUpdate.cancelReason;
    }

    // Send the updated appointment
    const postRes = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedAppointment),
    });
    
    if (!postRes.ok) {
      const errorText = await postRes.text();
      console.error(`Appointment status update failed (${postRes.status}). Error: ${errorText.substring(0, 300)}`);
      return null;
    }
    
    const result: UpdatedAppointmentResponse = await postRes.json();
    
    console.log(`Appointment ${result.uuid} status successfully updated to ${result.status}.`);

    return result;

  } catch (error) {
    console.error('Critical network or parsing error during appointment status update:', error);
    return null;
  }
}