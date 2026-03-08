import { supabaseAdmin } from "../lib/supabase.js";
import { AppError } from "../middleware/error.middleware.js";
import type {
  CaseMatter,
  CaseDeadline,
  CaseStats,
  CaseWithStats,
  CaseNote,
  CreateCaseInput,
  UpdateCaseInput,
  CaseFilterInput,
} from "@nyay/shared";

export class CasesService {
  async create(userId: string, input: CreateCaseInput): Promise<CaseMatter> {
    const { data, error } = await supabaseAdmin
      .from("case_matters")
      .insert({
        user_id: userId,
        title: input.title,
        description: input.description ?? null,
        case_type: input.case_type,
        court_level: input.court_level,
        court_name: input.court_name ?? null,
        practice_area: input.practice_area,
        status: "draft",
        filing_date: input.filing_date ?? null,
      })
      .select()
      .single();

    if (error) throw new AppError(500, "DB_ERROR", `Failed to create case: ${error.message}`);
    return data as CaseMatter;
  }

  async list(userId: string, filters: CaseFilterInput): Promise<{ cases: CaseWithStats[]; total: number }> {
    let query = supabaseAdmin
      .from("case_matters")
      .select("*", { count: "exact" })
      .eq("user_id", userId);

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.practice_area) query = query.eq("practice_area", filters.practice_area);
    if (filters.court_level) query = query.eq("court_level", filters.court_level);
    if (filters.search) {
      // Sanitize search input for PostgREST .or() filter to prevent filter injection
      const sanitized = filters.search.replace(/[%_,().]/g, "");
      if (sanitized.length > 0) {
        query = query.or(`title.ilike.%${sanitized}%,case_number.ilike.%${sanitized}%,description.ilike.%${sanitized}%`);
      }
    }

    const offset = (filters.page - 1) * filters.limit;
    query = query.order("updated_at", { ascending: false }).range(offset, offset + filters.limit - 1);

    const { data, error, count } = await query;
    if (error) throw new AppError(500, "DB_ERROR", `Failed to fetch cases: ${error.message}`);

    const cases = data as CaseMatter[];
    const casesWithStats = await Promise.all(
      cases.map(async (c) => ({
        ...c,
        stats: await this.getStats(c.id, userId),
      }))
    );

