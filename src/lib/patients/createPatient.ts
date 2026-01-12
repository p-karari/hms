'use server';

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getAuthHeaders, redirectToLogin } from "../auth/auth";
import { getOpenMRSSessionDetails } from "../openmrs-api/session";

function estimateBirthdate(ageYears: number, ageMonths: number = 0): string {
  const today = new Date();
  today.setFullYear(today.getFullYear() - ageYears);
  today.setMonth(today.getMonth() - ageMonths);
  return today.toISOString().split("T")[0];
}

function generateOpenMRSIdentifier(): string {
  const base = Math.floor(1000000 + Math.random() * 9000000).toString();

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

interface AttributePayload {
  attributeType: string;
  value: string;
}

interface PersonPayload {
  names?: NamePayload[];
  gender?: string;
  birthdate?: string;
  birthdateEstimated?: boolean;
  addresses?: AddressPayload[];
  attributes?: AttributePayload[];
}

export async function createPatient(formData: FormData) {
  console.log("Form Data Submitted:", Object.fromEntries(formData.entries()));
  const baseUrl = process.env.OPENMRS_API_URL;
  const url = `${baseUrl}/patient`;

  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return;
  }

  await getOpenMRSSessionDetails();

  const isUnidentified = formData.get("unidentified") === "true";

  const givenName = isUnidentified
    ? "UNKNOWN"
    : formData.get("givenName")?.toString().trim() || "";

  const familyName = isUnidentified
    ? "UNKNOWN"
    : formData.get("familyName")?.toString().trim() || "";

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

  const genderRaw = formData.get("gender")?.toString().toUpperCase();
  const gender =
    genderRaw === "M" || genderRaw === "MALE"
      ? "M"
      : genderRaw === "F" || genderRaw === "FEMALE"
      ? "F"
      : genderRaw === "O" || genderRaw === "OTHER"
      ? "O"
      : "U";

  // Extract person attributes
  const telephone = formData.get("telephone")?.toString().trim() || "";
  const idNumber = formData.get("idNumber")?.toString().trim() || "";

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
    attributes: [
      telephone
        ? {
            attributeType: process.env.OPENMRS_ATTRIBUTE_TELEPHONE_UUID!,
            value: telephone,
          }
        : null,
      idNumber
        ? {
            attributeType: process.env.OPENMRS_ATTRIBUTE_ID_NUMBER_UUID!,
            value: idNumber,
          }
        : null,
    ].filter(Boolean) as AttributePayload[],
  };

  const identifierTypeUuid = "05a29f94-c0ed-11e2-94be-8c13b969e334";
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

    return await response.json();
  } catch (error: unknown) {
    if (isRedirectError(error)) throw error;

    console.error(
      "Error creating patient:",
      error instanceof Error ? error.message : error
    );

    throw new Error(
      "Could not register patient due to a network or server issue."
    );
  }
}