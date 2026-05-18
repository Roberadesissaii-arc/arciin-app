// app/api/check-new-releases/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { projectFirestore as db } from '@/firebase/config';
import { emailNotificationService } from '@/lib/features/notifications/emailNotificationService';
import { getAllBlockedContent } from '@/lib/firebase/blockedContent';

export async function POST(request: NextRequest) {
  try {
    const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'TMDB API key not configured' },
        { status: 500 }
      );
    }

    // Get current date and date 7 days ago for recent releases
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);

    const todayStr = today.toISOString().split('T')[0];
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    // Fetch movies released in the last week from TMDB
    const response = await fetch(
      `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&primary_release_date.gte=${weekAgoStr}&primary_release_date.lte=${todayStr}&sort_by=popularity.desc&vote_average.gte=6.5&page=1`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch from TMDB');
    }

    const data = await response.json();
    let newMovies = data.results?.slice(0, 5) || []; // Get top 5 new releases
    
    // SECURITY: Filter out blocked content before processing
    const blockedContent = await getAllBlockedContent();
    newMovies = newMovies.filter((movie: any) => {
      const contentKey = `movie_${movie.id}`;
      return !blockedContent.has(contentKey);
    });
    
    if (newMovies.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new releases found',
        moviesFound: 0
      });
    }

    // Get all users with email notifications enabled
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    const usersToNotify: Array<{ uid: string; email: string }> = [];
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      const notifications = userData.notifications || {};
      
      if (notifications.email === true && notifications.newReleases === true && userData.email) {
        usersToNotify.push({
          uid: doc.id,
          email: userData.email
        });
      }
    });
    let totalNotificationsSent = 0;
    let totalEmailsSent = 0;

    // Process each new movie
    for (const movie of newMovies) {
      // Check if we've already notified about this movie
      const existingNotificationsQuery = query(
        collection(db, 'notifications'),
        where('type', '==', 'new_release'),
        where('movieData.id', '==', movie.id)
      );

      const existingNotifications = await getDocs(existingNotificationsQuery);
      
      if (existingNotifications.size > 0) {
        continue;
      }

      // Create notifications and send emails for this movie
      for (const user of usersToNotify) {
        try {
          // Create in-app notification
          await addDoc(collection(db, 'notifications'), {
            userId: user.uid,
            type: 'new_release',
            title: '🎬 New Movie Released!',
            message: `${movie.title} is now available to watch`,
            movieData: {
              id: movie.id,
              title: movie.title,
              poster_path: movie.poster_path
            },
            isRead: false,
            createdAt: serverTimestamp()
          });
          totalNotificationsSent++;

          // Send email notification
          const emailSent = await emailNotificationService.sendTestNotification(user.email, {
            title: movie.title,
            year: movie.release_date ? new Date(movie.release_date).getFullYear().toString() : undefined,
            description: movie.overview,
            poster: movie.poster_path,
            id: movie.id,
            releaseDate: movie.release_date
          });

          if (emailSent) {
            totalEmailsSent++;
          }
        } catch (error) {
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'New release notifications sent',
      moviesFound: newMovies.length,
      usersNotified: usersToNotify.length,
      notificationsSent: totalNotificationsSent,
      emailsSent: totalEmailsSent,
      movies: newMovies.map((m: any) => ({
        id: m.id,
        title: m.title,
        releaseDate: m.release_date
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint for manual trigger
export async function GET() {
  return NextResponse.json({
    message: 'Check New Releases API',
    usage: 'POST to this endpoint to check for new releases and notify users',
    note: 'This should be called by a cron job daily'
  });
}
