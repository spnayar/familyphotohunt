import { NextResponse } from 'next/server';
import { clearSuperAdminSessionCookie } from '@/lib/super-admin-auth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  return clearSuperAdminSessionCookie(response);
}
