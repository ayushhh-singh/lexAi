import { useState } from "react";
import { CheckCircle, AlertTriangle, X } from "lucide-react";
import type { Citation } from "@nyay/shared";
import { FeedbackWidget } from "../billing/FeedbackWidget";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  isStreaming?: boolean;
  messageId?: string;
}

function CitationPopover({ citation, onClose }: { citation: Citation; onClose: () => void }) {
  return (
    <div className="absolute bottom-full left-0 z-20 mb-2 w-80 animate-fade-in rounded-xl border border-gray-200 bg-white p-4 shadow-md">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-heading text-sm font-semibold text-navy-600">Source Details</span>
        <button
          onClick={onClose}
          className="rounded p-0.5 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mb-1 font-mono text-xs text-gray-500">{citation.source_type.toUpperCase()}</p>
      <p className="mb-2 font-heading text-sm font-medium text-gray-800">{citation.source}</p>
      <p className="font-body text-sm leading-relaxed text-gray-600">{citation.text}</p>
      {citation.verified !== undefined && (
        <div className="mt-3 flex items-center gap-1.5">
          {citation.verified ? (
            <>
              <CheckCircle className="h-3.5 w-3.5 text-success" />
              <span className="font-mono text-xs text-success">Verified</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
              <span className="font-mono text-xs text-warning">Unverified</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CitationBadge({ citation }: { citation: Citation }) {
  const [open, setOpen] = useState(false);
  const verified = citation.verified;

  return (
    <span className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs transition-colors duration-150 ${
          verified
            ? "bg-success/10 text-success hover:bg-success/20"
            : "bg-warning/10 text-warning hover:bg-warning/20"
        }`}
      >
        {verified ? (
          <CheckCircle className="h-3 w-3" />
        ) : (
          <AlertTriangle className="h-3 w-3" />
        )}
        {citation.source}
      </button>
      {open && <CitationPopover citation={citation} onClose={() => setOpen(false)} />}
    </span>
  );
}

export function MessageBubble({ role, content, citations, isStreaming, messageId }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={`flex animate-fade-in ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 lg:max-w-[70%] ${
          isUser
            ? "bg-navy-600 text-white"
            : "border border-gray-100 bg-gray-50 text-gray-800"
        }`}
      >
        <div
          className={`whitespace-pre-wrap text-sm leading-relaxed ${
            isUser ? "font-heading" : "font-body"
          }`}
        >
          {content}
          {isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-blink bg-navy-600" />
          )}
        </div>

        {/* Citations */}
        {citations && citations.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-gray-200 pt-2">
            {citations.map((c, i) => (
              <CitationBadge key={i} citation={c} />
            ))}
          </div>
        )}

        {/* Feedback — assistant messages only, after streaming completes */}
        {!isUser && !isStreaming && content.length > 0 && (
          <div className="mt-2 border-t border-gray-200 pt-2">
            <FeedbackWidget feature="chat" responseId={messageId} />
          </div>
        )}
      </div>
    </div>
  );
}
