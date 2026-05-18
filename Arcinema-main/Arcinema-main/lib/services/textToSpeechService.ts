// lib/textToSpeechService.ts
// Use fetch API directly instead of the full SDK to avoid Node.js dependencies

interface TTSResponse {
  success: boolean;
  audioUrl?: string;
  error?: string;
}

interface SoundEffectResponse {
  success: boolean;
  audioUrl?: string;
  error?: string;
}

export class TextToSpeechService {
  private apiKey: string;
  private baseUrl = "https://api.elevenlabs.io/v1";

  constructor() {
    if (!process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }
    this.apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
  }

  /**
   * Generate atmospheric sound effect for the story
   */
  async generateSoundEffect(prompt: string): Promise<SoundEffectResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/sound-generation`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: prompt,
          duration_seconds: 10, // 10 seconds of atmospheric sound
          prompt_influence: 0.5
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail?.message || `API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      return {
        success: true,
        audioUrl
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate sound effect'
      };
    }
  }

  /**
   * Convert text to speech using ElevenLabs API
   * @param text - The text to convert to speech
   * @param voiceId - The voice ID to use (default: "JBFqnCBsd6RMkjVDRZzb" - George voice)
   * @returns Audio blob URL
   */
  async convertToSpeech(text: string, voiceId: string = "JBFqnCBsd6RMkjVDRZzb"): Promise<TTSResponse> {
    try {
      // Clean the text - remove HTML tags and format properly
      const cleanText = this.cleanTextForSpeech(text);
      
      if (cleanText.length > 5000) {
        return {
          success: false,
          error: "Text is too long. Maximum 5000 characters supported."
        };
      }

      // Make direct API call
      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail?.message || `API error: ${response.status}`);
      }

      // Convert response to blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      return {
        success: true,
        audioUrl
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to convert text to speech'
      };
    }
  }

  /**
   * Clean text by removing HTML tags and formatting for speech
   */
  private cleanTextForSpeech(html: string): string {
    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, ' ');
    
    // Replace multiple spaces with single space
    text = text.replace(/\s+/g, ' ');
    
    // Replace common HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    
    // Add pauses after section headers (for better narration)
    text = text.replace(/([A-Z][A-Z\s&]+:)/g, '$1...');
    
    // Trim
    text = text.trim();
    
    return text;
  }

  /**
   * Get available voices from ElevenLabs
   */
  async getAvailableVoices() {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      return [];
    }
  }
}

export const textToSpeechService = new TextToSpeechService();
