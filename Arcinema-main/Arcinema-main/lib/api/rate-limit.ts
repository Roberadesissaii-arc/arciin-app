// lib/api/rate-limit.ts
// Simple in-memory rate limiting (for production, use Redis or similar)

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  identifier?: string; // Optional custom identifier (defaults to IP)
}

/**
 * Simple rate limiting middleware
 * For production, use a proper solution like Upstash Redis
 */
export function rateLimit(options: RateLimitOptions) {
  return (request: NextRequest): { allowed: boolean; remaining: number; resetTime: number } | null => {
    const identifier = options.identifier || 
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const now = Date.now();
    const key = `${identifier}:${Math.floor(now / options.windowMs)}`;

    if (!store[key]) {
      store[key] = {
        count: 0,
        resetTime: now + options.windowMs,
      };
    }

    store[key].count++;

    const remaining = Math.max(0, options.maxRequests - store[key].count);
    const allowed = store[key].count <= options.maxRequests;

    return {
      allowed,
      remaining,
      resetTime: store[key].resetTime,
    };
  };
}

/**
 * Create rate limit exceeded response
 */
export function createRateLimitResponse(resetTime: number): NextResponse {
  const resetSeconds = Math.ceil((resetTime - Date.now()) / 1000);
  
  return NextResponse.json(
    { 
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: resetSeconds,
    },
    { 
      status: 429,
      headers: {
        'Retry-After': resetSeconds.toString(),
        'X-RateLimit-Reset': resetTime.toString(),
      },
    }
  );
}

