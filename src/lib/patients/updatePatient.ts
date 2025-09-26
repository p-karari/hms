'use server';

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getAuthHeaders, redirectToLogin } from "../auth/auth";

// 1. Define the specific interface for the request body to eliminate 'any'

interface OpenMrsPersonUpdate {
  names?: Array<{
    givenName?: string;
    familyName?: string;
  }>;
  gender?: "M" | "F" | string;
  birthdate?: string; // OpenMRS typically expects YYYY-MM-DD
  addresses?: Array<{
    address1?: string;
    address2?: string;
    cityVillage?: string;
    stateProvince?: string;
    country?: string;
    postalCode?: string;
  }>;
}

interface OpenMrsPatientUpdateBody {
  person?: OpenMrsPersonUpdate;
}

/**
 * Updates an existing OpenMRS patient by UUID.
 * Compatible with OpenMRS 2.7.0 REST API.
 */
export async function updatePatient(patientUuid: string, updates: {
  givenName?: string;
  familyName?: string;
  gender?: "M" | "F" | string;
  birthdate?: string;
  address?: {
    address1?: string;
    address2?: string;
    cityVillage?: string;
    stateProvince?: string;
    country?: string;
    postalCode?: string;
  };
}) {
  try {
    const headers = await getAuthHeaders();

    // 2. Use the defined interface instead of 'any'
    const body: OpenMrsPatientUpdateBody = {};

    // Only include provided fields
    if (updates.givenName || updates.familyName) {
      // Initialize person object if it doesn't exist
      body.person = body.person || {};
      body.person.names = [
        {
          givenName: updates.givenName,
          familyName: updates.familyName,
        },
      ];
    }

    if (updates.gender) {
      body.person = body.person || {};
      body.person.gender = updates.gender;
    }

    if (updates.birthdate) {
      body.person = body.person || {};
      body.person.birthdate = updates.birthdate;
    }

    if (updates.address) {
      body.person = body.person || {};
      body.person.addresses = [
        {
          ...updates.address,
        },
      ];
    }
    
    // Safety check: The body must contain a person object to send updates
    if (!body.person) {
        throw new Error("No update fields provided for patient/person.");
    }

    const response = await fetch(
      `${process.env.OPENMRS_API_URL}/patient/${patientUuid}`,
      {
        method: "POST", // OpenMRS expects POST for updating patient/person sub-resources
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (response.status === 401) {
      return redirectToLogin();
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update patient: ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ Patient updated successfully:", data);
    return data;
  } catch (error) {
    if (isRedirectError(error)) {
        throw error
    }
    console.error("❌ Error updating patient:", error);
    throw error;
  }
}