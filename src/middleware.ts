import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // Allow the request to continue
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // If accessing protected routes, check for token
        const { pathname } = req.nextUrl;
        const isProtectedRoute = ['/dashboard', '/backlogs', '/epics', '/pbis'].some(
          route => pathname.startsWith(route)
        );

        if (isProtectedRoute) {
          return !!token;
        }

        // Allow access to other routes
        return true;
      },
    },
    pages: {
      signIn: '/auth/login',
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*', '/backlogs/:path*', '/epics/:path*', '/pbis/:path*']
};