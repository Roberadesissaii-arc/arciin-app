"use client";

import { useState } from "react";
import { Ban, Trash2, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { blockContent, unblockContent, isContentBlocked, clearBlockedContentCache } from "@/lib/firebase/blockedContent";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BlockContentButtonProps {
  id: number;
  mediaType: 'movie' | 'tv' | 'anime';
  title: string;
  className?: string;
}

export default function BlockContentButton({ 
  id, 
  mediaType, 
  title,
  className = "" 
}: BlockContentButtonProps) {
  const { user } = useAuth();
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check if content is already blocked on mount
  useState(() => {
    const checkStatus = async () => {
      try {
        const blocked = await isContentBlocked(id, mediaType);
        setIsBlocked(blocked);
      } catch (error) {
      } finally {
        setCheckingStatus(false);
      }
    };
    checkStatus();
  });

  const handleBlock = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to block content.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await blockContent(id, mediaType, title, user.uid, "Admin block");
      clearBlockedContentCache(); // Clear cache so filters work immediately
      setIsBlocked(true);
      
      toast({
        title: "Content Blocked",
        description: `"${title}" (ID: ${id}) has been blocked. Refreshing page...`,
      });
      
      // Reload page after 1 second to clear all caches
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to block content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setShowDialog(false);
    }
  };

  const handleUnblock = async () => {
    setLoading(true);
    try {
      await unblockContent(id, mediaType);
      clearBlockedContentCache(); // Clear cache
      setIsBlocked(false);
      
      toast({
        title: "Content Unblocked",
        description: `"${title}" has been unblocked.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unblock content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return null; // or a loading spinner
  }

  // Only show for logged-in users (dev/admin mode)
  if (!user) {
    return null;
  }

  return (
    <>
      {isBlocked ? (
        <Button
          onClick={handleUnblock}
          disabled={loading}
          variant="outline"
          size="sm"
          className={`bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30 ${className}`}
        >
          <ShieldOff className="w-4 h-4 mr-2" />
          {loading ? "Unblocking..." : "Unblock Content"}
        </Button>
      ) : (
        <Button
          onClick={() => setShowDialog(true)}
          disabled={loading}
          variant="outline"
          size="sm"
          className={`bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30 ${className}`}
        >
          <Ban className="w-4 h-4 mr-2" />
          Block Content
        </Button>
      )}

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent className="bg-gray-900 border border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="w-5 h-5" />
              Block Content from Website
            </AlertDialogTitle>
          </AlertDialogHeader>
          
          <div className="space-y-3 text-gray-300">
            <p className="text-sm">Are you sure you want to block this content?</p>
            
            <div className="bg-black/40 rounded-lg p-3 border border-red-500/20">
              <p className="text-sm font-semibold text-white mb-1">{title}</p>
              <p className="text-xs text-gray-400">
                ID: {id} | Type: {mediaType.toUpperCase()}
              </p>
            </div>

            <div className="text-sm space-y-1">
              <p className="text-yellow-400 font-semibold">This will:</p>
              <ul className="list-disc list-inside text-gray-400 space-y-1 ml-2">
                <li>Remove it from all search results</li>
                <li>Hide it from trending and recommendations</li>
                <li>Prevent it from appearing in CineAI results</li>
                <li>Block it across the entire website</li>
              </ul>
            </div>

            <p className="text-xs text-gray-500 italic">
              Note: This is a development feature for content moderation. You can unblock it later.
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlock}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <Ban className="w-4 h-4 mr-2" />
              Block Content
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
