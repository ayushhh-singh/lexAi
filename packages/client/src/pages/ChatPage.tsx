import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ConversationList } from "../components/chat/ConversationList";
import { ChatInterface } from "../components/chat/ChatInterface";

export function ChatPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  const handleNewConversation = useCallback(() => {
    navigate("/chat");
  }, [navigate]);

  const handleConversationCreated = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="flex h-full">
      {/* Left panel — conversation list (hidden on mobile) */}
      <div className="hidden w-72 shrink-0 lg:block">
        <ConversationList
          onNewConversation={handleNewConversation}
          refreshKey={refreshKey}
        />
      </div>

      {/* Right panel — chat interface */}
      <div className="flex-1">
        <ChatInterface onConversationCreated={handleConversationCreated} />
      </div>
    </div>
  );
}
