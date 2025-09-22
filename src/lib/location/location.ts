'use server'

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export interface OpenMrsLocation {
    uuid: string;
    display: string;
    description?: string;
    tags: Array<{
        uuid: string;
        display: string;
    }>;
}

export interface LocationApiResponse {
    results:  OpenMrsLocation[];
}

export interface CurrentSessionLocation {
    uuid: string;
    display: string;
}

export async function getLocations() {
    const cookieStore = await cookies();
    const jsessionid = cookieStore.get('JSESSIONID')?.value;
    if (!jsessionid) {
        cookieStore.delete('JSESSIONID');
        redirect("/login");
    }

    const url = `${process.env.OPENMRS_API_URL}/location?v=full&tag=Login%20Location`;
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cookie': `JSESSIONID=${jsessionid}`,
            }
            
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403){ 
                cookieStore.delete('JSESSIONID');
                redirect("/login");
            }
            const errorDetail = await response.text();
            throw new Error(`OpenMRS API Error: HTTP ${response.status}. Detail: ${errorDetail.substring(0, 100)}...`);
        }

        const data: LocationApiResponse = await response.json();
        return data.results || [];
    } catch (error) {
        if (isRedirectError(error)) {
            throw error;
        }
         console.error("Error retrieving locaitons", error);
        throw new Error("Could not fetch locations due to a network or server issue.");
    }
}

export async function setSessionLocation(formData: FormData) {
  const locationUuid = formData.get("locationUuid");
  const url = `${process.env.OPENMRS_API_URL}/session`;
  const cookieStore = await cookies();
  const jsessionid = cookieStore.get("JSESSIONID")?.value;

  if (!jsessionid) {
    cookieStore.delete("JSESSIONID");
    redirect("/login");
  }

  if (!locationUuid || typeof locationUuid !== "string") {
    throw new Error("Invalid or missing location ID provided for session");
  }

  try {
    // Step 1: Send POST to update session location
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Cookie: `JSESSIONID=${jsessionid}`,
      },
      body: JSON.stringify({
        sessionLocation: locationUuid,
      }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        cookieStore.delete("JSESSIONID");
        redirect("/login");
      }

      const errorDetail = await response.text();
      throw new Error(
        `OpenMRS API Error: HTTP ${response.status}. Detail: ${errorDetail.substring(0, 100)}...`
      );
    }

    // Step 2: Immediately fetch updated session to confirm location was set
    const verifyResponse = await fetch(`${process.env.OPENMRS_API_URL}/session`, {
      headers: {
        Cookie: `JSESSIONID=${jsessionid}`,
      },
      cache: "no-store",
    });

    if (!verifyResponse.ok) {
      throw new Error(`Failed to verify session after location update.`);
    }

    const verifiedSession = await verifyResponse.json();

    if (verifiedSession.sessionLocation?.uuid) {
      redirect("/dashboard");
    } else {
      throw new Error("Session updated but no sessionLocation found after verification.");
    }
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("Error setting session location", error);
    throw new Error("Could not set the session location. Please try again.");
  }
}

export async function getSessionLocation(): Promise<CurrentSessionLocation | null> {
  const cookieStore = await cookies();
  const jsessionid = cookieStore.get("JSESSIONID")?.value;

  if (!jsessionid) return null;

  try {
    const url = `${process.env.OPENMRS_API_URL}/session?v=custom:(sessionLocation)`;
    const response = await fetch(url, {
      headers: {
        Cookie: `JSESSIONID=${jsessionid}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        cookieStore.delete("JSESSIONID");
      }
      return null;
    }

    const data = await response.json();

    // Case 1: sessionLocation is already present
    if (data.sessionLocation?.uuid) {
      return {
        uuid: data.sessionLocation.uuid,
        display: data.sessionLocation.display,
      };
    }

    // Case 2: Missing sessionLocation — try to re-fetch once
    console.warn("Session location missing — attempting to refresh session...");
    const verifyResponse = await fetch(`${process.env.OPENMRS_API_URL}/session`, {
      headers: {
        Cookie: `JSESSIONID=${jsessionid}`,
      },
      cache: "no-store",
    });

    if (!verifyResponse.ok) return null;

    const verified = await verifyResponse.json();

    if (verified.sessionLocation?.uuid) {
      return {
        uuid: verified.sessionLocation.uuid,
        display: verified.sessionLocation.display,
      };
    }

    // Case 3: Still missing after retry
    console.error("Session location still missing after verification.");
    return null;
  } catch (error) {
    console.error("Error fetching session location:", error);
    return null;
  }
}

