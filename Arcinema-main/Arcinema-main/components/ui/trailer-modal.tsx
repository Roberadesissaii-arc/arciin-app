// components/ui/trailer-modal.tsx
"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trailerUrl: string | null;
  title: string;
}

export default function TrailerModal({ isOpen, onClose, trailerUrl, title }: TrailerModalProps) {
  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (!trailerUrl) return null;

  const videoId = getYouTubeVideoId(trailerUrl);
  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&showinfo=0` : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-auto p-0 bg-black border-gray-800">
        <VisuallyHidden>
          <DialogTitle>{title} - Trailer</DialogTitle>
        </VisuallyHidden>
        <div className="relative">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-50 bg-black/50 hover:bg-black/70 text-white"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>

          {/* Video container */}
          <div className="relative w-full" style={{ paddingBottom: '56.25%' /* 16:9 aspect ratio */ }}>
            {embedUrl ? (
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src={embedUrl}
                title={`${title} - Trailer`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-gray-900 rounded-lg">
                <div className="text-center text-white">
                  <p className="mb-4">Unable to load trailer</p>
                  <Button
                    variant="outline"
                    onClick={() => window.open(trailerUrl, '_blank')}
                  >
                    Open in New Tab
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="p-4 bg-black/90">
            <h3 className="text-lg font-semibold text-white">{title} - Trailer</h3>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
