'use server';

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getAuthHeaders, redirectToLogin } from "../auth/auth";
import { getOpenMRSSessionDetails } from "../openmrs-api/session";

/** 🧠 Estimate birthdate from numeric age */
function estimateBirthdate(ageYears: number, ageMonths: number = 0): string {
  const today = new Date();
  today.setFullYear(today.getFullYear() - ageYears);
  today.setMonth(today.getMonth() - ageMonths);
  return today.toISOString().split("T")[0];
}

/** 🧮 Generate a pseudo–Luhn-valid OpenMRS ID */
function generateOpenMRSIdentifier(): string {
  // Start with a random 7-digit number
  const base = Math.floor(1000000 + Math.random() * 9000000).toString();
  
  // Compute check digit (Luhn Mod 30)
  const chars = "0123456789ACDEFGHJKLMNPRTUVWXY";
  let factor = 2;
  let sum = 0;
  const n = chars.length;
  for (let i = base.length - 1; i >= 0; i--) {
    const codePoint = chars.indexOf(base[i]);
    let addend = factor * codePoint;
    factor = factor === 2 ? 1 : 2;
    addend = Math.floor(addend / n) + (addend % n);
    sum += addend;
  }
  const remainder = sum % n;
  const checkCodePoint = (n - remainder) % n;
  const checkDigit = chars[checkCodePoint];
  
  return base + checkDigit;
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

/** ✅ Manual static-identifier version with valid OpenMRS format */
export async function createPatient(formData: FormData) {
  const baseUrl = process.env.OPENMRS_API_URL;
  const url = `${baseUrl}/patient`;

  // ✅ Auth headers
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return;
  }

  // ✅ Optional context
  await getOpenMRSSessionDetails();

  // ✅ Handle unidentified patients
  const isUnidentified = formData.get("unidentified") === "true";
  const givenName = isUnidentified
    ? "UNKNOWN"
    : formData.get("givenName")?.toString().trim() || "";
  const familyName = isUnidentified
    ? "UNKNOWN"
    : formData.get("familyName")?.toString().trim() || "";

  // ✅ Birthdate logic
  const birthdate =
    formData.get("birthdate")?.toString() ||
    (formData.get("ageYears") || formData.get("ageMonths")
      ? estimateBirthdate(
          Number(formData.get("ageYears")) || 0,
          Number(formData.get("ageMonths")) || 0
        )
      : undefined);

  const birthdateEstimated =
    !formData.get("birthdate") &&
    (formData.get("ageYears") || formData.get("ageMonths"))
      ? true
      : false;

  // ✅ Gender normalization
  const genderRaw = formData.get("gender")?.toString().toLowerCase();
  const gender =
    genderRaw === "male"
      ? "M"
      : genderRaw === "female"
      ? "F"
      : genderRaw === "other"
      ? "O"
      : "U";

  // ✅ Build the person object
  const person: PersonPayload = {
    names: givenName && familyName ? [{ givenName, familyName }] : undefined,
    gender,
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

  // ✅ Identifier Type UUID (OpenMRS ID)
  const identifierTypeUuid = "05a29f94-c0ed-11e2-94be-8c13b969e334";

  // ✅ Generate valid OpenMRS-style identifier
  const validIdentifier = generateOpenMRSIdentifier();

  const newPatientPayload = {
    person,
    identifiers: [
      {
        identifierType: identifierTypeUuid,
        identifier: validIdentifier,
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
      body: JSON.stringify(newPatientPayload),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) redirectToLogin();
      const errorDetail = await response.text();
      throw new Error(`Registration failed: ${errorDetail.substring(0, 300)}...`);
    }

    const json = await response.json();
    return json;
  } catch (error: unknown) {
    if (isRedirectError(error)) throw error;

    if (error instanceof Error)
      console.error("Error creating patient:", error.message);
    else
      console.error("Error creating patient (unknown type):", error);

    throw new Error(
      "Could not register patient due to a network or server issue."
    );
  }
}
