"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { doc, getDoc, collection, query, where, getDocs, addDoc, deleteDoc, serverTimestamp, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { projectFirestore as db } from '@/firebase/config';
import { getAvatarPath } from '@/lib/utils/profileAvatars';
import { 
  Loader2, 
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  Calendar,
  Star,
  Film,
  Tv,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  userId: string;
  userDisplayName: string;
  userAvatarId?: string;
  text: string;
  createdAt: any;
}

export default function MediaPost() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const userId = params?.userId as string;
  const mediaId = params?.mediaId as string;
  const mediaType = searchParams?.get('type') || 'movie';

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [mediaData, setMediaData] = useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loadingLikes, setLoadingLikes] = useState(false);

  useEffect(() => {
    if (!userId || !mediaId) return;
    loadData();
  }, [userId, mediaId, mediaType]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load user profile
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        toast({
          title: "Error",
          description: "User not found",
          variant: "destructive",
        });
        router.back();
        return;
      }
      setProfileData(userDoc.data());

      // Load media data from TMDB
      const endpoint = mediaType === 'tv' 
        ? `https://api.themoviedb.org/3/tv/${mediaId}?append_to_response=credits`
        : `https://api.themoviedb.org/3/movie/${mediaId}?append_to_response=credits`;
      
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN}`,
        },
      });

      if (!response.ok) {
        throw new Error("Media not found");
      }

      const data = await response.json();
      setMediaData(data);

      // Check if current user liked this post
      if (currentUser) {
        const likeQuery = query(
          collection(db, 'postLikes'),
          where('userId', '==', currentUser.uid),
          where('postUserId', '==', userId),
          where('mediaId', '==', mediaId)
        );
        const likeSnapshot = await getDocs(likeQuery);
        setIsLiked(!likeSnapshot.empty);
      }

      // Load likes count
      const likesQuery = query(
        collection(db, 'postLikes'),
        where('postUserId', '==', userId),
        where('mediaId', '==', mediaId)
      );
      const likesSnapshot = await getDocs(likesQuery);
      setLikesCount(likesSnapshot.size);

      // Subscribe to comments
      const commentsQuery = query(
        collection(db, 'postComments'),
        where('postUserId', '==', userId),
        where('mediaId', '==', mediaId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
        const commentsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Comment[];
        setComments(commentsData);
      });

      return () => unsubscribe();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load post",
        variant: "destructive",
      });
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!currentUser) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like posts",
        variant: "destructive",
      });
      return;
    }

    setLoadingLikes(true);
    try {
      const likeQuery = query(
        collection(db, 'postLikes'),
        where('userId', '==', currentUser.uid),
        where('postUserId', '==', userId),
        where('mediaId', '==', mediaId)
      );
      const likeSnapshot = await getDocs(likeQuery);

      if (likeSnapshot.empty) {
        // Like the post
        await addDoc(collection(db, 'postLikes'), {
          userId: currentUser.uid,
          postUserId: userId,
          mediaId: mediaId,
          mediaType: mediaType,
          createdAt: serverTimestamp(),
        });
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      } else {
        // Unlike the post
        const likeDoc = likeSnapshot.docs[0];
        await deleteDoc(doc(db, 'postLikes', likeDoc.id));
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to like post",
        variant: "destructive",
      });
    } finally {
      setLoadingLikes(false);
    }
  };

  const handleComment = async () => {
    if (!currentUser) {
      toast({
        title: "Sign in required",
        description: "Please sign in to comment",
        variant: "destructive",
      });
      return;
    }

    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      await addDoc(collection(db, 'postComments'), {
        userId: currentUser.uid,
        postUserId: userId,
        mediaId: mediaId,
        mediaType: mediaType,
        text: commentText.trim(),
        userDisplayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
        userAvatarId: (currentUser as any).avatarId,
        createdAt: serverTimestamp(),
      });
      setCommentText("");
      toast({
        title: "Success",
        description: "Comment added",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading || !profileData || !mediaData) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const displayName = profileData.displayName || profileData.email?.split('@')[0] || profileData.username || 'User';
  const posterPath = mediaData.poster_path || mediaData.backdrop_path;
  const title = mediaData.title || mediaData.name;
  const releaseDate = mediaData.release_date || mediaData.first_air_date;
  const voteAverage = mediaData.vote_average;

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-sm border-b border-white/10 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-white">Post</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Post Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden"
        >
          {/* User Header */}
          <div className="flex items-center gap-3 p-4 border-b border-white/10">
            <Avatar className="w-10 h-10 cursor-pointer" onClick={() => router.push(`/user/${userId}`)}>
              <AvatarImage 
                src={getAvatarPath(profileData.avatarId)} 
                alt={displayName}
              />
              <AvatarFallback className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-300">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p 
                className="text-white font-semibold cursor-pointer hover:text-indigo-400 transition-colors"
                onClick={() => router.push(`/user/${userId}`)}
              >
                {displayName}
              </p>
              <p className="text-gray-400 text-xs">
                {releaseDate ? new Date(releaseDate).getFullYear() : 'N/A'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(mediaType === 'tv' ? `/tv-shows/${mediaId}` : `/movies/${mediaId}`)}
              className="text-white hover:bg-white/10"
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>

          {/* Media Image */}
          <div className="relative w-full aspect-[2/3] md:aspect-video bg-gray-900">
            {posterPath ? (
              <Image
                src={`https://image.tmdb.org/t/p/w780${posterPath}`}
                alt={title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {mediaType === 'tv' ? (
                  <Tv className="w-16 h-16 text-gray-600" />
                ) : (
                  <Film className="w-16 h-16 text-gray-600" />
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-4 mb-3">
              <button
                onClick={handleLike}
                disabled={loadingLikes}
                className={cn(
                  "flex items-center gap-2 transition-colors",
                  isLiked ? "text-red-500" : "text-white hover:text-red-500"
                )}
              >
                <Heart className={cn("w-6 h-6", isLiked && "fill-current")} />
                <span className="font-semibold">{likesCount}</span>
              </button>
              <div className="flex items-center gap-2 text-white">
                <MessageCircle className="w-6 h-6" />
                <span className="font-semibold">{comments.length}</span>
              </div>
              <div className="flex items-center gap-2 text-white ml-auto">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold">{voteAverage?.toFixed(1) || 'N/A'}</span>
              </div>
            </div>

            {/* Media Info */}
            <div className="mb-3">
              <h2 className="text-xl font-bold text-white mb-1">{title}</h2>
              {mediaData.overview && (
                <p className="text-gray-300 text-sm line-clamp-3">{mediaData.overview}</p>
              )}
            </div>
          </div>

          {/* Comments Section */}
          <div className="p-4">
            <h3 className="text-white font-semibold mb-4">Comments</h3>
            
            {/* Comments List */}
            <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No comments yet. Be the first to comment!</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={getAvatarPath(comment.userAvatarId)} />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-300 text-xs">
                        {comment.userDisplayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">{comment.userDisplayName}</p>
                      <p className="text-gray-300 text-sm">{comment.text}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        {comment.createdAt?.toDate ? new Date(comment.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input */}
            {currentUser && (
              <div className="flex gap-2">
                <Input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleComment();
                    }
                  }}
                  placeholder="Add a comment..."
                  className="bg-black/40 border-white/20 text-white placeholder:text-gray-500"
                />
                <Button
                  onClick={handleComment}
                  disabled={!commentText.trim() || submittingComment}
                  className="bg-indigo-600 hover:bg-indigo-500"
                >
                  {submittingComment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Post"
                  )}
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

