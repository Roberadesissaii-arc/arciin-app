// app/api/check-releases/route.ts
import { NextResponse } from 'next/server';
import { notificationChecker } from '@/lib/features/notifications/notificationChecker';

export async function POST() {
  try {
    await notificationChecker.triggerReleaseCheck();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Release notification check completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to check releases',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Release notification checker API',
    endpoints: {
      'POST /api/check-releases': 'Manually trigger release notification check'
    }
  });
}
