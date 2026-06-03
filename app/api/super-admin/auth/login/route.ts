import { NextRequest, NextResponse } from 'next/server';
import {
  attachSuperAdminSessionCookie,
  isSuperAdminConfigured,
  verifySuperAdminCredentials,
} from '@/lib/super-admin-auth';

export async function POST(request: NextRequest) {
  try {
    if (!isSuperAdminConfigured()) {
      return NextResponse.json(
        { error: 'Super admin login is not configured on this server.' },
        { status: 503 }
      );
    }

    const { username, password } = await request.json();

    if (!username?.trim() || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const valid = await verifySuperAdminCredentials(username.trim(), password);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    return attachSuperAdminSessionCookie(response);
  } catch (error: unknown) {
    console.error('Super admin login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
