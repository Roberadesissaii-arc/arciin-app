import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { projectFirestore as db } from '@/firebase/config';
import { useToast } from '@/components/ui/use-toast';
import { FolderShareInvite } from '@/types/user';
import { getAvatarPath } from '@/lib/utils/profileAvatars';

export function useFolderInviteListener() {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    // Listen for new folder share invites
    const invitesRef = collection(db, 'folderShareInvites');
    const q = query(
      invitesRef,
      where('toUserId', '==', user.uid),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === 'added') {
          const invite = { id: change.doc.id, ...change.doc.data() } as FolderShareInvite;
          
          // Only show toast for new invites (not on initial load)
          const inviteTime = new Date(invite.createdAt).getTime();
          const now = Date.now();
          const timeDiff = now - inviteTime;
          
          // Show toast if invite was created in the last 10 seconds
          if (timeDiff < 10000) {
            // Get sender's avatar
            const senderDoc = await getDoc(doc(db, 'users', invite.fromUserId));
            const senderData = senderDoc.exists() ? senderDoc.data() : null;
            const avatarId = senderData?.avatarId;
            
            showFolderInviteToast(invite, avatarId);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [user, toast]);

  const showFolderInviteToast = (invite: FolderShareInvite, avatarId?: string) => {
    // Use getAvatarPath which handles fallback properly
    const avatarPath = getAvatarPath(avatarId);
    
    toast({
      title: `${invite.fromUserName} shared a folder!`,
      description: `"${invite.folderName}" - Check your Folders tab to accept`,
      duration: 8000,
      className: "border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 to-purple-500/10",
    });
  };

  return null;
}
