"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { WifiOff, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function OfflineComponent() {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = () => {
    setIsRetrying(true);
    window.location.reload();
  };

  useEffect(() => {
    // Check if we're back online
    const handleOnline = () => {
      window.location.reload();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="mb-8"
        >
          <WifiOff className="w-24 h-24 mx-auto text-indigo-500" />
        </motion.div>

        <h1 className="text-3xl font-bold mb-4">You're Offline</h1>
        <p className="text-gray-400 mb-8 leading-relaxed">
          It looks like you've lost your internet connection. Don't worry, 
          you can still browse some cached content or try reconnecting.
        </p>

        <div className="space-y-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 
                     disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium 
                     transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </motion.button>

          <Link href="/">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-gray-800 hover:bg-gray-700 px-6 py-3 rounded-lg 
                       font-medium transition-colors duration-200 flex items-center 
                       justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              Go to Home
            </motion.button>
          </Link>
        </div>

        <div className="mt-8 p-4 bg-gray-900 rounded-lg">
          <h3 className="font-semibold mb-2 text-indigo-400">What you can do:</h3>
          <ul className="text-sm text-gray-400 space-y-1 text-left">
            <li>• Check your internet connection</li>
            <li>• Browse cached movies and shows</li>
            <li>• View your watch history</li>
            <li>• Access your saved favorites</li>
          </ul>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          Arcinema • Built for entertainment everywhere
        </p>
      </motion.div>
    </div>
  );
}
