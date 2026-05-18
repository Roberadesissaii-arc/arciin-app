"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useChatHistory } from '@/hooks/useChatHistory';
import { getFilterConfig } from '@/lib/features/filters/contentFilter';
import { ChatSidebar } from './desktop/ChatSidebar';
import ChatWelcomeScreen from './shared/ChatWelcomeScreen';
import ChatLayout from './layout/ChatLayout';
import { Message, MediaItem, Video } from '@/types/ai-chat';
import { grokClient } from '@/lib/cineai/config/grokClient';
import { deepseekClient } from '@/lib/cineai/config/deepseekClient';
import { functionTools } from '@/lib/cineai/tools/function-definitions';
import { ChatMessages } from './desktop/ChatMessages';
import { ChatInput } from './desktop/ChatInput';
import { generateUniqueId, formatMessageWithGradientTitles, filterMentionedMedia } from '@/lib/cineai/utils/message-utils';

// Import modular hooks
import {
  useChatState,
  useUserPreferences,
  useMessageSync,
  useScrollToBottom,
  useSessionManager,
} from './mobile/hooks';

// Import modular utils
import {
  detectGenre,
  isGreeting as checkIsGreeting,
  isTrendingRequest as checkIsTrendingRequest,
  buildEnhancedInput,
  getModelConfig,
  determineForcedToolChoice,
  buildSystemPrompt,
} from './mobile/utils';

// Import modular handlers
import {
  processFunctionCalls,
  createUserMessage,
  handleDeleteMessage,
  handleRegenerateMessage,
  handleDeleteAssistantMessage,
  processStream,
  updateMessageWithResults,
  handleFallbackSearch,
  generateCreativeResponse,
} from './mobile/handlers';

