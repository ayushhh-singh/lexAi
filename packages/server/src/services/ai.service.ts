import Anthropic from "@anthropic-ai/sdk";
import { config } from "../lib/config.js";

const anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

const CHAT_MODEL = "claude-sonnet-4-6";
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
    console.log(`[ai] streamChat start — ${messages.length} messages, model=${CHAT_MODEL}`);
    const startTime = Date.now();

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

    try {
      const finalMessage = await stream.finalMessage();
      const elapsed = Date.now() - startTime;
      console.log(`[ai] streamChat done — ${elapsed}ms, tokens: in=${finalMessage.usage.input_tokens} out=${finalMessage.usage.output_tokens}, chars=${fullText.length}`);

      await onDone(fullText, {
        input: finalMessage.usage.input_tokens,
        output: finalMessage.usage.output_tokens,
      });
    } catch (err) {
      console.error(`[ai] streamChat error after ${Date.now() - startTime}ms:`, err instanceof Error ? err.message : err);
      throw err;
    }
  }

  async classifyIntent(text: string): Promise<string> {
    console.log(`[ai] classifyIntent — query length=${text.length}`);
    const startTime = Date.now();
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
    const intent = block.type === "text" ? block.text.trim().toLowerCase() : "general_query";
    console.log(`[ai] classifyIntent result="${intent}" — ${Date.now() - startTime}ms`);
    return intent;
  }
}

export const aiService = new AIService();
