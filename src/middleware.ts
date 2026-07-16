import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected = pathname.startsWith('/admin') || pathname.startsWith('/editor');
  if (isProtected && !req.auth) {
    const url = new URL('/login', req.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }
  if (pathname === '/login' && req.auth) {
    return NextResponse.redirect(new URL('/admin', req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*', '/editor/:path*', '/login'],
};
