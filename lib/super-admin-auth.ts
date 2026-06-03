import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, verifyPassword } from '@/lib/auth';

export const SUPER_ADMIN_COOKIE_NAME = 'super_admin_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

function getSessionSecret(): string | null {
  return process.env.SUPER_ADMIN_SESSION_SECRET || null;
}

function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

function createSessionToken(): string | null {
  const secret = getSessionSecret();
  if (!secret) return null;

  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = JSON.stringify({ exp: expiresAt });
  const payloadEncoded = Buffer.from(payload, 'utf8').toString('base64url');
  const signature = signPayload(payloadEncoded, secret);
  return `${payloadEncoded}.${signature}`;
}

function parseSessionToken(token: string): boolean {
  const secret = getSessionSecret();
  if (!secret) return false;

  const [payloadEncoded, signature] = token.split('.');
  if (!payloadEncoded || !signature) return false;

  const expectedSignature = signPayload(payloadEncoded, secret);
  const signatureBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString('utf8')) as {
      exp?: number;
    };
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function isSuperAdminConfigured(): boolean {
  return Boolean(
    process.env.SUPER_ADMIN_USERNAME &&
      process.env.SUPER_ADMIN_PASSWORD &&
      process.env.SUPER_ADMIN_SESSION_SECRET
  );
}

export async function verifySuperAdminCredentials(
  username: string,
  password: string
): Promise<boolean> {
  const expectedUsername = process.env.SUPER_ADMIN_USERNAME;
  const expectedPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return false;
  }

  if (username.trim() !== expectedUsername) {
    return false;
  }

  const expectedHash = await hashPassword(expectedPassword);
  return verifyPassword(password, expectedHash);
}

export function getSuperAdminSessionFromRequest(request: NextRequest): boolean {
  const token = request.cookies.get(SUPER_ADMIN_COOKIE_NAME)?.value;
  if (!token) return false;
  return parseSessionToken(token);
}

export function attachSuperAdminSessionCookie(response: NextResponse): NextResponse {
  const token = createSessionToken();
  if (!token) {
    throw new Error('Super admin session is not configured');
  }

  response.cookies.set(SUPER_ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  });

  return response;
}

export function clearSuperAdminSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(SUPER_ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}

export function unauthorizedSuperAdminResponse(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
