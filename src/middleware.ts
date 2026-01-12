import { NextRequest, NextResponse } from "next/server";

export default function middleware(request: NextRequest) {
    const sessionId = request.cookies.get('JSESSIONID');
    const { pathname } = request.nextUrl;

    const protectedPaths = ['/session-location', '/dashboard'];
    const isProtectedRoute = protectedPaths.some(path => pathname.startsWith(path));

    // 1. Handle Protected Routes without a session
    if (isProtectedRoute && !sessionId) {
        const response = NextResponse.redirect(new URL('/login', request.url));
        // Force delete the cookie on the response to ensure client-side cleanup
        response.cookies.delete('JSESSIONID');
        return response;
    }

    // 2. Clear session if user manually visits /login while a cookie exists
    // (Optional: useful if you want to ensure a fresh start on the login page)
    if (pathname.startsWith('/login') && sessionId) {
        // If they are logged in but hit /login, you can either redirect to dashboard
        // OR clear the session to let them log in as someone else.
        // To clear and let them log in:
        const response = NextResponse.next();
        response.cookies.delete('JSESSIONID');
        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};