    return { cases: casesWithStats, total: count ?? 0 };
  }

  async get(id: string, userId: string): Promise<CaseWithStats> {
    const { data, error } = await supabaseAdmin
      .from("case_matters")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error || !data) throw new AppError(404, "NOT_FOUND", "Case not found");
    const stats = await this.getStats(id, userId);
    return { ...(data as CaseMatter), stats };
  }

  async update(id: string, userId: string, input: UpdateCaseInput): Promise<CaseMatter> {
    await this.verifyOwnership(id, userId);

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.case_type !== undefined) updateData.case_type = input.case_type;
    if (input.court_level !== undefined) updateData.court_level = input.court_level;
    if (input.court_name !== undefined) updateData.court_name = input.court_name;
    if (input.practice_area !== undefined) updateData.practice_area = input.practice_area;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.case_number !== undefined) updateData.case_number = input.case_number;
    if (input.filing_date !== undefined) updateData.filing_date = input.filing_date;
    if (input.next_hearing_date !== undefined) updateData.next_hearing_date = input.next_hearing_date;
    if (input.lawyer_id !== undefined) updateData.lawyer_id = input.lawyer_id;
    if (input.opposing_party !== undefined) updateData.opposing_party = input.opposing_party;
    if (input.opposing_counsel !== undefined) updateData.opposing_counsel = input.opposing_counsel;

    const { data, error } = await supabaseAdmin
      .from("case_matters")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw new AppError(500, "DB_ERROR", `Failed to update case: ${error.message}`);
    return data as CaseMatter;
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.verifyOwnership(id, userId);

    const { error } = await supabaseAdmin
      .from("case_matters")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw new AppError(500, "DB_ERROR", `Failed to delete case: ${error.message}`);
  }

  // ─── Deadlines ──────────────────────────────────────────────────

  async getDeadlines(caseId: string, userId: string): Promise<CaseDeadline[]> {
    await this.verifyOwnership(caseId, userId);

    const { data, error } = await supabaseAdmin
      .from("case_deadlines")
      .select("*")
      .eq("case_matter_id", caseId)
      .order("deadline_date", { ascending: true });

    if (error) throw new AppError(500, "DB_ERROR", `Failed to fetch deadlines: ${error.message}`);
    return (data ?? []) as CaseDeadline[];
  }

  async createDeadline(
    caseId: string,
    userId: string,
    input: { title: string; description?: string; deadline_date: string; deadline_type: string; reminder_days?: number[] }
  ): Promise<CaseDeadline> {
    await this.verifyOwnership(caseId, userId);

    const { data, error } = await supabaseAdmin
      .from("case_deadlines")
      .insert({
        case_matter_id: caseId,
        user_id: userId,
        title: input.title,
        description: input.description ?? null,
        deadline_date: input.deadline_date,
        deadline_type: input.deadline_type,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reminder_days: (input.reminder_days ?? [7, 3, 1]) as any,
      })
      .select()
      .single();

    if (error) throw new AppError(500, "DB_ERROR", `Failed to create deadline: ${error.message}`);
    return data as CaseDeadline;
  }

  async toggleDeadline(deadlineId: string, userId: string): Promise<CaseDeadline> {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("case_deadlines")
      .select("*")
      .eq("id", deadlineId)
      .eq("user_id", userId)
      .single();

    if (fetchErr || !existing) throw new AppError(404, "NOT_FOUND", "Deadline not found");

    const { data, error } = await supabaseAdmin
      .from("case_deadlines")
      .update({ is_completed: !existing.is_completed })
      .eq("id", deadlineId)
      .select()
      .single();

    if (error) throw new AppError(500, "DB_ERROR", `Failed to toggle deadline: ${error.message}`);
    return data as CaseDeadline;
  }

  // ─── Notes ──────────────────────────────────────────────────────

  async getNotes(caseId: string, userId: string): Promise<CaseNote[]> {
    await this.verifyOwnership(caseId, userId);

    // case_notes table — will be added via migration; cast until supabase types are regenerated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from("case_notes")
      .select("*")
      .eq("case_matter_id", caseId)
      .order("created_at", { ascending: false });

    if (error) throw new AppError(500, "DB_ERROR", `Failed to fetch notes: ${error.message}`);
    return (data ?? []) as CaseNote[];
  }

  async createNote(caseId: string, userId: string, content: string): Promise<CaseNote> {
    await this.verifyOwnership(caseId, userId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from("case_notes")
      .insert({ case_matter_id: caseId, user_id: userId, content })
      .select()
      .single();

    if (error) throw new AppError(500, "DB_ERROR", `Failed to create note: ${error.message}`);
    return data as CaseNote;
  }

  async deleteNote(noteId: string, userId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from("case_notes")
      .delete()
      .eq("id", noteId)
      .eq("user_id", userId);

    if (error) throw new AppError(500, "DB_ERROR", `Failed to delete note: ${error.message}`);
  }

  // ─── Summary Report ────────────────────────────────────────────

  async getSummaryContext(caseId: string, userId: string) {
    const caseMatter = await this.get(caseId, userId);

    const [docs, deadlines, conversations] = await Promise.all([
      supabaseAdmin
        .from("legal_documents")
        .select("id, title, document_type, created_at")
        .eq("case_matter_id", caseId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("case_deadlines")
        .select("*")
        .eq("case_matter_id", caseId)
        .order("deadline_date", { ascending: true }),
      supabaseAdmin
        .from("conversations")
        .select("id, title, practice_area, created_at")
        .eq("case_matter_id", caseId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return {
      caseMatter,
      documents: docs.data ?? [],
      deadlines: (deadlines.data ?? []) as CaseDeadline[],
      conversations: conversations.data ?? [],
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────

  private async getStats(caseId: string, userId: string): Promise<CaseStats> {
    const now = new Date().toISOString();

    const [docsRes, convsRes, deadlinesRes] = await Promise.all([
      supabaseAdmin
        .from("legal_documents")
        .select("id", { count: "exact", head: true })
        .eq("case_matter_id", caseId)
        .eq("user_id", userId),
      supabaseAdmin
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("case_matter_id", caseId)
        .eq("user_id", userId),
      supabaseAdmin
        .from("case_deadlines")
        .select("id, deadline_date, is_completed")
        .eq("case_matter_id", caseId),
    ]);

    const deadlines = (deadlinesRes.data ?? []) as Array<{ id: string; deadline_date: string; is_completed: boolean }>;
    const upcoming = deadlines.filter((d) => !d.is_completed && d.deadline_date >= now).length;
    const overdue = deadlines.filter((d) => !d.is_completed && d.deadline_date < now).length;

    return {
      total_documents: docsRes.count ?? 0,
      total_conversations: convsRes.count ?? 0,
      total_deadlines: deadlines.length,
      upcoming_deadlines: upcoming,
      overdue_deadlines: overdue,
    };
  }

  private async verifyOwnership(caseId: string, userId: string): Promise<void> {
    const { data, error } = await supabaseAdmin
      .from("case_matters")
      .select("id")
      .eq("id", caseId)
      .eq("user_id", userId)
      .single();

    if (error || !data) throw new AppError(404, "NOT_FOUND", "Case not found");
  }
}

export const casesService = new CasesService();
