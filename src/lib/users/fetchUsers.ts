// actions/userActions.ts
"use server";

import { cookies } from "next/headers";

// --- OpenMRS API Interfaces (Based on your detailed response) ---

interface OpenMRSPersonName {
    display: string; // e.g., "Super User"
}

interface OpenMRSPerson {
    uuid: string;
    display: string; // Full Name
    gender: string;
    preferredName: OpenMRSPersonName | null;
}

interface OpenMRSRole {
    uuid: string;
    display: string; // e.g., "System Developer"
    retired: boolean;
}

interface OpenMRSUserProperties {
    defaultLocale?: string;
    lastLoginTimestamp?: string; // Timestamp string
    defaultLocation?: string; // Location UUID
}

// The raw user object returned by the /user?v=full endpoint
interface OpenMRSUserRaw {
    uuid: string;
    display: string; // Usually the username
    username: string | null; // Can be null if using systemId for login
    systemId: string;
    userProperties: OpenMRSUserProperties;
    person: OpenMRSPerson;
    roles: OpenMRSRole[];
    retired: boolean; // Indicates if the login account is disabled
}

interface UserListApiResponse {
    results: OpenMRSUserRaw[];
}

// --- Simplified Interface for the Management UI ---

export interface ManagedUser {
    uuid: string;
    fullName: string;
    username: string;
    systemId: string;
    gender: string;
    roles: string[];
    isRetired: boolean;
    lastLogin?: string; // Formatted date string
}

// --- Helper Functions ---

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

/**
 * Converts the OpenMRS timestamp string (milliseconds since epoch) to a readable date.
 */
function formatLastLogin(timestamp: string | undefined): string | undefined {
    if (!timestamp) return undefined;
    try {
        const ms = parseInt(timestamp, 10);
        return new Date(ms).toLocaleString();
    } catch (e) {
        return undefined;
    }
}

// --- Main Action Function ---

/**
 * Fetches a list of all users from the OpenMRS API and transforms the data 
 * into a simplified structure for the management UI.
 * * @returns A promise that resolves to an array of ManagedUser objects.
 */
export async function getAllUsers(): Promise<ManagedUser[]> {
    const baseUrl = process.env.OPENMRS_API_URL;
    if (!baseUrl) {
        throw new Error("OPENMRS_API_URL environment variable is not set.");
    }
    
    // Using v=full based on the provided data shape
    const endpoint = `${baseUrl}/user?v=full`; 
    
    const headers = await authHeaders();

    const res = await fetch(endpoint, {
        method: "GET",
        headers,
        cache: "no-store", 
    });

    if (!res.ok) {
        // ... (Error handling remains the same) ...
        const errorText = await res.text();
        let errorMessage = `Failed to fetch users (status ${res.status})`;
        try {
            const parsedError = JSON.parse(errorText);
            errorMessage = parsedError.error?.message || parsedError.error?.detail || errorMessage;
        } catch (e) {
            console.warn("Could not parse JSON error body for user list:", errorText);
        }
        throw new Error(errorMessage);
    }

    const data: UserListApiResponse = await res.json();
    
    // --- Data Transformation ---
    return data.results.map((rawUser: OpenMRSUserRaw): ManagedUser => {
        
        // 1. Determine the effective username
        // Fallback: use display if username is null
        const effectiveUsername = rawUser.username || rawUser.display || rawUser.systemId || 'N/A';

        // 2. Extract and format roles
        const activeRoles = rawUser.roles
            .filter(role => !role.retired)
            .map(role => role.display);
            
        // 3. Format last login timestamp
        const lastLogin = formatLastLogin(rawUser.userProperties.lastLoginTimestamp);

        // 4. Transform to ManagedUser object
        return {
            uuid: rawUser.uuid,
            fullName: rawUser.person.display,
            username: effectiveUsername,
            systemId: rawUser.systemId,
            gender: rawUser.person.gender || 'U', // Default to unknown
            roles: activeRoles,
            isRetired: rawUser.retired,
            lastLogin: lastLogin,
        };
    });
}
