import { useState, useRef, useEffect } from "react";
import { Send, ChevronDown } from "lucide-react";
import { PRACTICE_AREAS } from "@nyay/shared";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  practiceArea: string | null;
  onPracticeAreaChange: (area: string | null) => void;
}

export function ChatInput({ onSend, disabled, practiceArea, onPracticeAreaChange }: ChatInputProps) {
  const [text, setText] = useState("");
  const [contextOpen, setContextOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [text]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!contextOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setContextOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [contextOpen]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    // Reset height
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-gray-100 bg-white px-4 py-3">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm transition-shadow duration-150 focus-within:shadow-md">
        {/* Context selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setContextOpen(!contextOpen)}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 font-heading text-xs text-gray-500 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-700"
            type="button"
          >
            {PRACTICE_AREAS.find((a) => a.id === practiceArea)?.label ?? "General"}
            <ChevronDown className="h-3 w-3" />
          </button>
          {contextOpen && (
            <div className="absolute bottom-full left-0 z-30 mb-2 max-h-48 w-48 animate-fade-in overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
              <button
                onClick={() => {
                  onPracticeAreaChange(null);
                  setContextOpen(false);
                }}
                className={`w-full px-3 py-2 text-left font-heading text-sm transition-colors duration-150 hover:bg-gray-50 ${
                  !practiceArea ? "text-accent font-medium" : "text-gray-600"
                }`}
              >
                General
              </button>
              {PRACTICE_AREAS.map((area) => (
                <button
                  key={area.id}
                  onClick={() => {
                    onPracticeAreaChange(area.id);
                    setContextOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left font-heading text-sm transition-colors duration-150 hover:bg-gray-50 ${
                    practiceArea === area.id ? "text-accent font-medium" : "text-gray-600"
                  }`}
                >
                  {area.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a legal question..."
          rows={1}
          disabled={disabled}
          className="max-h-40 min-h-[36px] flex-1 resize-none bg-transparent font-body text-sm text-gray-800 outline-none placeholder:text-gray-400 disabled:opacity-50"
        />

        {/* Send button */}
        <button
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-600 text-white transition-all duration-150 hover:bg-navy-500 disabled:opacity-40 disabled:hover:bg-navy-600"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1.5 text-center font-heading text-[11px] text-gray-400">
        AI responses are for reference only. Always verify with official sources.
      </p>
    </div>
  );
}
