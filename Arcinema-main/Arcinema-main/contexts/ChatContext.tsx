"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getChatHistory } from '@/lib/firebase/chatUtils';

interface ChatContextType {
  messages: any[];
  setMessages: (messages: any[]) => void;
  isLoading: boolean;
  clearChat: () => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const ChatContext = createContext<ChatContextType>({
  messages: [],
  setMessages: () => {},
  isLoading: false,
  clearChat: () => {},
  isSidebarOpen: false,
  toggleSidebar: () => {},
});

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const loadChatHistory = async () => {
      if (user) {
        setIsLoading(true);
        try {
          const history = await getChatHistory(user.uid);
          if (history.length > 0) {
            setMessages(history);
          } else {
            // Set welcome message
            setMessages([{
              id: '1',
              role: 'assistant',
              content: `👋 Welcome back, ${user.displayName || 'movie fan'}! I'm your personal movie expert. Based on your preferences, I can help you discover new films and manage your watchlist. Ask me anything!`,
              timestamp: new Date().toISOString()
            }]);
          }
        } catch (error) {
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadChatHistory();

    // Note: Cleanup functionality removed as function doesn't exist
    // const cleanup = setInterval(cleanupExpiredChats, 60 * 60 * 1000); // Every hour
    // return () => clearInterval(cleanup);
  }, [user]);

  const clearChat = () => {
    setMessages([{
      id: '1',
      role: 'assistant',
      content: `👋 Welcome back, ${user?.displayName || 'movie fan'}! How can I help you today?`,
      timestamp: new Date().toISOString()
    }]);
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <ChatContext.Provider 
      value={{ 
        messages, 
        setMessages, 
        isLoading, 
        clearChat,
        isSidebarOpen,
        toggleSidebar
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);