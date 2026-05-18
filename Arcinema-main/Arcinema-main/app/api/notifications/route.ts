// app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/features/notifications/notificationService';
import { requireAuth, createUnauthorizedResponse } from '@/lib/api/auth-middleware';
import { validateBody, schemas } from '@/lib/api/input-validation';
import { rateLimit, createRateLimitResponse } from '@/lib/api/rate-limit';
import { z } from 'zod';

// Rate limiter: 20 requests per minute per user
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20,
});

// Validation schema
const notificationSchema = z.object({
  userId: schemas.userId,
  action: schemas.action,
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const limit = limiter(request);
    if (!limit?.allowed) {
      return createRateLimitResponse(limit!.resetTime);
    }

    // Authentication
    const user = await requireAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    // Validate user can only create notifications for themselves
    const body = await request.json();
    const validation = validateBody(notificationSchema, body);
    
    if (!validation.success) {
      return validation.response;
    }

    const { userId, action } = validation.data;

    // Security: Users can only create notifications for themselves
    if (userId !== user.uid) {
      return NextResponse.json(
        { error: 'Forbidden - You can only create notifications for yourself' },
        { status: 403 }
      );
    }

    let result;

    switch (action) {
      case 'test':
        result = await notificationService.createTestNotification(userId);
        return NextResponse.json({ 
          success: true, 
          message: 'Test notification created',
          notificationId: result 
        });

      case 'check_releases':
        result = await notificationService.checkForNewReleases(userId);
        return NextResponse.json({ 
          success: true, 
          message: `Found ${result.length} new releases`,
          notifications: result 
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    // Don't leak error details in production
    console.error('Notification API error:', error);
    return NextResponse.json({ 
      error: 'Failed to process notification request'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Notifications API is working',
    endpoints: {
      'POST /api/notifications': 'Create test notification or check for new releases',
      'actions': ['test', 'check_releases']
    }
  });
}
