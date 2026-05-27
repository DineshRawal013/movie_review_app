import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Protects /admin/* routes.
 *
 * The presence of an access_token cookie is the only signal we have at the
 * edge (we cannot verify the JWT role without the secret). The API will
 * return 403 if the user is not an admin. This middleware provides a fast
 * redirect for users who are clearly unauthenticated (no token cookie at all),
 * keeping the UX clean without exposing server secrets at the edge.
 *
 * For authenticated non-admin users the browser will reach the page, but the
 * AdminService API calls will return 403 and the components will show nothing.
 * This is acceptable — the API is the authoritative enforcement layer.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('access_token');
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
