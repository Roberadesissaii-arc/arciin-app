"use client";

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandaloneMode = 
      (window.matchMedia('(display-mode: standalone)').matches) ||
      ((window.navigator as any).standalone) ||
      document.referrer.includes('android-app://');
    
    setIsStandalone(isStandaloneMode);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Register service worker
    if ('serviceWorker' in navigator) {
      // First, unregister any old service workers to ensure clean slate
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        const shouldClearCache = registrations.some(reg => 
          reg.active && reg.active.scriptURL.includes('/sw.js')
        );
        
        if (shouldClearCache) {
          // Clear old caches
          caches.keys().then((cacheNames) => {
            return Promise.all(
              cacheNames
                .filter(cacheName => cacheName.startsWith('arcaureus-stream-v1.0.0') || cacheName.startsWith('arcaureus-stream-v1.0.1'))
                .map(cacheName => caches.delete(cacheName))
            );
          });
        }
      });

      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then((registration) => {
          // Force immediate update check
          registration.update();

          // Check for updates every hour
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);

          // Check for updates - handled by UpdateNotification component
          // We don't auto-reload here anymore, let the user choose

          // Reload when the new service worker takes control
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
          });
        })
        .catch((error) => {
        });
    }

    // Handle PWA install prompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Check if user has dismissed before
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      const dismissedTime = dismissed ? parseInt(dismissed) : 0;
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      
      // Show if not dismissed or dismissed more than 1 day ago
      if (!dismissed || (now - dismissedTime) > oneDay) {
        setShowInstallButton(true);
      }
    };

    // Handle successful installation
    const handleAppInstalled = () => {
      setShowInstallButton(false);
      setDeferredPrompt(null);
      localStorage.removeItem('pwa-install-dismissed');
      toast({
        title: "App Installed!",
        description: "Arcinema has been added to your home screen.",
        duration: 5000,
      });
    };

    // For iOS, show install prompt after a delay
    if (iOS && !isStandaloneMode) {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      const dismissedTime = dismissed ? parseInt(dismissed) : 0;
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      
      if (!dismissed || (now - dismissedTime) > oneDay) {
        // Show iOS prompt after 3 seconds
        setTimeout(() => {
          setShowInstallButton(true);
        }, 3000);
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Clean up event listeners
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [toast]);

  const handleInstallApp = async () => {
    if (isIOS) {
      // For iOS, show instructions
      toast({
        title: "Add to Home Screen",
        description: "Tap the share button, then select 'Add to Home Screen'",
        duration: 5000,
      });
      setShowInstallButton(false);
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
      return;
    }

    if (!deferredPrompt) return;

    try {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user's response
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        toast({
          title: "Installing...",
          description: "Adding Arcinema to your home screen.",
          duration: 2000,
        });
      }
      
      // Reset the deferred prompt
      setDeferredPrompt(null);
      setShowInstallButton(false);
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    } catch (error) {
      console.error('Error installing app:', error);
    }
  };

  const handleDismiss = () => {
    setShowInstallButton(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if already installed or not on mobile
  if (isStandalone || !showInstallButton) return null;

  // Only show on mobile devices
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (!isMobile) return null;

  return (
    <div className="fixed top-4 left-4 right-4 md:hidden z-50 animate-in slide-in-from-top duration-300">
      <div className="bg-black/40 backdrop-blur-3xl border border-white/20 rounded-2xl shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-600/30 to-purple-600/30 rounded-xl flex items-center justify-center backdrop-blur-sm border border-indigo-500/30">
            <Download className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="font-bold text-white text-base mb-1">Install Arcinema</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {isIOS 
                    ? "Add Arcinema to your home screen for quick access and a better experience"
                    : "Add Arcinema to your home screen for quick access and offline support"
                  }
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
                className="flex-1 h-9 text-xs font-medium border-white/20 hover:bg-white/10"
              >
                Later
              </Button>
              <Button
                onClick={handleInstallApp}
                size="sm"
                className="flex-1 h-9 text-xs font-bold bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:via-indigo-400 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/20"
              >
                {isIOS ? "Show Instructions" : "Install Now"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}