// hooks/useChatHistory.ts
import { useState, useEffect, useCallback } from 'react';
import { Movie } from '@/lib/api';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { projectFirestore } from '@/firebase/config';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  movies?: Movie[];
  people?: any[];
  person?: any; // Single person details for actor/director searches
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  lastMessage?: string;
}

export const useChatHistory = () => {
  const { user } = useAuth();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messageListener, setMessageListener] = useState<(() => void) | null>(null);

  // Load all chat sessions for the user
  const loadChatSessions = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const q = query(
        collection(projectFirestore, 'chats'),
        where('userId', '==', user.uid),
        orderBy('updatedAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const sessions: ChatSession[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            sessions.push({
              id: doc.id,
              userId: data.userId,
              title: data.title,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              messageCount: data.messageCount || 0,
              lastMessage: data.lastMessage
            });
          });
          setChatSessions(sessions);
          setIsLoading(false);
        },
        (error) => {
          // Fallback: try to load without real-time listener for now
          setIsLoading(false);
          // Don't show error to user, just log it
        }
      );

      return unsubscribe;
    } catch (error) {
      setIsLoading(false);
    }
  }, [user]);

  // Load messages for a specific chat session
  const loadChatMessages = useCallback(async (sessionId: string) => {
    if (!user || !sessionId) return;

    try {
      // Clean up previous listener
      if (messageListener) {
        messageListener();
        setMessageListener(null);
      }

      setIsLoading(true);
      setCurrentMessages([]); // Clear previous messages immediately
      
      const q = query(
        collection(projectFirestore, 'chats', sessionId, 'messages'),
        orderBy('timestamp', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const messages: ChatMessage[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          messages.push({
            id: doc.id,
            role: data.role,
            content: data.content,
            timestamp: data.timestamp?.toDate() || new Date(),
            movies: data.movies || undefined, // Properly restore movies
            people: data.people || undefined
          });
        });
        
        setCurrentMessages(messages);
        setIsLoading(false);
      }, (error) => {
        console.error("Error loading chat messages:", error);
        setIsLoading(false);
        
        // If permission denied, the chat likely doesn't exist or we lost access
        if (error.code === 'permission-denied') {
          console.log("Session invalid or deleted, resetting view");
          setCurrentMessages([]);
          // We can't easily nullify currentSessionId here as it might trigger loops
          // But clearing messages prevents stale data
        }
      });

      setMessageListener(() => unsubscribe);
      return unsubscribe;
    } catch (error) {
      setIsLoading(false);
    }
  }, [user, messageListener]);

  // Create a new chat session ONLY when user sends first message
  const createNewChatSession = useCallback(async (firstMessage?: string): Promise<string | null> => {
    if (!user) return null;
    
    // Require a first message to create a session
    if (!firstMessage || !firstMessage.trim()) {
      return null;
    }

    try {
      const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');

      const sessionData = {
        userId: user.uid,
        title,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        messageCount: 0,
        lastMessage: firstMessage.slice(0, 100)
      };

      const docRef = await addDoc(collection(projectFirestore, 'chats'), sessionData);
      setCurrentSessionId(docRef.id);
      setCurrentMessages([]);
      
      // Immediately set up message listener for the new session
      loadChatMessages(docRef.id);
      
      return docRef.id;
    } catch (error) {
      return null;
    }
  }, [user, loadChatMessages]);

  // Add a message to the current session
  const addMessageToSession = useCallback(async (
    sessionId: string, 
    message: Omit<ChatMessage, 'id'>
  ): Promise<void> => {
    if (!user || !sessionId) return;

    // Create temporary message for immediate UI update
    // Define tempId OUTSIDE try block so it's accessible in catch block
    const tempId = `temp-${Date.now()}`;

    try {
      // Don't add empty messages
      if (!message.content || !message.content.trim()) {
        return;
      }

      const tempMessage: ChatMessage = {
        id: tempId,
        ...message
      };

      // Update local state immediately for responsive UI
      setCurrentMessages(prev => [...prev, tempMessage]);

      const messageData = {
        role: message.role,
        content: message.content,
        timestamp: Timestamp.fromDate(message.timestamp),
        movies: message.movies || null,
        people: message.people || null,
        senderId: user.uid // Required by security rules
      };

      // Add message to subcollection
      const docRef = await addDoc(
        collection(projectFirestore, 'chats', sessionId, 'messages'),
        messageData
      );

      // Update the temporary message with the real ID
      setCurrentMessages(prev => 
        prev.map(msg => 
          msg.id === tempId 
            ? { ...msg, id: docRef.id }
            : msg
        )
      );

      // Get current message count first
      const currentMessageCount = currentMessages.length;

      // Update session metadata
      const sessionRef = doc(projectFirestore, 'chats', sessionId);
      await updateDoc(sessionRef, {
        updatedAt: Timestamp.now(),
        messageCount: currentMessageCount + 1,
        lastMessage: message.content.slice(0, 100)
      });

    } catch (error) {
      // Remove the temporary message on error
      setCurrentMessages(prev => 
        prev.filter(msg => msg.id !== tempId)
      );
    }
  }, [user, currentMessages.length]);

  // Update session title
  const updateSessionTitle = useCallback(async (sessionId: string, title: string): Promise<void> => {
    if (!user) return;

    try {
      const sessionRef = doc(projectFirestore, 'chats', sessionId);
      await updateDoc(sessionRef, {
        title: title,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
    }
  }, [user]);

  // Delete a chat session and all its messages
  const deleteChatSession = useCallback(async (sessionId: string): Promise<void> => {
    if (!user) {
      return;
    }

    try {
      // First, delete all messages in the subcollection
      const messagesQuery = query(
        collection(projectFirestore, 'chats', sessionId, 'messages')
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      const deleteMessagePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteMessagePromises);
      // Now delete the main chat document
      const chatDocRef = doc(projectFirestore, 'chats', sessionId);
      await deleteDoc(chatDocRef);
      // Update local state immediately (don't wait for listener)
      setChatSessions(prev => prev.filter(session => session.id !== sessionId));
      
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setCurrentMessages([]);
      }
      
    } catch (error: any) {
      throw error; // Re-throw to let the caller know it failed
    }
  }, [user, currentSessionId]);

  // Update a specific message in the session
  const updateMessageInSession = useCallback(async (
    sessionId: string,
    messageId: string,
    updates: Partial<Omit<ChatMessage, 'id'>>
  ): Promise<void> => {
    if (!user || !sessionId || !messageId) return;

    try {
      const messageRef = doc(projectFirestore, 'chats', sessionId, 'messages', messageId);
      const updateData: any = {};
      
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.movies !== undefined) updateData.movies = updates.movies;
      if (updates.people !== undefined) updateData.people = updates.people;
      if (updates.timestamp !== undefined) updateData.timestamp = Timestamp.fromDate(updates.timestamp);
      
      await updateDoc(messageRef, updateData);
      
      // Update local state
      setCurrentMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, ...updates }
            : msg
        )
      );
      
    } catch (error) {
    }
  }, [user]);

  // Delete a specific message from the session
  const deleteMessageFromSession = useCallback(async (
    sessionId: string,
    messageId: string
  ): Promise<void> => {
    if (!user || !sessionId || !messageId) return;

    try {
      // Delete from Firestore
      const messageRef = doc(projectFirestore, 'chats', sessionId, 'messages', messageId);
      await deleteDoc(messageRef);
      
      // Update local state
      setCurrentMessages(prev => prev.filter(msg => msg.id !== messageId));
      
      // Update message count in session
      const sessionRef = doc(projectFirestore, 'chats', sessionId);
      const newMessageCount = Math.max(0, currentMessages.length - 1);
      await updateDoc(sessionRef, {
        updatedAt: Timestamp.now(),
        messageCount: newMessageCount
      });
      
    } catch (error) {
    }
  }, [user, currentMessages.length]);

  // Delete multiple messages from the session
  const deleteMessagesFromSession = useCallback(async (
    sessionId: string,
    messageIds: string[]
  ): Promise<void> => {
    if (!user || !sessionId || messageIds.length === 0) return;

    try {

      // Delete from Firestore
      const deletePromises = messageIds.map(messageId => {
        const docRef = doc(projectFirestore, 'chats', sessionId, 'messages', messageId);

        return deleteDoc(docRef);
      });
      await Promise.all(deletePromises);

      // Update local state
      setCurrentMessages(prev => prev.filter(msg => !messageIds.includes(msg.id)));
      
      // Update message count in session
      const sessionRef = doc(projectFirestore, 'chats', sessionId);
      const newMessageCount = Math.max(0, currentMessages.length - messageIds.length);
      await updateDoc(sessionRef, {
        updatedAt: Timestamp.now(),
        messageCount: newMessageCount
      });

    } catch (error) {
    }
  }, [user, currentMessages.length]);

  // Switch to a different chat session
  const switchToSession = useCallback(async (sessionId: string): Promise<void> => {
    
    if (!sessionId || !user) {
      return;
    }
    
    // Set the current session ID first
    setCurrentSessionId(sessionId);
    
    // Load messages for this session
    await loadChatMessages(sessionId);
  }, [user, loadChatMessages]);

  // Clean up empty sessions (sessions with no messages)
  const cleanupEmptySessions = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      
      const q = query(
        collection(projectFirestore, 'chats'),
        where('userId', '==', user.uid),
        where('messageCount', '==', 0)
      );

      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(sessionDoc => deleteDoc(sessionDoc.ref));
      
      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
      }
    } catch (error) {
    }
  }, [user]);

  // Initialize on mount
  useEffect(() => {
    if (user) {
      let unsubscribe: (() => void) | undefined;
      
      const setupListener = async () => {
        unsubscribe = await loadChatSessions();
      };
      
      setupListener();
      
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }
  }, [user, loadChatSessions]);

  // Cleanup message listener on unmount
  useEffect(() => {
    return () => {
      if (messageListener) {
        messageListener();
      }
    };
  }, [messageListener]);

  return {
    chatSessions,
    currentSessionId,
    currentMessages,
    isLoading,
    createNewChatSession,
    addMessageToSession,
    updateMessageInSession,
    deleteMessageFromSession,
    deleteMessagesFromSession,
    updateSessionTitle,
    deleteChatSession,
    switchToSession,
    setCurrentMessages,
    setCurrentSessionId,
    cleanupEmptySessions
  };
};
