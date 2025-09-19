import { NextRequest, NextResponse } from "next/server";

export default function middleware(request: NextRequest) {
    const sessionId = request.cookies.get('JSESSIONID');

    const protectedPaths = [
        '/session-location',
        '/dashboard',
    ]

    let isProtectedRoute = false;
    for (const path of protectedPaths) {
        if (request.nextUrl.pathname.startsWith(path)) {
            isProtectedRoute = true;
            break;
        }
    }

    if (isProtectedRoute && !sessionId) {
        const loginUrl = new URL('/login', request.url)
        return NextResponse.redirect(loginUrl)
    }

    if (sessionId && request.nextUrl.pathname.startsWith('/login')) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();

}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};