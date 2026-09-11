import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register');
    const isGovernmentPage = request.nextUrl.pathname.startsWith('/government');

    if (!token && !isAuthPage) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (token && isAuthPage) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Role-based access: Government dashboard only for GOVERNMENT role
    if (isGovernmentPage && token?.role !== 'GOVERNMENT') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/farms/:path*',
        '/weather/:path*',
        '/alerts/:path*',
        '/analytics/:path*',
        '/crops/:path*',
        '/calculator/:path*',
        '/settings/:path*',
        '/government/:path*',
        '/login',
        '/register',
    ],
};
