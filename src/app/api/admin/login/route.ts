import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const { username, password } = (await request.json()) as {
    username: string;
    password: string;
  };

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_session', 'authenticated', {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
    });
    return response;
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}
