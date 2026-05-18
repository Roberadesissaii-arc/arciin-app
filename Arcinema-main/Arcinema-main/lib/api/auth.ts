import { NextRequest, NextResponse } from 'next/server';

// Admin email
const ADMIN_EMAIL = 'admin@arcinema.com';

export function verifyAdmin(request: NextRequest): boolean {
  const userEmail = request.headers.get('x-user-email');
  return userEmail === ADMIN_EMAIL;
}

export function requireAuth(request: NextRequest): string | null {
  const userEmail = request.headers.get('x-user-email');
  return userEmail;
}

export function createUnauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized access' },
    { status: 401 }
  );
}

export function createForbiddenResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Access forbidden - Admin privileges required' },
    { status: 403 }
  );
}

export function createNotFoundResponse(message: string = 'Resource not found'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 404 }
  );
}