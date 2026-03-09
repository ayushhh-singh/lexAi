import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Scale, FileText, FileDown, List } from "lucide-react";
import type { Message, Citation } from "@nyay/shared";
import { api } from "../../lib/api-client";
import { useStreamChat } from "../../hooks/useStreamChat";
import { useTranslation } from "../../lib/i18n";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";

const SUGGESTED_PROMPTS = [
  "What are the key changes in the Bharatiya Nyaya Sanhita?",
  "Explain Section 498A IPC and its recent interpretations",
  "What is the limitation period for filing a civil suit?",
  "How to file a bail application under CrPC?",
];

const DRAFT_PATTERN = /^(draft|prepare|create|write|generate)\s/i;

interface DocGenCardProps {
  onGenerate: (format: "docx" | "pdf") => void;
  onContinue: () => void;
}

function DocGenCard({ onGenerate, onContinue }: DocGenCardProps) {
  return (
    <div className="mx-auto max-w-md animate-slide-up rounded-xl border border-accent/20 bg-accent/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <FileText className="h-5 w-5 text-accent" />
        <span className="font-heading text-sm font-semibold text-navy-600">
          I can generate a formatted document
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onGenerate("docx")}
          className="flex min-h-[48px] items-center gap-1.5 rounded-lg bg-navy-600 px-4 py-2 font-heading text-sm font-medium text-white transition-colors duration-150 hover:bg-navy-500 lg:min-h-0"
        >
          <FileDown className="h-4 w-4" />
          Generate DOCX
        </button>
        <button
          onClick={() => onGenerate("pdf")}
          className="flex min-h-[48px] items-center gap-1.5 rounded-lg bg-navy-600 px-4 py-2 font-heading text-sm font-medium text-white transition-colors duration-150 hover:bg-navy-500 lg:min-h-0"
        >
          <FileDown className="h-4 w-4" />
          Generate PDF
        </button>
        <button
          onClick={onContinue}
          className="min-h-[48px] rounded-lg border border-gray-200 px-4 py-2 font-heading text-sm font-medium text-gray-600 transition-colors duration-150 hover:bg-gray-50 lg:min-h-0"
        >
          Continue as text
        </button>
      </div>
    </div>
  );
}

interface ChatInterfaceProps {
  onConversationCreated: () => void;
  onOpenConversations?: () => void;
}

