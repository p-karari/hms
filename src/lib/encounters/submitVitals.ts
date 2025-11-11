'use server';

import { getAuthHeaders, redirectToLogin } from "../auth/auth";
import { getOpenMRSSessionDetails } from "../openmrs-api/session";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { ObsPayload } from "./encounter";



export interface SubmitEncounterData {
  patient: string;
  encounterDatetime: string;
  encounterType: string;
  location: string;
  visit: string;
  encounterProviders: {
    provider: string;
    encounterRole: string;
  }[];
  obs: ObsPayload[];
}

export async function submitVitals(payload: SubmitEncounterData) {
  const baseUrl = process.env.OPENMRS_API_URL;
  const url = `${baseUrl}/encounter`;

  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return;
  }

  await getOpenMRSSessionDetails();

  try {
    console.log("🧾 SUBMITTING ENCOUNTER PAYLOAD:", JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) redirectToLogin();
      const errorDetail = await response.text();
      throw new Error(`Vitals submission failed: ${errorDetail.substring(0, 200)}...`);
    }

    const json = await response.json();
    return json;
  } catch (error: unknown) {
    if (isRedirectError(error)) throw error;

    if (error instanceof Error)
      console.error("Error submitting vitals:", error.message);
    else
      console.error("Error submitting vitals (unknown type):", error);

    throw new Error("Could not submit vitals due to a network or server issue.");
  }
}
