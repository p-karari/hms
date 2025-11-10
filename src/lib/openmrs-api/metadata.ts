'use server';

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getAuthHeaders, redirectToLogin } from "../auth/auth";


interface OpenMRSRole {
    uuid: string;
    display: string;
    name?: string; 
}

interface OpenMRSListResponse<T> {
    results: T[];
}

const ALL_ROLES_CACHE = new Map<string, OpenMRSRole[]>();
const ROLE_CACHE = new Map<string, string>(); 


export async function fetchAllRolesForForm(): Promise<OpenMRSRole[]> {
    const cacheKey = 'all_roles';
    if (ALL_ROLES_CACHE.has(cacheKey)) {
        return ALL_ROLES_CACHE.get(cacheKey)!;
    }
    
    const baseUrl = process.env.OPENMRS_API_URL;
    let headers: Record<string, string>; 
    
    try {
        headers = await getAuthHeaders();
    } catch (e: unknown) { 
        if (isRedirectError(e as Error)) throw e;
        
        if (e instanceof Error) console.log(e.message);
        else console.log("Authentication failed with unknown error:", e);
        
        redirectToLogin(); 
        throw new Error("Authentication failed during role fetch."); 
    }
    
    try {
        const response = await fetch(`${baseUrl}/role?v=custom:(uuid,display,name)`, {
            method: 'GET',
            headers: headers,
            cache: 'force-cache' 
        });

        if (response.status === 401 || response.status === 403) {
            redirectToLogin();
        }
        if (!response.ok) {
            throw new Error(`Failed to fetch role list: ${response.status}`);
        }

        const data: OpenMRSListResponse<OpenMRSRole> = await response.json(); 
        
        const roles = data.results.map((r) => ({
            uuid: r.uuid,
            display: r.display, 
            name: r.name 
        })) as OpenMRSRole[];
        
        ALL_ROLES_CACHE.set(cacheKey, roles);
        return roles;

    } catch (error: unknown) { 
        if (isRedirectError(error as Error)) throw error; 
        
        if (error instanceof Error) {
            console.error("Error fetching all roles:", error.message);
            throw new Error(`Could not load system roles for the user creation form: ${error.message}`);
        } else {
            console.error("Error fetching all roles (unknown type):", error);
            throw new Error("Could not load system roles for the user creation form.");
        }
    }
}

export async function fetchRoleUuid(roleName: string): Promise<string> {
    
    if (ROLE_CACHE.has(roleName)) {
        console.log(`Using cached UUID for role: ${roleName}`);
        return ROLE_CACHE.get(roleName)!;
    }

    const baseUrl = process.env.OPENMRS_API_URL;
    let headers: Record<string, string>;
    
    try {
        headers = await getAuthHeaders();
    } catch (e: unknown) { 
        redirectToLogin();
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

        const data: OpenMRSListResponse<OpenMRSRole> = await response.json(); 
        
        const role = data.results.find(
            (r) => r.name?.toLowerCase() === roleName.toLowerCase() || r.display?.toLowerCase() === roleName.toLowerCase()
        );
        
        if (!role) {
            throw new Error(`Required system role '${roleName}' not found in OpenMRS system. Check configurations.`);
        }

        ROLE_CACHE.set(roleName, role.uuid);
        return role.uuid;

    } catch (error: unknown) {
        if (error instanceof Error) {
            throw error;
        }
        
        console.error(`Unexpected error in fetchRoleUuid for ${roleName}:`, error);
        throw new Error(`Failed to initialize required system roles due to a network or server issue.`);
    }
}