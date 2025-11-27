'use server';

import { getAuthHeaders, redirectToLogin } from "../auth/auth";
import { getOpenMRSSessionDetails } from "../openmrs-api/session";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export interface ClinicalNoteData {
  patient: string;
  encounterDatetime: string;
  location: string;
  visit: string;
  clinicalNote: string;
  encounterProviders: {
    provider: string;
    encounterRole: string;
  }[];
}

export interface SubmitClinicalNoteResponse {
  uuid: string;
  display: string;
  encounterDatetime: string;
  patient: {
    uuid: string;
    display: string;
  };
  obs: Array<{
    uuid: string;
    display: string;
  }>;
}

export async function submitClinicalNote(payload: ClinicalNoteData): Promise<SubmitClinicalNoteResponse> {
  const baseUrl = process.env.OPENMRS_API_URL;
  const url = `${baseUrl}/encounter`;

  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
  }

  await getOpenMRSSessionDetails();

  // Static UUIDs from our inspection
  const VISIT_NOTE_ENCOUNTER_TYPE = "d7151f82-c1f3-4152-a605-2f9ea7414a79";
  const CLINICAL_NOTE_CONCEPT = "162169AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

  const encounterPayload = {
    form: "c75f120a-04ec-11e3-8780-2b40bef9a44b", // Form UUID from inspection
    patient: payload.patient,
    encounterType: VISIT_NOTE_ENCOUNTER_TYPE,
    location: payload.location,
    visit: payload.visit,
    encounterDatetime: payload.encounterDatetime,
    encounterProviders: payload.encounterProviders,
    obs: [
      {
        concept: {
          uuid: CLINICAL_NOTE_CONCEPT,
          display: ""
        },
        value: payload.clinicalNote
      }
    ]
  };

  try {
    console.log("📝 SUBMITTING CLINICAL NOTE PAYLOAD:", JSON.stringify(encounterPayload, null, 2));
    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(encounterPayload),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) redirectToLogin();
      const errorDetail = await response.text();
      throw new Error(`Clinical note submission failed: ${errorDetail.substring(0, 200)}...`);
    }

    const json = await response.json();
    return json;
  } catch (error: unknown) {
    if (isRedirectError(error)) throw error;

    if (error instanceof Error)
      console.error("Error submitting clinical note:", error.message);
    else
      console.error("Error submitting clinical note (unknown type):", error);

    throw new Error("Could not submit clinical note due to a network or server issue.");
  }
}