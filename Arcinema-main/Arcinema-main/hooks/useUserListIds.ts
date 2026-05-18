import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { projectFirestore } from "@/firebase/config";

export function useUserListIds() {
  const { user } = useAuth();
  const [favoritesIds, setFavoritesIds] = useState<Set<number>>(new Set());
  const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const fetchUserLists = async () => {
      if (!user) {
        setFavoritesIds(new Set());
        setWatchedIds(new Set());
        return;
      }
      
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(projectFirestore, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const favIds = new Set<number>((data.favorites || []).map((item: any) => item.id));
          const watchIds = new Set<number>((data.watched || []).map((item: any) => item.id));
          setFavoritesIds(favIds);
          setWatchedIds(watchIds);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserLists();
  }, [user]);
  
  return { favoritesIds, watchedIds, loading };
}
