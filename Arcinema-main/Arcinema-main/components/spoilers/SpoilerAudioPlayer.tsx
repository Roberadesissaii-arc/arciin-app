"use client";

import React, { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, Loader2, Play, Pause, RefreshCw, Music, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { textToSpeechService } from "@/lib/services/textToSpeechService";

interface SpoilerAudioPlayerProps {
  spoilerText: string;
  movieTitle: string;
  cacheKey: string;
  existingAudioUrl?: string;
  existingBackgroundUrl?: string;
}

export default function SpoilerAudioPlayer({ 
  spoilerText, 
  movieTitle, 
  cacheKey,
  existingAudioUrl,
  existingBackgroundUrl 
}: SpoilerAudioPlayerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingAudioUrl || null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(existingBackgroundUrl || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [backgroundVolume, setBackgroundVolume] = useState(0.3);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string>('');
  const [generatingStatus, setGeneratingStatus] = useState<string>('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const backgroundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    if (backgroundRef.current) {
      backgroundRef.current.volume = isMuted ? 0 : backgroundVolume;
    }
  }, [volume, backgroundVolume, isMuted]);

  // Initialize audio elements if URLs are provided from cache
  useEffect(() => {
    if (existingAudioUrl && !audioRef.current) {
      const audio = new Audio(existingAudioUrl);
      audio.volume = isMuted ? 0 : volume;
      
      audio.onloadedmetadata = () => {
        setDuration(audio.duration);
      };
      
      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };
      
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (backgroundRef.current) {
          backgroundRef.current.pause();
        }
      };
      
      audioRef.current = audio;
    }

    if (existingBackgroundUrl && !backgroundRef.current) {
      const bgAudio = new Audio(existingBackgroundUrl);
      bgAudio.loop = true;
      bgAudio.volume = isMuted ? 0 : backgroundVolume;
      backgroundRef.current = bgAudio;
    }
  }, [existingAudioUrl, existingBackgroundUrl, volume, backgroundVolume, isMuted]);

  const handleGenerateAudio = async () => {
    setIsGenerating(true);
    setError('');
    
    try {
      // Generate main narration only (no background sound effects)
      setGeneratingStatus('Creating audio narration...');
      const result = await textToSpeechService.convertToSpeech(spoilerText);
      
      if (result.success && result.audioUrl) {
        // Set audio URL immediately so user sees it's ready
        setAudioUrl(result.audioUrl);
        
        // Upload audio file to Firebase Storage in background
        setGeneratingStatus('Saving to storage...');
        try {
          const { audioStorageService } = await import('@/lib/services/audioStorageService');
          const uploadResult = await audioStorageService.uploadSpoilerAudio(
            result.audioUrl,
            null, // No background audio
            cacheKey
          );

          if (uploadResult.success && uploadResult.narrationUrl) {
            // Update with Firebase Storage URL
            const finalNarrationUrl = uploadResult.narrationUrl;
            
            setAudioUrl(finalNarrationUrl);

            // Save Firebase Storage URL to Firestore
            const { spoilerService } = await import('@/lib/features/media/spoilerService');
            await spoilerService.updateSpoilerAudio(
              cacheKey,
              finalNarrationUrl,
              undefined // No background audio
            );

            // Update audio element with permanent URL
            const audio = new Audio(finalNarrationUrl);
            audio.volume = isMuted ? 0 : volume;
            
            audio.onloadedmetadata = () => {
              setDuration(audio.duration);
            };
            
            audio.ontimeupdate = () => {
              setCurrentTime(audio.currentTime);
            };
            
            audio.onended = () => {
              setIsPlaying(false);
              setCurrentTime(0);
            };
            
            audioRef.current = audio;
            setGeneratingStatus('');
          } else {
            // Fallback to blob URL if upload fails
            setAudioUrl(result.audioUrl);
            
            const audio = new Audio(result.audioUrl);
            audio.volume = isMuted ? 0 : volume;
            
            audio.onloadedmetadata = () => {
              setDuration(audio.duration);
            };
            
            audio.ontimeupdate = () => {
              setCurrentTime(audio.currentTime);
            };
            
            audio.onended = () => {
              setIsPlaying(false);
              setCurrentTime(0);
            };
            
            audioRef.current = audio;
            setGeneratingStatus('');
          }
        } catch (uploadErr) {
          // Continue with blob URL even if upload fails
          setAudioUrl(result.audioUrl);
          
          const audio = new Audio(result.audioUrl);
          audio.volume = isMuted ? 0 : volume;
          
          audio.onloadedmetadata = () => {
            setDuration(audio.duration);
          };
          
          audio.ontimeupdate = () => {
            setCurrentTime(audio.currentTime);
          };
          
          audio.onended = () => {
            setIsPlaying(false);
            setCurrentTime(0);
          };
          
          audio.onended = () => {
            setIsPlaying(false);
            setCurrentTime(0);
            if (backgroundRef.current) {
              backgroundRef.current.pause();
              backgroundRef.current.currentTime = 0;
            }
          };
          
          audioRef.current = audio;
          setGeneratingStatus('');
        }
      } else {
        setError(result.error || 'Failed to generate audio');
      }
    } catch (err) {
      setError('Failed to generate audio');
    } finally {
      setIsGenerating(false);
      setGeneratingStatus('');
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    
    const newTime = value[0];
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : newVolume;
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleRegenerate = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setCurrentTime(0);
    }
    
    if (backgroundRef.current) {
      backgroundRef.current.pause();
      backgroundRef.current.currentTime = 0;
    }
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    if (backgroundUrl) {
      URL.revokeObjectURL(backgroundUrl);
    }
    
    setAudioUrl(null);
    setBackgroundUrl(null);
    handleGenerateAudio();
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (backgroundRef.current) {
        backgroundRef.current.pause();
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (backgroundUrl) {
        URL.revokeObjectURL(backgroundUrl);
      }
    };
  }, [audioUrl, backgroundUrl]);

  return (
    <div className="mt-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <Volume2 className="w-6 h-6 text-indigo-400" />
        <h3 className="text-lg font-semibold text-white">
          Listen to Spoilers
        </h3>
      </div>

      <p className="text-gray-400 text-sm mb-4">
        Experience the spoilers through audio narration.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-400/30 rounded-lg">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {!audioUrl && !isGenerating && (
        <Button
          onClick={handleGenerateAudio}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Listen to Spoilers
        </Button>
      )}

      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-8 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <div className="text-center">
            <span className="text-gray-300 block">{generatingStatus || 'Preparing your audio experience...'}</span>
            <span className="text-xs text-gray-500 mt-1 block">This may take a moment</span>
          </div>
        </div>
      )}

      {audioUrl && !isGenerating && (
        <div className="space-y-4">
          {/* Play/Pause and Regenerate Controls */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handlePlayPause}
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </Button>

            <Button
              onClick={handleRegenerate}
              variant="outline"
              size="sm"
              className="border-indigo-400/30 text-indigo-300 hover:bg-indigo-500/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </Button>

            <div className="flex-1" />

            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              
              <div className="w-24">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  onValueChange={handleVolumeChange}
                  max={1}
                  step={0.01}
                  className="cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Slider
              value={[currentTime]}
              onValueChange={handleSeek}
              max={duration || 100}
              step={0.1}
              className="cursor-pointer"
            />
            
            <div className="flex justify-between text-xs text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Audio Visualization (Optional wave effect) */}
          <div className="flex items-center justify-center gap-1 h-12">
            {isPlaying && (
              <>
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-indigo-400 rounded-full animate-pulse"
                    style={{
                      height: `${Math.random() * 100 + 20}%`,
                      animationDelay: `${i * 0.05}s`,
                      animationDuration: `${0.5 + Math.random() * 0.5}s`
                    }}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
