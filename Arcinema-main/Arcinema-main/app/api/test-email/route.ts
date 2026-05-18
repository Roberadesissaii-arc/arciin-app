// app/api/test-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { emailNotificationService } from '@/lib/features/notifications/emailNotificationService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, movie } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Send test notification
    const success = await emailNotificationService.sendTestNotification(email, movie);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send test email' },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to test webhook connectivity
export async function GET() {
  return NextResponse.json({
    message: 'Test email API is working',
    webhookUrl: 'https://n8n.srv836694.hstgr.cloud/webhook-test/notify-movie',
    instructions: 'Send a POST request with { "email": "user@example.com", "movie": {...} }'
  });
}
