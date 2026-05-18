// lib/api/blocked-content-check.ts
// Server-side utility to check if content is blocked before returning to clients

import { getAllBlockedContent } from '@/lib/firebase/blockedContent';
import { NextResponse } from 'next/server';

/**
 * Check if content is blocked and return 404 if it is
 * Use this in API routes to prevent blocked content from being returned to clients
 */
export async function checkContentBlocked(
  id: number,
  mediaType: 'movie' | 'tv' | 'anime'
): Promise<NextResponse | null> {
  const blockedContent = await getAllBlockedContent();
  const contentKey = `${mediaType}_${id}`;
  
  if (blockedContent.has(contentKey)) {
    return NextResponse.json(
      { error: 'Content not found' },
      { status: 404 }
    );
  }
  
  return null; // Content is not blocked
}

/**
 * Filter out blocked content from an array of items
 */
export async function filterBlockedContentFromArray<T extends { id: number; media_type?: string }>(
  items: T[],
  defaultMediaType: 'movie' | 'tv' | 'anime' = 'movie'
): Promise<T[]> {
  const blockedContent = await getAllBlockedContent();
  
  return items.filter(item => {
    const mediaType = item.media_type || defaultMediaType;
    const contentKey = `${mediaType}_${item.id}`;
    return !blockedContent.has(contentKey);
  });
}

