"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X, Check } from 'lucide-react';
import { profileAvatars, type ProfileAvatar, avatarCategories, getAvatarsByCategory, type AvatarCategory } from '@/lib/utils/profileAvatars';
import { doc, updateDoc } from 'firebase/firestore';
import { projectFirestore } from '@/firebase/config';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface AvatarSelectorProps {
  userId: string;
  currentAvatarId?: string;
  onClose: () => void;
  onSelect: (avatar: ProfileAvatar) => void;
}

export default function AvatarSelector({ 
  userId, 
  currentAvatarId, 
  onClose, 
  onSelect 
}: AvatarSelectorProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<ProfileAvatar | null>(
    currentAvatarId 
      ? profileAvatars.find(a => a.id === currentAvatarId) || null 
      : null
  );
  const [activeCategory, setActiveCategory] = useState<AvatarCategory>('animals');
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  // Set initial category based on current avatar
  useEffect(() => {
    if (selectedAvatar) {
      setActiveCategory(selectedAvatar.category);
    }
  }, [selectedAvatar]);

  // Get avatars for the active category from static list
  const categoryAvatars = getAvatarsByCategory(activeCategory);

  const handleSelect = (avatar: ProfileAvatar) => {
    setSelectedAvatar(avatar);
  };

  const handleSave = async () => {
    if (!selectedAvatar) return;

    setIsUpdating(true);
    try {
      await updateDoc(doc(projectFirestore, 'users', userId), {
        avatarId: selectedAvatar.id,
        avatarName: selectedAvatar.name,
      });

      onSelect(selectedAvatar);
      toast({
        title: "Avatar updated!",
        description: `Your avatar is now ${selectedAvatar.name}`,
      });
      onClose();
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update avatar. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

        {/* Dialog - Beautiful Styling with Mobile Rounded Corners */}
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full sm:max-w-3xl bg-gradient-to-b from-black/98 via-black/95 to-black/98 backdrop-blur-2xl border-white/20 border-t sm:border rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[85vh] mx-3 sm:mx-0 mb-0 sm:mb-0 flex flex-col shadow-2xl shadow-indigo-500/10"
        >
          {/* Header - Elegant Design */}
          <div className="border-b border-white/10 bg-gradient-to-b from-indigo-500/5 to-transparent">
            <div className="flex items-center justify-between p-5 sm:p-7">
              <div>
                <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight">Choose Your Avatar</h2>
                {selectedAvatar && (
                  <p className="text-xs sm:text-sm text-indigo-400 mt-1 sm:mt-2 font-medium">{selectedAvatar.name}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 sm:p-2.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-all active:scale-95"
                aria-label="Close avatar selector"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Category Tabs */}
            <div className="px-5 sm:px-7 pb-4">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {avatarCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={cn(
                      "px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all",
                      activeCategory === category.id
                        ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                        : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Avatar Grid - Custom Scrollbar & Scroll Indicator */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 custom-scrollbar">
            {categoryAvatars.length === 0 ? (
              <div className="flex items-center justify-center min-h-[300px]">
                <div className="text-center space-y-4">
                  <p className="text-gray-400 text-lg">No avatars found</p>
                  <p className="text-gray-500 text-sm">Try switching categories</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4 pb-4">
                {categoryAvatars.map((avatar) => (
                  <motion.button
                    key={avatar.id}
                    onClick={() => handleSelect(avatar)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      selectedAvatar?.id === avatar.id
                        ? 'border-indigo-500 shadow-lg shadow-indigo-500/50 ring-2 ring-indigo-500/30'
                        : 'border-white/10 hover:border-indigo-400/50'
                    }`}
                  >
                    <Image
                      src={avatar.path}
                      alt={avatar.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
                    />
                  
                    {/* Selected Indicator */}
                    {selectedAvatar?.id === avatar.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute inset-0 bg-indigo-500/20 backdrop-blur-sm flex items-center justify-center"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg">
                          <Check className="w-6 h-6 text-white" />
                        </div>
                      </motion.div>
                    )}

                    {/* Avatar Name Badge */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-2 opacity-0 hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white font-medium text-center leading-tight">
                        {avatar.name}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
            
            {/* Scroll Indicator at Bottom Center */}
            <div className="sticky bottom-4 left-0 right-0 flex justify-center pointer-events-none">
              <div className="bg-white/10 backdrop-blur-xl rounded-full px-4 py-2 border border-white/20">
                <svg className="w-4 h-4 text-white/60 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Footer - Elegant Buttons */}
          <div className="p-5 sm:p-7 border-t border-white/10 bg-gradient-to-t from-indigo-500/5 to-transparent">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isUpdating}
                className="flex-1 px-5 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all disabled:opacity-50 border border-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!selectedAvatar || isUpdating}
                className="flex-1 px-5 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30"
              >
                {isUpdating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Avatar'
                )}
              </button>
            </div>
          </div>

          <style jsx>{`
            /* Hide scrollbar completely on all devices - we have the arrow indicator at bottom */
            .custom-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .custom-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
