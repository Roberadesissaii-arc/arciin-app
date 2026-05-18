import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  Timestamp 
} from 'firebase/firestore';
import { projectFirestore as db } from '@/firebase/config';

export const saveChatMessage = async (userId: string, message: any) => {
  try {
    const chatsRef = collection(db, 'chats');
    const docRef = await addDoc(chatsRef, {
      ...message,
      userId,
      createdAt: Timestamp.now()
    });
    
    return {
      id: docRef.id,
      ...message
    };
  } catch (error) {
    return null;
  }
};

export const getChatHistory = async (userId: string) => {
  try {
    const chatsRef = collection(db, 'users', userId, 'chats');
    const querySnapshot = await getDocs(query(chatsRef, orderBy('timestamp', 'asc')));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().createdAt.toDate().toISOString()
    }));
  } catch (error) {
    return [];
  }
};