import { supabaseAdmin } from "../lib/supabase.js";
import type { Conversation, Message, Citation } from "@nyay/shared";
import { AppError } from "../middleware/error.middleware.js";

export class ChatService {
  async createConversation(
    userId: string,
    title?: string,
    practiceArea?: string,
    caseMatterId?: string
  ): Promise<Conversation> {
    const { data, error } = await supabaseAdmin
      .from("conversations")
      .insert({
        user_id: userId,
        title: title ?? "New conversation",
        practice_area: practiceArea ?? null,
        case_matter_id: caseMatterId ?? null,
      })
      .select()
      .single();

    if (error) throw new AppError(500, "DB_ERROR", `Failed to create conversation: ${error.message}`);
    return data as Conversation;
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    const { data, error } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .eq("is_archived", false)
      .order("updated_at", { ascending: false });

    if (error) throw new AppError(500, "DB_ERROR", `Failed to fetch conversations: ${error.message}`);
    return (data ?? []) as Conversation[];
  }

  async getMessages(conversationId: string, userId: string): Promise<Message[]> {
    // Verify ownership
    await this.verifyOwnership(conversationId, userId);

    const { data, error } = await supabaseAdmin
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw new AppError(500, "DB_ERROR", `Failed to fetch messages: ${error.message}`);
    return (data ?? []) as unknown as Message[];
  }

  async saveMessage(
    conversationId: string,
    userId: string,
    role: "user" | "assistant",
    content: string,
    options?: {
      citations?: Citation[];
      aiModel?: string;
      tokensUsed?: number;
      metadata?: Record<string, unknown>;
    }
  ): Promise<Message> {
    // Verify the user owns this conversation before inserting
    await this.verifyOwnership(conversationId, userId);

    const { data, error } = await supabaseAdmin
      .from("messages")
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        role,
        content,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        citations: (options?.citations ?? []) as any,
        ai_model: options?.aiModel ?? null,
        tokens_used: options?.tokensUsed ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: (options?.metadata ?? {}) as any,
      })
      .select()
      .single();

    if (error) throw new AppError(500, "DB_ERROR", `Failed to save message: ${error.message}`);

    // Update conversation timestamp
    await supabaseAdmin
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return data as unknown as Message;
  }

  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    await this.verifyOwnership(conversationId, userId);

    // Delete messages first, then conversation
    await supabaseAdmin.from("messages").delete().eq("conversation_id", conversationId);

    const { error } = await supabaseAdmin
      .from("conversations")
      .delete()
      .eq("id", conversationId);

    if (error) throw new AppError(500, "DB_ERROR", `Failed to delete conversation: ${error.message}`);
  }

  async updateTitle(conversationId: string, userId: string, title: string): Promise<void> {
    await supabaseAdmin
      .from("conversations")
      .update({ title })
      .eq("id", conversationId)
      .eq("user_id", userId);
  }

  private async verifyOwnership(conversationId: string, userId: string): Promise<void> {
    const { data, error } = await supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      throw new AppError(404, "NOT_FOUND", "Conversation not found");
    }
  }
}

export const chatService = new ChatService();
