'use server'

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type AuthHeaders = {
    'Accept': 'application/json';
    'Content-Type': 'application/json';
    'Cookie': string;
};

export async function login(prevState: {error: string | null}, formData:FormData) {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
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
        redirect("/session-location");
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

export async function getAuthHeaders(): Promise<AuthHeaders>{
    const cookieStore = await cookies(); 
    const jsessionid = cookieStore.get('JSESSIONID')?.value;

    if (!jsessionid) {
        cookieStore.delete('JSESSIONID');
        redirect("/login");
    }
    
    return {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cookie': `JSESSIONID=${jsessionid}`,
    };
}

export async function redirectToLogin() {
    // Ensure we obtain the cookie store in the current request context
    try {
        const cookieStore = await cookies();
        const jsessionid = cookieStore.get('JSESSIONID')?.value;

        cookieStore.delete('JSESSIONID');
        if (!jsessionid) {
        cookieStore.delete('JSESSIONID');
        redirect("/login");
    }
    } catch (err) {
        if (isRedirectError(err)) {
            throw err;
        }
        // If cookies() cannot be accessed (no request context), just proceed to redirect.
        // We avoid throwing here to prevent uncaught ReferenceError in build/SSR.
        console.warn('redirectToLogin: cookies() not available in this context.', err);
    }
    redirect('/login');
}