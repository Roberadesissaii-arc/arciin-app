// lib/spoilerService.ts
import { GoogleGenAI } from "@google/genai";
import { projectFirestore as db } from '@/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface SpoilerResponse {
  spoilers: string;
  success: boolean;
  error?: string;
}

interface CachedSpoiler {
  content: string;
  createdAt: number;
  title: string;
  type: 'movie' | 'tv';
  tmdbId?: number;
  year?: number;
  season?: number;
  audioUrl?: string;
  backgroundAudioUrl?: string;
  audioGeneratedAt?: number;
}

export class SpoilerService {
  private ai: GoogleGenAI;

  constructor() {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.ai = new GoogleGenAI({
      apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY
    });
  }

  private generateCacheKey(title: string, type: 'movie' | 'tv', year?: number, season?: number): string {
    const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const yearPart = year ? `-${year}` : '';
    const seasonPart = season ? `-season-${season}` : '';
    return `spoilers-${type}-${normalizedTitle}${yearPart}${seasonPart}`;
  }

  private async getCachedSpoiler(cacheKey: string): Promise<string | null> {
    try {
      const docRef = doc(db, 'spoilers', cacheKey);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as CachedSpoiler;
        return data.content;
      }
      
      return null;
    } catch (error) {
      // Silently fail and continue without cache
      return null;
    }
  }

  private async cacheSpoiler(
    cacheKey: string, 
    content: string, 
    title: string, 
    type: 'movie' | 'tv',
    tmdbId?: number,
    year?: number,
    season?: number
  ): Promise<void> {
    try {
      const spoilerData: CachedSpoiler = {
        content,
        createdAt: Date.now(),
        title,
        type,
        ...(tmdbId && { tmdbId }),
        ...(year && { year }),
        ...(season && { season })
      };
      
      await setDoc(doc(db, 'spoilers', cacheKey), spoilerData);
    } catch (error) {
      // Silently fail and continue without caching
    }
  }

  async updateSpoilerAudio(
    cacheKey: string,
    audioUrl: string,
    backgroundAudioUrl?: string
  ): Promise<void> {
    try {
      const docRef = doc(db, 'spoilers', cacheKey);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        await setDoc(docRef, {
          ...docSnap.data(),
          audioUrl,
          ...(backgroundAudioUrl && { backgroundAudioUrl }),
          audioGeneratedAt: Date.now()
        });
      }
    } catch (error) {
    }
  }

  async getSpoilerWithAudio(cacheKey: string): Promise<(CachedSpoiler & { cacheKey: string }) | null> {
    try {
      const docRef = doc(db, 'spoilers', cacheKey);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          ...(docSnap.data() as CachedSpoiler),
          cacheKey
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  async getMovieSpoilers(movieTitle: string, releaseYear?: number, tmdbId?: number): Promise<SpoilerResponse> {
    try {
      const cacheKey = this.generateCacheKey(movieTitle, 'movie', releaseYear);
      
      // Check cache first - this is shared across ALL users
      const cachedSpoilers = await this.getCachedSpoiler(cacheKey);
      if (cachedSpoilers) {
        return {
          spoilers: cachedSpoilers,
          success: true
        };
      }

      // Generate new spoilers if not cached using Google Search grounding
      const groundingTool = {
        googleSearch: {},
      };

      const config = {
        tools: [groundingTool],
      };

      const yearText = releaseYear ? ` (${releaseYear})` : '';
      const prompt = `Search for and analyze the movie "${movieTitle}${yearText}" and provide comprehensive plot spoilers.

Please search for current information about this specific movie. If the movie exists, provide a complete spoiler breakdown with these sections:

**PLOT SUMMARY**: Complete plot from beginning to end
**MAJOR TWISTS**: All significant plot twists and turns  
**CHARACTER DEATHS**: Who dies, when, and how
**BETRAYALS & RELATIONSHIPS**: Character betrayals and revelations
**ENDING EXPLAINED**: Detailed explanation of the ending
**SHOCKING MOMENTS**: Surprising revelations and plot devices
**RESOLUTION**: How conflicts are resolved

If you cannot find reliable information about this specific movie, simply state: "No reliable information found for this movie. Please verify the title and year."

Be thorough and specific about plot points, character arcs, and story developments. This is for viewers who want complete knowledge of the movie's plot.`;

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config,
      });

      const spoilers = response.text || '';

      // Cache the result - available for ALL users to read
      await this.cacheSpoiler(cacheKey, spoilers, movieTitle, 'movie', tmdbId, releaseYear);

      return {
        spoilers,
        success: true
      };
    } catch (error) {
      return {
        spoilers: '',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch spoilers'
      };
    }
  }

  async getTVShowSpoilers(showTitle: string, season?: number, tmdbId?: number): Promise<SpoilerResponse> {
    try {
      const cacheKey = this.generateCacheKey(showTitle, 'tv', undefined, season);
      
      // Check cache first - this is shared across ALL users
      const cachedSpoilers = await this.getCachedSpoiler(cacheKey);
      if (cachedSpoilers) {
        return {
          spoilers: cachedSpoilers,
          success: true
        };
      }

      // Generate new spoilers if not cached using Google Search grounding
      const groundingTool = {
        googleSearch: {},
      };

      const config = {
        tools: [groundingTool],
      };

      const seasonText = season ? ` Season ${season}` : ' (all seasons)';
      const prompt = `Search for and analyze the TV show "${showTitle}${seasonText}" and provide comprehensive plot spoilers.

Please search for current information about this specific TV show. If the show exists, provide a complete spoiler breakdown with these sections:

**MAIN PLOT ARCS**: Major storylines and how they develop/conclude
**CHARACTER DEATHS**: Who dies, in which episodes/seasons, and circumstances  
**MAJOR TWISTS**: Significant plot twists, reveals, and developments
**RELATIONSHIPS**: Romance, breakups, family secrets, betrayals
**SEASON FINALES**: Cliffhangers and major season-ending events
**CHARACTER DEPARTURES**: Why and how main characters leave
**VILLAIN REVEALS**: Identity reveals, antagonist motivations and defeats
**SERIES CONCLUSION**: How the show ends (if completed)

If you cannot find reliable information about this specific TV show, simply state: "No reliable information found for this TV show. Please verify the title."

Be thorough about character arcs, relationship developments, and major story beats. This is for viewers who want comprehensive knowledge of the show's plot.`;

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config,
      });

      const spoilers = response.text || '';

      // Cache the result - available for ALL users to read
      await this.cacheSpoiler(cacheKey, spoilers, showTitle, 'tv', tmdbId, undefined, season);

      return {
        spoilers,
        success: true
      };
    } catch (error) {
      return {
        spoilers: '',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch spoilers'
      };
    }
  }
}

export const spoilerService = new SpoilerService();