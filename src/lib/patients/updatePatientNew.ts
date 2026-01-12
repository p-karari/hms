'use server';

import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getAuthHeaders, redirectToLogin } from "../auth/auth";

/**
 * Updates both Person demographics and Patient identifiers in OpenMRS.
 * Explicitly accepts FormData to match the Client Component's submission.
 */
export async function updatePatient(patientUuid: string, formData: FormData) {
  const baseUrl = process.env.OPENMRS_API_URL;
  
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return;
  }

  // 1. Map Gender for OpenMRS
  const genderRaw = formData.get("gender")?.toString().toUpperCase();
  const gender = ["M", "F", "O", "U"].includes(genderRaw || "") ? genderRaw : "U";

  // 2. Build Person Payload (Demographics, Address, and Telephone Attribute)
  const personPayload = {
    names: [{
      givenName: formData.get("givenName")?.toString().trim(),
      familyName: formData.get("familyName")?.toString().trim(),
    }],
    gender,
    birthdate: formData.get("birthdate")?.toString(),
    addresses: [{
      address1: formData.get("address1")?.toString().trim(),
      cityVillage: formData.get("cityVillage")?.toString().trim(),
      country: formData.get("country")?.toString().trim(),
    }],
    attributes: [
      {
        attributeType: process.env.OPENMRS_ATTRIBUTE_TELEPHONE_UUID!,
        value: formData.get("telephone")?.toString().trim()
      }
    ]
  };

  // 3. Build Patient Payload (National ID Identifier)
  const patientPayload = {
    identifiers: [
      {
        identifier: formData.get("idNumber")?.toString().trim(),
        identifierType: "05a29f94-c0ed-11e2-94be-8c13b969e334", // Your ID Type UUID
        preferred: true
      }
    ]
  };

  try {
    // Step A: Update Person details (Demographics/Attributes)
    const personRes = await fetch(`${baseUrl}/person/${patientUuid}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(personPayload),
    });

    if (!personRes.ok) {
      const errorText = await personRes.text();
      throw new Error(`Person update failed: ${errorText}`);
    }

    // Step B: Update Patient details (Identifiers)
    const patientRes = await fetch(`${baseUrl}/patient/${patientUuid}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(patientPayload),
    });

    if (!patientRes.ok) {
      const errorText = await patientRes.text();
      throw new Error(`Patient update failed: ${errorText}`);
    }

    // Refresh the cache for the patient's view page
    revalidatePath(`/dashboard/patients/${patientUuid}`);
    return { success: true };

  } catch (error: unknown) {
    if (isRedirectError(error)) throw error;
    console.error("Critical Update Error:", error);
    throw new Error(error instanceof Error ? error.message : "An unexpected error occurred during update.");
  }
}