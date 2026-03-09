import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, X } from "lucide-react";
import { ConversationList } from "../components/chat/ConversationList";
import { ChatInterface } from "../components/chat/ChatInterface";

export function ChatPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const navigate = useNavigate();

  const handleNewConversation = useCallback(() => {
    navigate("/chat");
    setMobileListOpen(false);
  }, [navigate]);

  const handleConversationCreated = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="flex h-full">
      {/* Left panel — conversation list (desktop) */}
      <div className="hidden w-72 shrink-0 lg:block">
        <ConversationList
          onNewConversation={handleNewConversation}
          refreshKey={refreshKey}
        />
      </div>

      {/* Right panel — full-screen chat */}
      <div className="flex-1">
        <ChatInterface
          onConversationCreated={handleConversationCreated}
          onOpenConversations={() => setMobileListOpen(true)}
        />
      </div>

      {/* Mobile bottom sheet — conversation list */}
      {mobileListOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileListOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[75vh] animate-slide-up rounded-t-2xl bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-navy-600" />
                <h2 className="font-heading text-base font-semibold text-navy-600">
                  Conversations
                </h2>
              </div>
              <button
                onClick={() => setMobileListOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
                aria-label="Close conversations"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[calc(75vh-56px)] overflow-y-auto">
              <ConversationList
                onNewConversation={handleNewConversation}
                refreshKey={refreshKey}
                onSelect={() => setMobileListOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
