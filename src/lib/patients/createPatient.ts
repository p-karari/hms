'use server';

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getAuthHeaders, redirectToLogin } from "../auth/auth";
import { getOpenMRSSessionDetails } from "../openmrs-api/session";
import getIdentifierTypes, { IdentifierType } from "../openmrs-api/getIdentifierTypes";

/**
 * 🧠 Utility function to estimate a birthdate from an age input.
 * Converts numeric age (years, months) into a valid YYYY-MM-DD format string.
 */
function estimateBirthdate(ageYears: number, ageMonths: number = 0): string {
  const today = new Date();
  today.setFullYear(today.getFullYear() - ageYears);
  today.setMonth(today.getMonth() - ageMonths);
  return today.toISOString().split("T")[0];
}

interface AddressPayload {
  address1?: string;
  cityVillage?: string;
  country?: string;
}

interface NamePayload {
  givenName: string;
  familyName: string;
}

interface PersonPayload {
  names?: NamePayload[];
  gender?: string;
  birthdate?: string;
  birthdateEstimated?: boolean;
  addresses?: AddressPayload[];
}

interface IdentifierPayload {
  identifier: string;
  identifierType: string | null;
  location: string | null;
  preferred: boolean;
}

interface PatientPayload {
  person: PersonPayload;
  identifiers: IdentifierPayload[];
}

// Assuming getIdentifierTypes returns a structure like:
interface IdentifierTypesResponse {
    results: IdentifierType[];
}

export async function createPatient(formData: FormData) {
  const url = `${process.env.OPENMRS_API_URL}/patient`;
  let headers: Record<string, string>;

  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return;
  }

  // 🧠 Get current OpenMRS session to obtain the location UUID
  const session = await getOpenMRSSessionDetails();
  const locationUuid = session?.sessionLocation?.uuid || null;

  // 🧠 Fetch all identifier types so we can automatically determine the correct type
  // Casting the result to the expected response type
  const identifierTypes = (await getIdentifierTypes()) as IdentifierTypesResponse | null;
  let identifierTypeUuid: string | null = null;

  if (identifierTypes?.results?.length) {
    // Replace (t: any) with the specific interface IdentifierType
    const openmrsIdType = identifierTypes.results.find(
      (t: IdentifierType) =>
        t.display.toLowerCase().includes("openmrs id") ||
        t.display.toLowerCase().includes("openmrs identification number")
    );
    identifierTypeUuid = openmrsIdType?.uuid || null;
  }

  // 🧠 If none found, fail early with a clear message (for debugging)
  if (!identifierTypeUuid) {
    throw new Error("No valid Patient Identifier Type found (e.g., OpenMRS ID).");
  }

  // 🧠 Handle unidentified patient logic
  const isUnidentified = formData.get("unidentified") === "true";
  const givenName = isUnidentified
    ? "UNKNOWN"
    : formData.get("givenName")?.toString().trim();
  const familyName = isUnidentified
    ? "UNKNOWN"
    : formData.get("familyName")?.toString().trim();

  // 🧠 Handle estimated age input
  const birthdate =
    formData.get("birthdate")?.toString() ||
    (formData.get("ageYears") || formData.get("ageMonths")
      ? estimateBirthdate(
          Number(formData.get("ageYears")) || 0,
          Number(formData.get("ageMonths")) || 0
        )
      : undefined);

  const birthdateEstimated =
    !formData.get("birthdate") && (formData.get("ageYears") || formData.get("ageMonths"))
      ? true
      : false;

  // 🧠 Build person object
  const person: PersonPayload = {
    gender: formData.get("gender")?.toString(),
    birthdate,
    birthdateEstimated,
    addresses: [
      {
        address1: formData.get("address1")?.toString() || "",
        cityVillage: formData.get("cityVillage")?.toString() || "",
        country: formData.get("country")?.toString() || "",
      },
    ],
  };

  if (givenName && familyName) {
    person.names = [{ givenName, familyName }];
  }

  // 🧠 Generate a unique fallback identifier
  const generatedIdentifier = isUnidentified
    ? `UNKNOWN-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    : formData.get("identifier")?.toString() || `TEMP-${Date.now()}`;

  // 🧠 Construct the final OpenMRS-compliant payload
  const NewPatientPayload: PatientPayload = {
    person,
    identifiers: [
      {
        identifier: generatedIdentifier,
        identifierType: identifierTypeUuid,
        location: locationUuid,
        preferred: true,
      },
    ],
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(NewPatientPayload),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        redirectToLogin();
      }
      const errorDetail = await response.text();
      throw new Error(`Registration failed: ${errorDetail.substring(0, 200)}...`);
    }

    return await response.json();
  } catch (error: unknown) { // Use unknown for the catch block variable
    if (isRedirectError(error)) throw error;
    
    // Safely log the error detail using type narrowing
    if (error instanceof Error) {
        console.error("Error creating patient:", error.message);
    } else {
        console.error("Error creating patient (unknown type):", error);
    }
    
    throw new Error("Could not register patient due to a network or server issue.");
  }
}