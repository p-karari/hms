// actions/userUpdateDeleteActions.ts
"use server";

import { cookies } from "next/headers";

// --- Interfaces imported from userActions.ts (assumed to be correct) ---

// Data expected for updating the Person details (Name & Gender)
export interface PersonUpdateData {
    uuid: string; // Person UUID
    givenName: string;
    familyName: string;
    gender: string;
    preferredNameUuid: string; // UUID of the preferred name record
}

// Data expected for updating the User details (Roles)
export interface UserUpdateData {
    uuid: string; // User UUID
    roleUuids: string[]; // List of UUIDs for all desired roles
}

// --- Helper Function ---

async function authHeaders(): Promise<Record<string, string>> {
    const cookieStore = await cookies();
    const jsessionId = cookieStore.get("JSESSIONID")?.value;
    if (!jsessionId) {
        throw new Error("Missing session. Please log in again.");
    }
    return {
        "Content-Type": "application/json",
        Cookie: `JSESSIONID=${jsessionId}`,
    };
}

// -----------------------------------------------------------------
// --- UPDATE Actions (Name, Gender, Roles) ------------------------
// -----------------------------------------------------------------

/**
 * Updates a user's Person details (Name and Gender).
 * * @param data The PersonUpdateData containing new name, gender, and necessary UUIDs.
 * @throws An error if a critical API call fails.
 */
export async function updatePersonDetails(data: PersonUpdateData): Promise<void> {
    const baseUrl = process.env.OPENMRS_API_URL;
    const headers = await authHeaders();

    // 1. Update the preferred Name record
    const nameUpdatePayload = {
        givenName: data.givenName,
        familyName: data.familyName,
        preferred: true
    };
    
    // Endpoint: POST (used for update) /person/{personUuid}/name/{nameUuid}
    const nameEndpoint = `${baseUrl}/person/${data.uuid}/name/${data.preferredNameUuid}`;

    const nameRes = await fetch(nameEndpoint, {
        method: "POST", 
        headers,
        body: JSON.stringify(nameUpdatePayload),
    });

    if (!nameRes.ok) {
        throw new Error(`Failed to update user name (status ${nameRes.status}): ${await nameRes.text()}`);
    }

    // 2. Update the Person Gender
    const personUpdatePayload = {
        gender: data.gender,
    };

    // Endpoint: POST (used for update) /person/{personUuid}
    const personEndpoint = `${baseUrl}/person/${data.uuid}`;

    const personRes = await fetch(personEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(personUpdatePayload),
    });

    if (!personRes.ok) {
        console.warn(`Failed to update person gender (status ${personRes.status}): ${await personRes.text()}`);
    }
}


/**
 * Updates a user's roles.
 * * @param data The UserUpdateData containing the user UUID and the list of desired role UUIDs.
 * @throws An error if the API call fails.
 */
export async function updateUserRoles(data: UserUpdateData): Promise<void> {
    const baseUrl = process.env.OPENMRS_API_URL;
    const headers = await authHeaders();

    const rolePayload = {
        roles: data.roleUuids.map(uuid => ({ uuid })),
    };

    // Endpoint: POST (used for update) /user/{userUuid}
    const endpoint = `${baseUrl}/user/${data.uuid}`;

    const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(rolePayload),
    });

    if (!res.ok) {
        throw new Error(`Failed to update user roles (status ${res.status}): ${await res.text()}`);
    }
}

// -----------------------------------------------------------------
// --- PASSWORD RESET Action (NEW) ---------------------------------
// -----------------------------------------------------------------

/**
 * Resets a user's password (typically done by an administrator).
 * * @param userUuid The UUID of the user account.
 * @param newPassword The new password to set for the user.
 * @throws An error if the API call fails.
 */
export async function resetUserPassword(userUuid: string, newPassword: string): Promise<void> {
    const baseUrl = process.env.OPENMRS_API_URL;
    const headers = await authHeaders();
    
    if (!newPassword) {
        throw new Error("New password cannot be empty.");
    }

    const passwordPayload = {
        password: newPassword,
    };

    // Endpoint: POST /user/{userUuid}/password
    const endpoint = `${baseUrl}/user/${userUuid}/password`;

    const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(passwordPayload),
    });

    if (!res.ok) {
        throw new Error(`Failed to reset user password (status ${res.status}): ${await res.text()}`);
    }
    // A successful response usually returns 200 OK or 204 No Content.
}


// -----------------------------------------------------------------
// --- DELETE/RETIRE Actions ---------------------------------------
// -----------------------------------------------------------------

/**
 * Retires (soft deletes) a user account via the OpenMRS REST API.
 * * @param userUuid The UUID of the user account to retire.
 * @param retireReason The reason for retiring the account (optional).
 * @throws An error if the API call fails.
 */
export async function retireUser(userUuid: string, retireReason: string = "User retired via management UI"): Promise<void> {
    const baseUrl = process.env.OPENMRS_API_URL;
    const headers = await authHeaders();

    // Endpoint: DELETE /user/{userUuid}
    const endpoint = `${baseUrl}/user/${userUuid}?reason=${encodeURIComponent(retireReason)}`;

    const res = await fetch(endpoint, {
        method: "DELETE",
        headers,
    });

    if (!res.ok) {
        throw new Error(`Failed to retire user (status ${res.status}): ${await res.text()}`);
    }
}