import { ChatChromeProvider } from "@/components/chat/chat-chrome-context"
import { FilesChromeProvider } from "@/components/files/files-chrome-context"
import { ModelsChromeProvider } from "@/components/models/models-chrome-context"
import { MobileShellViewport } from "@/components/shell/mobile-shell-viewport"

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <FilesChromeProvider>
      <ModelsChromeProvider>
        <ChatChromeProvider>
          <MobileShellViewport>{children}</MobileShellViewport>
        </ChatChromeProvider>
      </ModelsChromeProvider>
    </FilesChromeProvider>
  )
}
