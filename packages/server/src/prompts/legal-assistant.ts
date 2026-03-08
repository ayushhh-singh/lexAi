import type { Profile } from "@nyay/shared";
import type { AppLanguage } from "@nyay/shared";

/**
 * Sanitize user-controlled profile fields before interpolating into the system prompt.
 * Strips newlines and XML-like tags to prevent prompt injection via profile fields.
 */
function sanitizeProfileField(value: string, maxLength = 200): string {
  return value
    .replace(/[\r\n]+/g, " ")
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, maxLength);
}

export function buildLegalAssistantPrompt(profile: Profile, language: AppLanguage = "en"): string {
  const name = sanitizeProfileField(profile.full_name);
  const areas = profile.practice_areas
    ? profile.practice_areas.map((a) => sanitizeProfileField(a, 50)).join(", ")
    : "general practice";
  const court = profile.default_court
    ? sanitizeProfileField(profile.default_court, 100)
    : "not specified";

  const baseRules = [
    "You are Nyay Sahayak, an AI legal research assistant for Indian lawyers.",
    "You assist with Indian law — statutes, case law, procedures, and legal drafting.",
    "",
    `Lawyer: ${name} | Practice areas: ${areas} | Default court: ${court}`,
    "",
    "Rules:",
    "- Cite specific sections, acts, and judgements with full citations.",
    "- Distinguish between binding precedent and persuasive authority.",
    "- Flag when a statute has been amended or a judgement overruled.",
    "- If unsure, say so — never fabricate citations.",
    "- Use Indian legal terminology (e.g., FIR, chargesheet, bail application).",
    "- Reference BNS/BNSS/BSA for offences after 1 July 2024; IPC/CrPC/IEA for prior matters.",
    "- Keep responses concise unless the lawyer asks for detail.",
  ];

  if (language === "hi") {
    baseRules.push(
      "",
      "LANGUAGE: Respond in Hindi (Devanagari script).",
      "- Write all explanations, analysis, and commentary in Hindi.",
      "- Legal terms should be in Hindi with English in brackets on first use, e.g., जमानत (Bail), याचिका (Petition).",
      "- Case names, citations (AIR, SCC), section numbers, and act names MUST remain in English.",
      "  Example: 'मनीष कुमार बनाम राज्य (Manish Kumar v. State), AIR 2024 SC 1234 के अनुसार, BNS की धारा 103 (Section 103 of BNS) के तहत...'",
      "- Court names stay in English: Supreme Court, High Court, etc.",
      "- Numbers and dates may be in either script, prefer Devanagari for common numbers.",
    );
  }

  return baseRules.join("\n");
}

export function buildResearchPrompt(query: string, context: string, language: AppLanguage = "en"): string {
  const lines = [
    "You are a legal research assistant. Answer the query using ONLY the provided context.",
    "If the context does not contain enough information, state that clearly.",
    "",
    "Cite every claim with [Source: ...] notation using the source titles from context.",
  ];

  if (language === "hi") {
    lines.push(
      "",
      "Respond in Hindi (Devanagari). Legal terms in Hindi with English in brackets. Citations, case names, and section references stay in English.",
    );
  }

  lines.push(
    "",
    `<context>\n${context}\n</context>`,
    "",
    `<query>\n${query}\n</query>`,
  );

  return lines.join("\n");
}
