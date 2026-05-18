// lib/audioStorageService.ts
import { projectStorage } from '@/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface UploadAudioResult {
  success: boolean;
  downloadUrl?: string;
  error?: string;
}

export class AudioStorageService {
  /**
   * Upload audio blob to Firebase Storage
   * @param audioBlob The audio data as a Blob
   * @param cacheKey Unique identifier for the spoiler (used as filename)
   * @param type Type of audio: 'narration' or 'background'
   * @returns Download URL or error
   */
  async uploadAudio(
    audioBlob: Blob,
    cacheKey: string,
    type: 'narration' | 'background'
  ): Promise<UploadAudioResult> {
    try {
      // Create a unique filename
      const timestamp = Date.now();
      const fileName = `${cacheKey}-${type}-${timestamp}.mp3`;
      const storageRef = ref(projectStorage, `spoiler-audio/${fileName}`);

      // Upload the audio blob
      const metadata = {
        contentType: 'audio/mpeg',
        customMetadata: {
          cacheKey,
          type,
          uploadedAt: new Date().toISOString()
        }
      };

      await uploadBytes(storageRef, audioBlob, metadata);

      // Get the download URL
      const downloadUrl = await getDownloadURL(storageRef);

      return {
        success: true,
        downloadUrl
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload audio'
      };
    }
  }

  /**
   * Convert a blob URL to an actual Blob object
   * @param blobUrl The blob:// URL
   * @returns Blob object
   */
  async blobUrlToBlob(blobUrl: string): Promise<Blob> {
    const response = await fetch(blobUrl);
    return await response.blob();
  }

  /**
   * Upload both narration and background audio to Firebase Storage
   * @param narrationBlobUrl Blob URL of the narration audio
   * @param backgroundBlobUrl Blob URL of the background audio (optional)
   * @param cacheKey Unique identifier for the spoiler
   * @returns Object with both download URLs
   */
  async uploadSpoilerAudio(
    narrationBlobUrl: string,
    backgroundBlobUrl: string | null,
    cacheKey: string
  ): Promise<{
    narrationUrl?: string;
    backgroundUrl?: string;
    success: boolean;
    error?: string;
  }> {
    try {
      const results: {
        narrationUrl?: string;
        backgroundUrl?: string;
        success: boolean;
        error?: string;
      } = { success: true };

      // Upload narration audio
      if (narrationBlobUrl) {
        const narrationBlob = await this.blobUrlToBlob(narrationBlobUrl);
        const narrationResult = await this.uploadAudio(
          narrationBlob,
          cacheKey,
          'narration'
        );

        if (narrationResult.success && narrationResult.downloadUrl) {
          results.narrationUrl = narrationResult.downloadUrl;
        } else {
          results.success = false;
          results.error = narrationResult.error;
          return results;
        }
      }

      // Upload background audio if provided
      if (backgroundBlobUrl) {
        const backgroundBlob = await this.blobUrlToBlob(backgroundBlobUrl);
        const backgroundResult = await this.uploadAudio(
          backgroundBlob,
          cacheKey,
          'background'
        );

        if (backgroundResult.success && backgroundResult.downloadUrl) {
          results.backgroundUrl = backgroundResult.downloadUrl;
        } else {
          // Background audio failure is not critical
        }
      }

      return results;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload audio'
      };
    }
  }
}

export const audioStorageService = new AudioStorageService();
