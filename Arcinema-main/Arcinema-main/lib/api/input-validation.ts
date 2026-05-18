// lib/api/input-validation.ts
// Input validation schemas and utilities

import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Create a validation error response
 */
export function createValidationErrorResponse(errors: z.ZodError): NextResponse {
  return NextResponse.json(
    {
      error: 'Validation failed',
      details: errors.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      })),
    },
    { status: 400 }
  );
}

/**
 * Validate request body against a Zod schema
 */
export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; response: NextResponse } {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    return {
      success: false,
      response: createValidationErrorResponse(result.error),
    };
  }
  
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Common validation schemas
 */
export const schemas = {
  userId: z.string().min(1, 'User ID is required').max(128),
  
  email: z.string().email('Invalid email address'),
  
  action: z.enum(['test', 'check_releases'], {
    errorMap: () => ({ message: 'Invalid action. Must be "test" or "check_releases"' }),
  }),
  
  personId: z.string().regex(/^\d+$/, 'Person ID must be a number').transform(Number),
  
  movieId: z.string().regex(/^\d+$/, 'Movie ID must be a number').transform(Number),
  
  tvShowId: z.string().regex(/^\d+$/, 'TV Show ID must be a number').transform(Number),
  
  notificationRequest: z.object({
    userId: z.string().min(1, 'User ID is required'),
    action: z.enum(['test', 'check_releases']),
  }),
  
  followRequest: z.object({
    userId: z.string().min(1, 'User ID is required'),
    item: z.object({
      id: z.string().min(1),
      type: z.enum(['user', 'movie', 'tv']),
    }),
  }),
};

