import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/admin/login', request.url));
  response.cookies.set('admin_session', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  return response;
}
