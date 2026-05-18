// app/api/notify-release/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { emailNotificationService } from '@/lib/features/notifications/emailNotificationService';
import { notificationService } from '@/lib/features/notifications/notificationService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { movie } = body;

    if (!movie || !movie.title) {
      return NextResponse.json(
        { error: 'Movie data with title is required' },
        { status: 400 }
      );
    }

    // Send email notifications to all subscribed users
    const emailResults = await emailNotificationService.notifyNewRelease(movie);

    // Also create in-app notifications for users
    // Note: This would need to iterate through users, but for now we'll just return email results

    return NextResponse.json({
      success: true,
      message: 'Notifications sent',
      emailsSent: emailResults.success,
      emailsFailed: emailResults.failed,
      totalEmails: emailResults.success + emailResults.failed
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'Notify Release API is working',
    usage: 'Send a POST request with movie data',
    example: {
      movie: {
        title: 'Movie Title',
        year: '2024',
        description: 'Movie description',
        poster: '/poster-path.jpg',
        id: 12345,
        releaseDate: '2024-01-01'
      }
    }
  });
}
