"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;
    let updateInterval: NodeJS.Timeout | null = null;
    let handleUpdateFound: (() => void) | null = null;

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      registration = reg;

      // Check for updates on load
      registration.update();

      // Listen for update found
      handleUpdateFound = () => {
        const newWorker = registration?.installing;
        if (newWorker) {
          const handleStateChange = () => {
            // When new worker is installed but not yet active
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Check if user has already dismissed this update
              const updateDismissed = sessionStorage.getItem('update-dismissed');
              if (!updateDismissed) {
                setShowUpdate(true);
              }
            }
          };
          newWorker.addEventListener('statechange', handleStateChange);
        }
      };

      registration.addEventListener('updatefound', handleUpdateFound);

      // Check for updates periodically
      updateInterval = setInterval(() => {
        registration?.update();
      }, 60 * 60 * 1000); // Every hour
    });

    // Cleanup
    return () => {
      if (registration && handleUpdateFound) {
        registration.removeEventListener('updatefound', handleUpdateFound);
      }
      if (updateInterval) {
        clearInterval(updateInterval);
      }
    };
  }, []);

  const handleUpdate = () => {
    setIsUpdating(true);
    
    // Send message to service worker to skip waiting
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }

    // Reload the page after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleDismiss = () => {
    setShowUpdate(false);
    // Store dismissal in session storage (only for this session)
    sessionStorage.setItem('update-dismissed', 'true');
  };

  // Only show on mobile devices
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (!isMobile || !showUpdate) return null;

  return (
    <AnimatePresence>
      {showUpdate && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-4 right-4 md:hidden z-[100]"
        >
          <div className="bg-black/40 backdrop-blur-3xl border border-white/20 rounded-2xl shadow-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-600/30 to-purple-600/30 rounded-xl flex items-center justify-center backdrop-blur-sm border border-indigo-500/30">
                <Sparkles className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-bold text-white text-base mb-1">New Update Available</p>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      A new version of Arcinema is available with the latest features and improvements
                    </p>
                  </div>
                  <button
                    onClick={handleDismiss}
                    className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    aria-label="Dismiss"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={handleDismiss}
                    variant="outline"
                    size="sm"
                    disabled={isUpdating}
                    className="flex-1 h-9 text-xs font-medium border-white/20 hover:bg-white/10"
                  >
                    Later
                  </Button>
                  <Button
                    onClick={handleUpdate}
                    size="sm"
                    disabled={isUpdating}
                    className="flex-1 h-9 text-xs font-bold bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:via-indigo-400 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                  >
                    {isUpdating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        Update Now
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

