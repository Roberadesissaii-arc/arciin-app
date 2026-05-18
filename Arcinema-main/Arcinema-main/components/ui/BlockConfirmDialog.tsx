"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface BlockConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  isAdmin: boolean;
  isPersonBlock?: boolean;
}

export default function BlockConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  isAdmin,
  isPersonBlock = false
}: BlockConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Dialog */}
      <div 
        className="relative bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          title="Close"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">
            {isPersonBlock ? 'Block Person?' : 'Block Content?'}
          </h3>
          
          <p className="text-gray-300 leading-relaxed">
            Are you sure you want to block <span className="font-semibold text-white">"{title}"</span>?
            {isPersonBlock && (
              <span className="block mt-2 text-sm text-red-300">
                This will block <strong>all content</strong> featuring this person.
              </span>
            )}
          </p>

          {isAdmin ? (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-sm text-yellow-200">
                <strong>Admin Mode:</strong> This will block the {isPersonBlock ? 'person and all their content' : 'content'} for <strong>all users</strong> on the platform.
                {isPersonBlock && (
                  <span className="block mt-1 text-xs">
                    All movies and TV shows featuring this person will be hidden from recommendations and search results.
                  </span>
                )}
              </p>
            </div>
          ) : (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-sm text-blue-200">
                This will only block the {isPersonBlock ? 'person' : 'content'} for <strong>your account</strong>. Other users will still see it.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {isPersonBlock ? 'Block Person' : 'Block'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
