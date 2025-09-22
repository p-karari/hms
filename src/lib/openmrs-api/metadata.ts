'use server';

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getAuthHeaders, redirectToLogin } from "../auth/auth";

// --- TYPE DEFINITIONS ---

interface OpenMRSRole {
    uuid: string;
    display: string;
    // Note: The OpenMRS API often uses 'name' which is similar to 'display'
    name?: string; 
}

interface OpenMRSListResponse<T> {
    results: T[];
}

// 3. Define the type for the cache, which will hold the final array of results
const ALL_ROLES_CACHE = new Map<string, OpenMRSRole[]>();
const ROLE_CACHE = new Map<string, string>(); 

// --- /role helper functions ---

/**
 * Fetches all available OpenMRS roles for display in a multi-select form.
 * Caches the results aggressively since roles rarely change.
 * @returns A promise resolving to an array of { uuid, display } roles.
 */
export async function fetchAllRolesForForm(): Promise<OpenMRSRole[]> {
    const cacheKey = 'all_roles';
    if (ALL_ROLES_CACHE.has(cacheKey)) {
        return ALL_ROLES_CACHE.get(cacheKey)!;
    }
    
    const baseUrl = process.env.OPENMRS_API_URL;
    let headers: Record<string, string>; // Specify the type for headers
    
    try {
        headers = await getAuthHeaders();
    } catch (e: unknown) { // Use unknown
        // Safely check for RedirectError, otherwise log and redirect
        if (isRedirectError(e as Error)) throw e;
        
        // Log the error detail safely
        if (e instanceof Error) console.log(e.message);
        else console.log("Authentication failed with unknown error:", e);
        
        redirectToLogin(); // Authentication failed, trigger login
        // Throw an error to ensure the calling function knows the fetch failed
        throw new Error("Authentication failed during role fetch."); 
    }
    
    try {
        // Fetch all roles with a custom representation to get only UUID and display name
        const response = await fetch(`${baseUrl}/role?v=custom:(uuid,display,name)`, {
            method: 'GET',
            headers: headers,
            cache: 'force-cache' // Aggressively cache for performance
        });

        if (response.status === 401 || response.status === 403) {
            redirectToLogin();
        }
        if (!response.ok) {
            throw new Error(`Failed to fetch role list: ${response.status}`);
        }

        // Type the API response correctly
        const data: OpenMRSListResponse<OpenMRSRole> = await response.json(); 
        
        // Map and assert the final structure (though the API response should match OpenMRSRole)
        const roles = data.results.map((r) => ({
            uuid: r.uuid,
            display: r.display, 
            name: r.name // Include name for robustness
        })) as OpenMRSRole[];
        
        ALL_ROLES_CACHE.set(cacheKey, roles);
        return roles;

    } catch (error: unknown) { // Use unknown
        // Check for redirect errors (e.g., if fetch fails mid-request and rethrows)
        if (isRedirectError(error as Error)) throw error; 
        
        // Safely log the error detail
        if (error instanceof Error) {
            console.error("Error fetching all roles:", error.message);
            throw new Error(`Could not load system roles for the user creation form: ${error.message}`);
        } else {
            console.error("Error fetching all roles (unknown type):", error);
            throw new Error("Could not load system roles for the user creation form.");
        }
    }
}

// NOTE: Running this here will execute the fetch and print to the terminal on server startup
const roles = await fetchAllRolesForForm(); 
console.log("All Roles in system: ", roles);


/**
 * Fetches the UUID for an OpenMRS Role by its name (e.g., 'Provider', 'Authenticated').
 * Uses an in-memory cache to prevent repeated API calls for static metadata.
 * @param roleName The name of the role as defined in OpenMRS.
 * @returns A Promise that resolves to the UUID of the role.
 * @throws An error if the role is not found, authentication fails, or the API call fails.
 */
export async function fetchRoleUuid(roleName: string): Promise<string> {
    
    if (ROLE_CACHE.has(roleName)) {
        console.log(`Using cached UUID for role: ${roleName}`);
        return ROLE_CACHE.get(roleName)!;
    }

    const baseUrl = process.env.OPENMRS_API_URL;
    let headers: Record<string, string>; // Specify the type for headers
    
    try {
        headers = await getAuthHeaders();
    } catch (e: unknown) { // Use unknown
        // If getAuthHeaders throws (no JSESSIONID), redirect to login
        redirectToLogin();
        // Safely throw an informative error
        const authError = e instanceof Error ? e.message : "unknown authentication error";
        throw new Error("Authentication failed: " + authError);
    }

    try {
        const response = await fetch(`${baseUrl}/role?q=${roleName}&v=custom:(uuid,name,display)`, {
            method: 'GET',
            headers,
            cache: 'force-cache' 
        });

        if (response.status === 401 || response.status === 403) {
            redirectToLogin();
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error searching for role ${roleName}: ${errorText}`);
            throw new Error(`OpenMRS API failure while looking up role '${roleName}'. Status: ${response.status}.`);
        }

        // Type the JSON data
        const data: OpenMRSListResponse<OpenMRSRole> = await response.json(); 
        
        // The find callback is safe because we typed 'data.results'
        const role = data.results.find(
            (r) => r.name?.toLowerCase() === roleName.toLowerCase() || r.display?.toLowerCase() === roleName.toLowerCase()
        );
        
        if (!role) {
            throw new Error(`Required system role '${roleName}' not found in OpenMRS system. Check configurations.`);
        }

        ROLE_CACHE.set(roleName, role.uuid);
        return role.uuid;

    } catch (error: unknown) { // Use unknown
        // Re-throw any specific error, but wrap unexpected errors
        if (error instanceof Error) {
            // Re-throw the error as-is if it's already an Error object
            throw error;
        }
        
        console.error(`Unexpected error in fetchRoleUuid for ${roleName}:`, error);
        throw new Error(`Failed to initialize required system roles due to a network or server issue.`);
    }
}