export default function CineAIContainer() {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const {
    chatSessions,
    currentSessionId,
    currentMessages,
    createNewChatSession,
    switchToSession,
    addMessageToSession,
    deleteMessagesFromSession,
    setCurrentSessionId,
    setCurrentMessages,
  } = useChatHistory();

  // Use custom hooks for state management
  const chatState = useChatState();
  const {
    messages,
    setMessages,
    inputMessage,
    setInputMessage,
    isLoading,
    setIsLoading,
    isWebSearch,
    trendingMode,
    setTrendingMode,
    castCrewMode,
    setCastCrewMode,
    similarMode,
    setSimilarMode,
    isStreaming,
    setIsStreaming,
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    lastShownContent,
    setLastShownContent,
    attachedMovie,
    setAttachedMovie,
    userPrefs,
    setUserPrefs,
    messagesEndRef,
  } = chatState;

  // Use custom hooks for side effects
  useUserPreferences(user, setUserPrefs);
  useMessageSync(currentMessages as any[], setMessages as any);
  useScrollToBottom(messages, isStreaming, messagesEndRef);
  useSessionManager(currentSessionId, setCurrentSessionId, setCurrentMessages, setMessages as any);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const currentAttachedMovie = attachedMovie;
    const userMessage = createUserMessage(inputMessage, currentAttachedMovie);

    setMessages(prev => [...prev, userMessage]);

    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);
    setIsStreaming(true);

    let sessionId = currentSessionId;
    if (!sessionId && user) {
      sessionId = await createNewChatSession(currentInput);
      if (!sessionId) {
        setIsLoading(false);
        setIsStreaming(false);
        return;
      }
    }

    if (sessionId && user) {
      await addMessageToSession(sessionId, {
        role: 'user',
        content: currentInput,
        timestamp: new Date()
      });
    }

    try {
      // Build system prompt based on mode
      const systemPrompt = buildSystemPrompt(
        lastShownContent,
        userPrefs.favorites,
        userPrefs.watchlist,
        false, // webSearchEnabled removed
        castCrewMode,
        similarMode,
        trendingMode
      );

      // Enhanced input with attached movie context
      const { enhancedInput, autoAttachedMovie } = buildEnhancedInput(currentInput, currentAttachedMovie);

      // Get AI model configuration
      const selectedModel = settings.preferences.aiModel || 'deepseek';
      const { client: aiClient, modelName } = getModelConfig(selectedModel, deepseekClient, grokClient);

      // Determine if we should force a specific tool
      const detectedGenre = detectGenre(currentInput);
      const isGreeting = checkIsGreeting(currentInput);
      const isTrending = checkIsTrendingRequest(currentInput, trendingMode);
      const isConversationalQuery = (
        /^(do|does|did|is|are|was|were|can|could|will|would|should|have|has|had)\s+.*\s+(have|has|had|movie|movies|film|films)\??$/i.test(currentInput.trim()) ||
        /do you know.*movie/i.test(currentInput) ||
        /what.*kind.*movie.*recommend/i.test(currentInput) ||
        /i.*planning.*watch.*movie/i.test(currentInput) ||
        /i.*wanna.*talk|just.*talk|have.*conversation|let.*talk/i.test(currentInput) ||
        /why.*you.*keep|why.*are.*you/i.test(currentInput) ||
        /not.*always|still.*wrong|didn.*ask/i.test(currentInput) ||
        (currentInput.toLowerCase().includes('recommend') && !currentInput.toLowerCase().includes('find') && !currentInput.toLowerCase().includes('search')) ||
        (currentInput.toLowerCase().includes('what kind') && currentInput.toLowerCase().includes('movie'))
      );
      
      // For "do you know" queries, don't force function - let AI respond conversationally first
      if (/do you know.*movie/i.test(currentInput)) {
        // AI will respond conversationally, then can call function if needed
      }

      const forcedToolChoice = determineForcedToolChoice({
        currentInput,
        currentAttachedMovie,
        lastShownContent,
        webSearchEnabled: false, // webSearchEnabled removed
        castCrewMode,
        similarMode,
        detectedGenre,
        trendingMode,
        isGreeting,
        isTrendingRequest: isTrending,
        isConversationalQuery,
      });

      // Create stream request
      const stream = await aiClient.chat.completions.create({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          })),
          { role: "user", content: enhancedInput }
        ],
        tools: isGreeting ? undefined : functionTools,
        tool_choice: forcedToolChoice,
        stream: true,
        temperature: 0.1,
      });

      // Process the stream
      const { accumulatedContent, toolCalls } = await processStream({
        stream,
        setMessages,
      });

      const newMessageId = messages.length > 0 ? messages[messages.length - 1].id : generateUniqueId();
      
      // Get filter configuration
      const contentFilter = settings.preferences.contentFilter || 'filtered';
      const filterConfig = getFilterConfig(contentFilter);
      const region = trendingMode ? 'US' : (settings.preferences.country || 'all');

      // Process function calls if any
      let functionResults: MediaItem[] = [];
      let videoResults: Video[] = [];
      let notificationContext = '';
      let finalContent = accumulatedContent;

      if (toolCalls.length > 0) {
        const result = await processFunctionCalls(
          {
            toolCalls,
            user,
            userPrefs,
            filterConfig,
            region,
            trendingMode,
            autoAttachedMovie,
          },
          accumulatedContent
        );

        functionResults = result.functionResults;
        videoResults = result.videoResults;
        notificationContext = result.notificationContext;
        finalContent = result.accumulatedContent;
      }

      setLastShownContent(functionResults);

      // Check if we need to generate a creative response
      const isOnlySearchingMessage = finalContent.toLowerCase().includes("i'll find") || 
                                      finalContent.toLowerCase().includes("let me search") ||
                                      finalContent.toLowerCase().includes("searching for");
      const hasMeaningfulContent = finalContent.trim().length > 20 && !isOnlySearchingMessage;

      if (!hasMeaningfulContent) {
        if (functionResults.length > 0) {
          // Generate creative description
          finalContent = await generateCreativeResponse({
            functionResults,
            notificationContext,
            currentInput,
            modelName,
            aiClient,
            selectedModel,
          });
          
          setMessages(prev => prev.map(msg =>
            msg.id === newMessageId
              ? { ...msg, content: finalContent }
              : msg
          ));
        } else {
          // Fallback search
          const { functionResults: fallbackResults, content } = await handleFallbackSearch(
            currentInput,
            setMessages as any,
            newMessageId
          );
          functionResults = fallbackResults;
          finalContent = content;
        }
      }

      // Filter mentioned media and update final message
      const mentionedMovies = filterMentionedMedia(functionResults, finalContent);

      updateMessageWithResults(
        newMessageId,
        finalContent,
        mentionedMovies.length > 0 ? mentionedMovies : undefined,
        videoResults.length > 0 ? videoResults : undefined,
        setMessages
      );

      // Save to session
      if (sessionId && user) {
        await addMessageToSession(sessionId, {
          role: 'assistant',
          content: finalContent,
          timestamp: new Date(),
          movies: mentionedMovies.length > 0 ? mentionedMovies as any : undefined
        });
      }

    } catch (error) {
      if (error instanceof Error) {
      }
      
      setMessages(prev => [...prev, {
        id: generateUniqueId(),
        role: 'assistant' as const,
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your API key and try again.`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <ChatLayout
      sidebarOpen={sidebarOpen}
      onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
    >
      <ChatSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onClose={() => setSidebarOpen(false)}
        chatSessions={chatSessions}
        currentSessionId={currentSessionId}
        onSwitchSession={switchToSession}
        onDeleteSession={async (sessionId) => {
          // Handle delete if needed
        }}
        onUpdateSessionTitle={async (sessionId, title) => {
          // Handle update if needed
        }}
        onNewChat={() => {
          setCurrentSessionId(null);
          setCurrentMessages([]);
          setMessages([]);
          if (!sidebarCollapsed) {
            setSidebarCollapsed(true);
          }
        }}
        isLoading={false}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col relative">
        {isEmpty ? (
          <div className="flex items-center justify-center min-h-screen">
            <ChatWelcomeScreen
              onSamplePrompt={(prompt) => {
                setInputMessage(prompt);
                setTimeout(() => {
                  const form = document.querySelector('form');
                  if (form) form.requestSubmit();
                }, 100);
              }}
            />
          </div>
        ) : (
          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            isEmpty={isEmpty}
            isWebSearch={isWebSearch}
            formatMessageWithGradientTitles={formatMessageWithGradientTitles}
            onUserEdit={(index, message) => {
              setInputMessage(message.content);
              setMessages(prev => prev.slice(0, index));
            }}
            onAttachMovie={(movie) => {
              setAttachedMovie(movie);
              setInputMessage('');
            }}
            onUserDelete={async (index) => {
              await handleDeleteMessage(
                index,
                messages,
                currentSessionId,
                deleteMessagesFromSession,
                setMessages
              );
            }}
            onAssistantRegenerate={(message) => {
              const userContent = handleRegenerateMessage(
                message,
                messages,
                setMessages,
                setInputMessage
              );
              if (userContent) {
                setTimeout(() => {
                  const form = document.querySelector('form');
                  if (form) form.requestSubmit();
                }, 100);
              }
            }}
            onAssistantDelete={async (message) => {
              await handleDeleteAssistantMessage(
                message,
                messages,
                currentSessionId,
                deleteMessagesFromSession,
                setMessages
              );
            }}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        inputMessage={inputMessage}
        isLoading={isLoading}
        onInputChange={setInputMessage}
        onSubmit={handleSubmit}
        showQuickActions={messages.length === 0}
        attachedMovie={attachedMovie}
        onRemoveAttachment={() => setAttachedMovie(null)}
        trendingMode={trendingMode}
        onTrendingToggle={() => setTrendingMode(!trendingMode)}
        castCrewMode={castCrewMode}
        onCastCrewToggle={() => setCastCrewMode(!castCrewMode)}
        similarMode={similarMode}
        onSimilarToggle={() => setSimilarMode(!similarMode)}
      />
    </ChatLayout>
  );
}
