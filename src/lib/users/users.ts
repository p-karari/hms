"use server";

import { cookies } from "next/headers";

// --- TYPE DEFINITIONS ---

// 1. Interface for a single Role object from the API response
interface OpenMRSRole {
    uuid: string;
    display: string;
    // Add other properties if needed (e.g., description, privileges)
}

// 2. Interface for the top-level roles API response
interface RolesApiResponse {
    results: OpenMRSRole[];
}

// 3. Interface for the standard OpenMRS API Error message structure
interface OpenMRSErrorDetail {
    message?: string;
    detail?: string;
}
interface OpenMRSAPIParsedError {
    error?: OpenMRSErrorDetail;
    // OpenMRS can sometimes return errors wrapped directly in a single message property
    message?: string; 
}


/**
 * Helper: Return authenticated headers for OpenMRS API calls.
 * Assumes that login set a JSESSIONID cookie.
 */
async function authHeaders(): Promise<Record<string, string>> {
    const cookieStore = await cookies()
  const jsessionId = cookieStore.get("JSESSIONID")?.value;
  if (!jsessionId) {
    throw new Error("Missing session. Please log in again.");
  }
  return {
    "Content-Type": "application/json",
    Cookie: `JSESSIONID=${jsessionId}`,
  };
}

/**
 * Helper: Get the UUID of a role by its display name.
 */
async function roleUuid(name: string): Promise<string> {
  const baseUrl = process.env.OPENMRS_API_URL;
  const res = await fetch(`${baseUrl}/role?v=default`, {
    headers: await authHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Unable to fetch roles (status ${res.status})`);
  }

  // Type the response data
  const data: RolesApiResponse = await res.json();
  
  // Replace (r: any) with (r: OpenMRSRole)
  const match = data.results.find(
    (r: OpenMRSRole) => r.display.toLowerCase() === name.toLowerCase()
  );

  if (!match) {
    throw new Error(`Role "${name}" not found in OpenMRS`);
  }

  return match.uuid;
}

/**
 * Action: Create a new OpenMRS user with optional Provider record.
 */
export async function createUserAndProvider(form: FormData) {
  const baseUrl = process.env.OPENMRS_API_URL;

  // Collect fields from form
  const given = form.get("givenName")?.toString().trim();
  const family = form.get("familyName")?.toString().trim();
  const user = form.get("username")?.toString().trim();
  const pass = form.get("password")?.toString();
  const gender = form.get("gender")?.toString() || "U";
  const isProvider = form.get("isProvider") === "on";
  const providerId = form.get("providerIdentifier")?.toString() || user;
  const chosenRoles = form.getAll("roles").map(String);

  // Basic validation
  if (!given || !family || !user || !pass) {
    throw new Error("First name, last name, username, and password are required");
  }

  // Always ensure "Authenticated" role
  const mandatoryRole = await roleUuid("Authenticated");
  const allRoles = Array.from(new Set([...chosenRoles, mandatoryRole])).map(
    (uuid) => ({ uuid })
  );

  // Construct payload for user creation
  const payload = {
    person: {
      names: [{ givenName: given, familyName: family, preferred: true }],
      gender,
    },
    username: user,
    password: pass,
    roles: allRoles,
  };

  // Step 1: Create the user
  const headers = await authHeaders();
  const userRes = await fetch(`${baseUrl}/user`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!userRes.ok) {
    const errorText = await userRes.text();
    let msg = `User creation failed (status ${userRes.status})`;
    
    try {
      // Type the parsing result as the expected error structure
      const parsed: OpenMRSAPIParsedError = JSON.parse(errorText); 
      
      // Access properties safely
      msg = parsed.error?.message || parsed.error?.detail || parsed.message || msg;
      
    } catch (e: unknown) { // Use unknown for parse error catch
      // ignore parse error, fallback to msg
      console.warn("Could not parse JSON error body:", e);
    }
    throw new Error(msg);
  }

  const userData = await userRes.json();

  // Step 2: Optionally create a Provider record
  if (isProvider) {
    const providerPayload = {
      person: userData.person.uuid,
      identifier: providerId,
    };

    const provRes = await fetch(`${baseUrl}/provider`, {
      method: "POST",
      headers,
      body: JSON.stringify(providerPayload),
    });

    if (!provRes.ok) {
      console.warn(
        `⚠️ Provider creation failed for ${user}: ${await provRes.text()}`
      );
    }
  }

  return userData;
}