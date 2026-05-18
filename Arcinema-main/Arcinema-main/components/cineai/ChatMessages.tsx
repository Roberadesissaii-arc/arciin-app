'use client';

import { MessageList } from './desktop/MessageList';
import { LoadingIndicator } from './ui/LoadingIndicator';
import { Message, MediaItem } from '@/types/ai-chat';

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  isEmpty: boolean;
  formatMessageWithGradientTitles: (content: string) => string;
  onUserEdit: (index: number, message: Message) => void;
  onUserDelete: (index: number) => void;
  onAssistantRegenerate: (message: Message) => void;
  onAssistantDelete: (message: Message) => void;
  onAttachMovie?: (movie: MediaItem) => void;
  isWebSearch?: boolean; // Flag to show web search icon
  isFolderMode?: boolean; // Flag to show folder icon
}

export function ChatMessages({
  messages,
  isLoading,
  isEmpty,
  formatMessageWithGradientTitles,
  onUserEdit,
  onUserDelete,
  onAssistantRegenerate,
  onAssistantDelete,
  onAttachMovie,
  isWebSearch = false,
  isFolderMode = false
}: ChatMessagesProps) {
  if (isEmpty) {
    return null;
  }

  return (
    <div className="pb-40 pt-24 sm:pt-20">
      <div className="max-w-4xl mx-auto space-y-4 px-4 sm:px-6 transition-all duration-300">
        <MessageList
          messages={messages}
          formatMessageWithGradientTitles={formatMessageWithGradientTitles}
          onUserEdit={onUserEdit}
          onUserDelete={onUserDelete}
          onAssistantRegenerate={onAssistantRegenerate}
          onAssistantDelete={onAssistantDelete}
          onAttachMovie={onAttachMovie}
        />

        {isLoading && <LoadingIndicator isWebSearch={isWebSearch} isFolderMode={isFolderMode} />}
      </div>
    </div>
  );
}