export function ChatInterface({ onConversationCreated, onOpenConversations }: ChatInterfaceProps) {
  const { id: conversationId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [practiceArea, setPracticeArea] = useState<string | null>(null);
  const [showDocGen, setShowDocGen] = useState(false);
  const [pendingDraftMessage, setPendingDraftMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { streamedText, isStreaming, citations, error, send } = useStreamChat();
  const { language } = useTranslation();

  // Load messages when conversationId changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.chat
      .getMessages(conversationId)
      .then((res) => {
        if (!cancelled && res.data) setMessages(res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Auto-scroll on new messages / streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedText, showDocGen]);

  // Track previous streaming state to detect transition from streaming -> done
  const prevStreamingRef = useRef(false);
  useEffect(() => {
    const wasStreaming = prevStreamingRef.current;
    prevStreamingRef.current = isStreaming;

    if (wasStreaming && !isStreaming && streamedText && !error) {
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        conversation_id: conversationId ?? "",
        user_id: "",
        role: "assistant",
        content: streamedText,
        citations: citations as Citation[],
        ai_model: null,
        tokens_used: null,
        metadata: {},
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    }
  }, [isStreaming, streamedText, error, citations, conversationId]);

  const addUserMessage = useCallback(
    (message: string, convId: string) => {
      const userMsg: Message = {
        id: crypto.randomUUID(),
        conversation_id: convId,
        user_id: "",
        role: "user",
        content: message,
        citations: [],
        ai_model: null,
        tokens_used: null,
        metadata: {},
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
    },
    [],
  );

  const sendMessage = useCallback(
    async (message: string) => {
      let activeConvId = conversationId;

      if (!activeConvId) {
        const res = await api.chat.createConversation({ practice_area: practiceArea ?? undefined });
        if (res.data) {
          activeConvId = res.data.id;
          onConversationCreated();
          navigate(`/chat/${activeConvId}`, { replace: true });
        }
      }

      if (!activeConvId) return;

      addUserMessage(message, activeConvId);
      send({ message, conversation_id: activeConvId, practice_area: practiceArea ?? undefined, language });
    },
    [conversationId, practiceArea, language, onConversationCreated, navigate, addUserMessage, send],
  );

  const handleSend = useCallback(
    async (message: string) => {
      if (DRAFT_PATTERN.test(message)) {
        addUserMessage(message, conversationId ?? "");
        setPendingDraftMessage(message);
        setShowDocGen(true);
        return;
      }

      await sendMessage(message);
    },
    [conversationId, addUserMessage, sendMessage],
  );

  const handleDocGenerate = useCallback(
    (format: "docx" | "pdf") => {
      setShowDocGen(false);
      if (pendingDraftMessage) {
        navigate(`/drafts?prompt=${encodeURIComponent(pendingDraftMessage)}&format=${format}`);
      }
      setPendingDraftMessage(null);
    },
    [pendingDraftMessage, navigate],
  );

  const handleDocContinue = useCallback(() => {
    setShowDocGen(false);
    if (pendingDraftMessage) {
      sendMessage(pendingDraftMessage);
    }
    setPendingDraftMessage(null);
  }, [pendingDraftMessage, sendMessage]);

  const mobileConvButton = onOpenConversations ? (
    <button
      onClick={onOpenConversations}
      className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 lg:hidden"
      aria-label="Open conversations"
    >
      <List className="h-5 w-5" />
    </button>
  ) : null;

  // Empty state (no conversation selected and no messages)
  if (!conversationId && messages.length === 0 && !isStreaming) {
    return (
      <div className="flex h-full flex-col">
        {mobileConvButton && (
          <div className="flex items-center px-3 pt-2 lg:hidden">
            {mobileConvButton}
          </div>
        )}
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-50">
            <Scale className="h-8 w-8 text-navy-600" />
          </div>
          <h2 className="mb-2 font-heading text-xl font-semibold text-navy-600">
            How can I help you today?
          </h2>
          <p className="mb-8 max-w-md text-center font-body text-sm text-gray-500">
            Ask me anything about Indian law — case research, legal drafting, statutory interpretation, and more.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                className="min-h-[48px] rounded-full border border-gray-200 bg-white px-4 py-2 font-heading text-sm text-gray-600 shadow-sm transition-all duration-150 hover:border-accent/30 hover:bg-accent/5 hover:shadow-md lg:min-h-0"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
        <ChatInput
          onSend={handleSend}
          disabled={isStreaming}
          practiceArea={practiceArea}
          onPracticeAreaChange={setPracticeArea}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {mobileConvButton && (
        <div className="flex items-center px-3 pt-2 lg:hidden">
          {mobileConvButton}
        </div>
      )}
      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4 lg:py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`h-16 animate-pulse rounded-2xl ${
                      i % 2 === 0 ? "w-48 bg-navy-100" : "w-64 bg-gray-100"
                    }`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  role={msg.role === "system" ? "assistant" : msg.role}
                  content={msg.content}
                  citations={msg.citations}
                />
              ))}

              {/* Streaming message */}
              {isStreaming && streamedText && (
                <MessageBubble
                  role="assistant"
                  content={streamedText}
                  isStreaming
                />
              )}

              {/* Error */}
              {error && (
                <div className="mx-auto max-w-md animate-fade-in rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-center font-heading text-sm text-error">
                  {error}
                </div>
              )}

              {/* Document generation card */}
              {showDocGen && (
                <DocGenCard
                  onGenerate={handleDocGenerate}
                  onContinue={handleDocContinue}
                />
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={isStreaming}
        practiceArea={practiceArea}
        onPracticeAreaChange={setPracticeArea}
      />
    </div>
  );
}
