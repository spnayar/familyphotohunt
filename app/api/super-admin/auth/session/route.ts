import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdminSessionFromRequest } from '@/lib/super-admin-auth';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    authenticated: getSuperAdminSessionFromRequest(request),
  });
}
