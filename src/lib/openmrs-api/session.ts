'use server'
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { cookies } from "next/headers";

const NOT_AUTHENTICATED_SESSION = {
    authenticated: false,
    user: { uuid: '', display: 'Guest', roles: [] },
    sessionLocation: { uuid: '', display: 'No Location Set' },
    privileges: [],
};

export interface SessionDetails {
    authenticated: boolean;
    user: {
        uuid: string;
        display: string;
        roles: {uuid: string, display: string}[];
    };
    sessionLocation: {
        uuid:string;
        display: string;
    };
}

interface Privilege {
    uuid: string;
    display: string;
}

interface Role {
    uuid: string;
    display: string;
    privileges: Privilege[]
}

export interface UserWithPrivileges{
    uuid: string;
    display: string;
    roles: Role[];
}

export async function getOpenMRSSessionDetails() {
    console.log("getOpenMRSSession details function called")
    const url = `${process.env.OPENMRS_API_URL}/session`;
    const cookieStore = await cookies();
    const jsessionid = cookieStore.get('JSESSIONID')?.value
    if (!jsessionid) {
        cookieStore.delete('JSESSIONID');
        // redirect("/login");
        return NOT_AUTHENTICATED_SESSION
    }
     
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cookie': `JSESSIONID=${jsessionid}`
            },
            cache: 'no-store'
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                cookieStore.delete('JSESSIONID');
                // redirect('/login');
                return NOT_AUTHENTICATED_SESSION
            }
            throw new Error(`Failed to fetch Session Details: ${response.status}`);
        }

        const data: SessionDetails = await response.json()

        if (!data.authenticated) {
            cookieStore.delete('JSESSIONID');
            // redirect("/login")
            return NOT_AUTHENTICATED_SESSION
        }
        
        return data;
    } catch (error) {
        if (isRedirectError(error)) {
            throw error;
        }
        console.error('API call error in getOpenMRSSessionDetails:', error);
        throw new Error('Network or Server failure during session check.');
    }
}

export async function getPrivilegesForUser(UUID:string) {
    console.log("getPrivilegesForUser function is running")
    const url = `${process.env.OPENMRS_API_URL}/user/${UUID}?v=full&v=custom:(roles:full)`;
    const CookieStore = await cookies();
    const jsessionid = CookieStore.get('JSESSIONID')?.value;
    if (!jsessionid) {
        return [];
    }

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cookie': `JSESSIONID=${jsessionid}`
            },
            cache: 'no-store',
        })
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                CookieStore.delete('JSESSIONID');
                return [];
            }
            throw new Error("Failed to fetch privileges" + response.status)
        }

        const data:UserWithPrivileges = await response.json();

        //processing of the data
        const allPrivileges = new Set<string>();
        data.roles.forEach(role => {
            role.privileges.forEach(priv => {
                allPrivileges.add(priv.display);
            });
        });

        console.log("getPrivilegesForUser is done running")

        return Array.from(allPrivileges);
    } catch (error) {
        if (isRedirectError(error)) {
            throw error;
        }
        console.error("Api call for getPrivilegesforUser Failed: ", error)
        throw new Error("Network or server error during privileges fetch")
    }
}
