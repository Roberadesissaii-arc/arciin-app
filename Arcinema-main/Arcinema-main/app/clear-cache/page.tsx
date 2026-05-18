"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ClearCachePage() {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const clearEverything = async () => {
    setLoading(true);
    setStatus('Clearing service workers and caches...');

    try {
      // Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        
        for (const registration of registrations) {
          await registration.unregister();
          setStatus(prev => prev + '\n✓ Unregistered service worker');
        }
      }

      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
          setStatus(prev => prev + `\n✓ Deleted cache: ${cacheName}`);
        }
      }

      // Clear local storage
      localStorage.clear();
      setStatus(prev => prev + '\n✓ Cleared localStorage');

      // Clear session storage
      sessionStorage.clear();
      setStatus(prev => prev + '\n✓ Cleared sessionStorage');

      setStatus(prev => prev + '\n\n✅ All cleared! Redirecting to home...');
      
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);

    } catch (error) {
      setStatus(prev => prev + `\n❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
        <h1 className="text-2xl font-bold text-white mb-4">Clear Cache & Service Workers</h1>
        
        <p className="text-white/70 mb-6">
          This will clear all cached data, service workers, and storage. Use this if you're experiencing issues after an update.
        </p>

        <button
          onClick={clearEverything}
          disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 text-white py-3 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? 'Clearing...' : 'Clear Everything'}
        </button>

        {status && (
          <pre className="mt-6 text-sm text-white/90 bg-black/40 p-4 rounded-xl overflow-auto max-h-64 whitespace-pre-wrap">
            {status}
          </pre>
        )}

        <button
          onClick={() => router.push('/')}
          className="w-full mt-4 text-white/50 hover:text-white transition py-2"
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
}
