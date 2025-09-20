export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/dashboard/:path*', '/backlogs/:path*', '/epics/:path*', '/pbis/:path*']
};