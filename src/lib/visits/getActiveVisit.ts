// ... (Your existing imports, interfaces, getVisits, createVisit, updateVisit, deleteVisit functions)

import { Visit, getVisits } from "../patients/manageVisits";

/**
 * Finds the currently active (open) visit for a patient.
 * An active visit is defined as one that has a startDatetime but no stopDatetime.
 * @param patientUuid The UUID of the patient.
 * @returns The active Visit object or null if no active visit is found.
 */
export async function getActiveVisit(patientUuid: string): Promise<Visit | null> {
  try {
    // Re-use the existing getVisits function to fetch all visits for the patient.
    const allVisits = await getVisits(patientUuid);

    // Filter the results to find a visit that is currently open (stopDatetime is null or undefined).
    // In OpenMRS, an active visit usually has no 'stopDatetime'.
    const activeVisit = allVisits.find(visit => !visit.stopDatetime && !visit.voided);

    return activeVisit || null;

  } catch (error) {
    // Log the error but return null, allowing the caller (LocationDependentFormWrapper) 
    // to handle the failure gracefully (e.g., display an error message).
    console.error(`Error finding active visit for patient ${patientUuid}:`, error);
    throw new Error('Could not check for an active patient visit due to a server error.');
  }
}