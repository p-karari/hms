"use server";

import { cookies } from "next/headers";


interface OpenMRSRole {
    uuid: string;
    display: string;
}

interface RolesApiResponse {
    results: OpenMRSRole[];
}

interface OpenMRSErrorDetail {
    message?: string;
    detail?: string;
}
interface OpenMRSAPIParsedError {
    error?: OpenMRSErrorDetail;
    message?: string; 
}



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

async function roleUuid(name: string): Promise<string> {
  const baseUrl = process.env.OPENMRS_API_URL;
  const res = await fetch(`${baseUrl}/role?v=default`, {
    headers: await authHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Unable to fetch roles (status ${res.status})`);
  }

  const data: RolesApiResponse = await res.json();
  
  const match = data.results.find(
    (r: OpenMRSRole) => r.display.toLowerCase() === name.toLowerCase()
  );

  if (!match) {
    throw new Error(`Role "${name}" not found in OpenMRS`);
  }

  return match.uuid;
}


export async function createUserAndProvider(form: FormData) {
  const baseUrl = process.env.OPENMRS_API_URL;

  const given = form.get("givenName")?.toString().trim();
  const family = form.get("familyName")?.toString().trim();
  const user = form.get("username")?.toString().trim();
  const pass = form.get("password")?.toString();
  const gender = form.get("gender")?.toString() || "U";
  const isProvider = form.get("isProvider") === "on";
  const providerId = form.get("providerIdentifier")?.toString() || user;
  const chosenRoles = form.getAll("roles").map(String);

  if (!given || !family || !user || !pass) {
    throw new Error("First name, last name, username, and password are required");
  }

  const mandatoryRole = await roleUuid("Authenticated");
  const allRoles = Array.from(new Set([...chosenRoles, mandatoryRole])).map(
    (uuid) => ({ uuid })
  );

  const payload = {
    person: {
      names: [{ givenName: given, familyName: family, preferred: true }],
      gender,
    },
    username: user,
    password: pass,
    roles: allRoles,
  };

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
      const parsed: OpenMRSAPIParsedError = JSON.parse(errorText); 
      
      msg = parsed.error?.message || parsed.error?.detail || parsed.message || msg;
      
    } catch (e: unknown) { 
      console.warn("Could not parse JSON error body:", e);
    }
    throw new Error(msg);
  }

  const userData = await userRes.json();

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