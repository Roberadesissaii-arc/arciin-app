import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Twitter, 
  Facebook, 
  Mail, 
  MessageSquare,
  Copy,
  CheckCheck,
  Share2
} from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ShareDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  url: string;
}

const shareButtons = [
  {
    id: 'twitter',
    label: 'Twitter',
    icon: Twitter,
    color: '#1DA1F2',
    hoverEffect: 'hover:shadow-[#1DA1F2]/20 hover:border-[#1DA1F2]/50',
    gradient: 'hover:bg-gradient-to-br hover:from-[#1DA1F2]/10 hover:to-[#1DA1F2]/5'
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: Facebook,
    color: '#1877F2',
    hoverEffect: 'hover:shadow-[#1877F2]/20 hover:border-[#1877F2]/50',
    gradient: 'hover:bg-gradient-to-br hover:from-[#1877F2]/10 hover:to-[#1877F2]/5'
  },
  {
    id: 'message',
    label: 'Message',
    icon: MessageSquare,
    color: '#34D399',
    hoverEffect: 'hover:shadow-emerald-500/20 hover:border-emerald-500/50',
    gradient: 'hover:bg-gradient-to-br hover:from-emerald-500/10 hover:to-emerald-500/5'
  },
  {
    id: 'email',
    label: 'Email',
    icon: Mail,
    color: '#8B5CF6',
    hoverEffect: 'hover:shadow-violet-500/20 hover:border-violet-500/50',
    gradient: 'hover:bg-gradient-to-br hover:from-violet-500/10 hover:to-violet-500/5'
  },
  {
    id: 'copy',
    label: 'Copy Link',
    icon: Copy,
    color: '#EC4899',
    hoverEffect: 'hover:shadow-pink-500/20 hover:border-pink-500/50',
    gradient: 'hover:bg-gradient-to-br hover:from-pink-500/10 hover:to-pink-500/5'
  }
];

export function ShareDialog({ isOpen, onOpenChange, title, url }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const shareText = `Check out ${title} on MovieApp`;

  const handleShare = useCallback(async (platform: string) => {
    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`);
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
        break;
      case 'message':
        window.open(`sms:?body=${encodeURIComponent(shareText + ' ' + url)}`);
        break;
      case 'email':
        window.open(`mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(url)}`);
        break;
      case 'copy':
        try {
          if (typeof window !== 'undefined' && navigator.clipboard) {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            toast({
              title: "Link copied",
              description: "The link has been copied to your clipboard",
            });
            setTimeout(() => setCopied(false), 2000);
          }
        } catch (err) {
        }
        break;
      case 'native':
        if (navigator.share) {
          try {
            await navigator.share({
              title: title,
              text: shareText,
              url: url,
            });
          } catch (err) {
            if (err instanceof Error && err.name !== 'AbortError') {
            }
          }
        }
        break;
    }
  }, [title, url]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/40 backdrop-blur-2xl border-white/10 shadow-xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <DialogHeader className="space-y-4">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Share this content
            </DialogTitle>
            <p className="text-sm text-gray-400 font-medium">
              Share &ldquo;{title}&rdquo; with your friends and family
            </p>
          </DialogHeader>

          {/* Native Share Button (Mobile) */}
          {typeof navigator.share === 'function' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <Button
                variant="outline"
                onClick={() => handleShare('native')}
                className="w-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-white/10 hover:border-white/20 hover:from-indigo-500/20 hover:to-purple-500/20 transition-all duration-300"
              >
                <Share2 className="w-5 h-5 mr-2" />
                Share using device
              </Button>
            </motion.div>
          )}

          {/* Share Buttons Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {shareButtons.map((button, index) => (
              <motion.div
                key={button.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  transition: { delay: index * 0.1 } 
                }}
              >
                <Button
                  variant="outline"
                  onClick={() => handleShare(button.id)}
                  className={cn(
                    "w-full h-24 flex flex-col items-center justify-center gap-2",
                    "bg-white/5 border border-white/10 backdrop-blur-sm",
                    "transition-all duration-300 ease-out",
                    "hover:scale-105 hover:-translate-y-0.5",
                    button.hoverEffect,
                    button.gradient,
                    "group"
                  )}
                >
                  {button.id === 'copy' && copied ? (
                    <CheckCheck className="w-6 h-6 text-green-500 transition-transform duration-200 group-hover:scale-110" />
                  ) : (
                    <button.icon 
                      className={cn(
                        "w-6 h-6 transition-transform duration-200 group-hover:scale-110",
                        `text-[${button.color}]`
                      )} 
                    />
                  )}
                  <span className="text-sm font-medium text-gray-300 group-hover:text-white">
                    {button.id === 'copy' ? (copied ? 'Copied!' : button.label) : button.label}
                  </span>
                </Button>
              </motion.div>
            ))}
          </div>

          {/* URL Display */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-lg blur-xl transition-all duration-300 group-hover:opacity-75 opacity-50" />
            <div className="relative p-4 bg-white/5 rounded-lg border border-white/10 backdrop-blur-sm">
              <p className="text-sm text-gray-400 break-all">{url}</p>
            </div>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
} 