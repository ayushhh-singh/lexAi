import { useState, useCallback, useRef } from "react";
import type { Citation } from "@nyay/shared";
import { api } from "../lib/api-client";

interface StreamState {
  streamedText: string;
  isStreaming: boolean;
  error: string | null;
  citations: Citation[];
}

export function useStreamChat() {
  const [state, setState] = useState<StreamState>({
    streamedText: "",
    isStreaming: false,
    error: null,
    citations: [],
  });
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (body: { message: string; conversation_id: string; practice_area?: string; language?: string }) => {
      // Abort any in-flight stream
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({ streamedText: "", isStreaming: true, error: null, citations: [] });

      try {
        const response = await api.chat.stream(body, controller.signal);

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: { message: "Request failed" } }));
          throw new Error(err.error?.message ?? `HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        while (true) {
          if (controller.signal.aborted) break;
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // Keep incomplete last line in buffer
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6);
            if (!json) continue;

            try {
              const event = JSON.parse(json);

              if (event.type === "token") {
                accumulated += event.text;
                setState((s) => ({ ...s, streamedText: accumulated }));
              } else if (event.type === "done") {
                setState((s) => ({
                  ...s,
                  isStreaming: false,
                  citations: event.citations ?? [],
                }));
              } else if (event.type === "error") {
                setState((s) => ({
                  ...s,
                  isStreaming: false,
                  error: event.message ?? "An error occurred",
                }));
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        setState((s) => ({
          ...s,
          isStreaming: false,
          error: err instanceof Error ? err.message : "An error occurred",
        }));
      }
    },
    [],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState((s) => ({ ...s, isStreaming: false }));
  }, []);

  return { ...state, send, cancel };
}
