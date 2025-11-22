'use server'

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { cookies, headers } from "next/headers"; // Added 'headers' import
import { redirect } from "next/navigation";

type AuthHeaders = {
    'Accept': 'application/json';
    'Content-Type': 'application/json';
    'Cookie': string;
};

// --- LOGIN ACTION ---
export async function login(prevState: {error: string | null}, formData:FormData) {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    // Extract the callback URL from the form data
    const callbackUrl = formData.get('callbackUrl') as string | null;

    if (!username || !password) {
        return {error: "Username and password are required"}
    }
    try {
        const credentials = Buffer.from(`${username}:${password}`).toString("base64");
        const response = await fetch(`${process.env.OPENMRS_API_URL}/session`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${credentials}`
            },
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.log({error: errorData.error.message})
            return {error: 'Login failed. Please check your credentials.'};
        }

        const data = await response.json();
        if (data.authenticated) {
            const setCookieHeader = response.headers.get("set-cookie");
            if (setCookieHeader) {
                const match = /JSESSIONID=([^;]+)/.exec(setCookieHeader);
                if (match) {
                    (await cookies()).set("JSESSIONID", match[1], {
                        httpOnly: true,
                        path: "/",
                        secure: process.env.NODE_ENV === "production",
                        maxAge: 7200,
                    });
                }
            }
            // Use the extracted URL for redirection, or fall back to default
            const finalRedirect = callbackUrl || "/session-location";
            redirect(finalRedirect);
        } else {
            return {error: 'Authentication failed. Please check your credentials.'};
        }

    } catch (error) {
        if (isRedirectError(error)) {
            throw error;
        }
        console.error('Login action error:', error);
        return {error: 'An unexpected error occurred during login.'};
    }
}

// --- AUTH HEADERS (REDIRECTION ON UNAUTHENTICATED) ---
export async function getAuthHeaders(): Promise<AuthHeaders>{
    const cookieStore = await cookies();
    const jsessionid = cookieStore.get('JSESSIONID')?.value;

    if (!jsessionid) {
        cookieStore.delete('JSESSIONID');
        
        // Capture the protected page's path to redirect back later
        const headersList = await headers();
        // Use 'x-pathname' or 'x-nextjs-matched-path' to get the current route path
        const pathname = headersList.get('x-pathname') || headersList.get('x-nextjs-matched-path') || '/';

        // Redirect to login, including the current path in the query
        redirect(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }

    return {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cookie': `JSESSIONID=${jsessionid}`,
    };
}

// --- MANUAL REDIRECT TO LOGIN (SESSION EXPIRED) ---
export async function redirectToLogin() {
    // This function can no longer capture the current URL reliably unless passed explicitly.
    // We'll redirect to /login directly, assuming this is called from an API error handler
    // where the session is known to be expired, and it's simpler to send them home.
    try {
        (await cookies()).delete('JSESSIONID');
    } catch (err) {
        if (isRedirectError(err)) {
            throw err;
        }
    }
    redirect('/login');
}