import Anthropic from "@anthropic-ai/sdk";
import { config } from "../lib/config.js";

const anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

const CHAT_MODEL = "claude-sonnet-4-5-20250514";
const CLASSIFY_MODEL = "claude-haiku-4-5-20251001";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export class AIService {
  async streamChat(
    systemPrompt: string,
    messages: ChatMessage[],
    onToken: (text: string) => void,
    onDone: (fullText: string, usage: { input: number; output: number }) => void | Promise<void>
  ): Promise<void> {
    const stream = anthropic.messages.stream({
      model: CHAT_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    });

    let fullText = "";

    stream.on("text", (text) => {
      fullText += text;
      onToken(text);
    });

    const finalMessage = await stream.finalMessage();

    await onDone(fullText, {
      input: finalMessage.usage.input_tokens,
      output: finalMessage.usage.output_tokens,
    });
  }

  async classifyIntent(text: string): Promise<string> {
    const response = await anthropic.messages.create({
      model: CLASSIFY_MODEL,
      max_tokens: 50,
      system:
        "Classify the user's legal query intent into exactly one category. " +
        "Reply with ONLY the category name, nothing else.\n" +
        "Categories: general_query, case_law_research, statute_lookup, " +
        "draft_document, summarize, procedural_question, opinion",
      messages: [{ role: "user", content: text }],
    });

    const block = response.content[0];
    return block.type === "text" ? block.text.trim().toLowerCase() : "general_query";
  }
}

export const aiService = new AIService();
