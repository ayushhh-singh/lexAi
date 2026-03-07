// Indian legal citation patterns
export const CITATION_PATTERNS = {
  // AIR 2023 SC 1234
  AIR: /AIR\s+(\d{4})\s+(SC|Del|Bom|Cal|Mad|All|Kar|Ker|Pat|Raj|AP|Guj|HP|J&K|MP|Ori|P&H|Pun)\s+(\d+)/g,
  // (2023) 1 SCC 123
  SCC: /\((\d{4})\)\s+(\d+)\s+SCC\s+(\d+)/g,
  // 2023 INSC 1 (Neutral citation — Supreme Court)
  NEUTRAL: /(\d{4})\s+INSC\s+(\d+)/g,
  // (2023) 1 SCR 123
  SCR: /\((\d{4})\)\s+(\d+)\s+SCR\s+(\d+)/g,
  // 2023 SCC OnLine SC 1234
  SCC_ONLINE: /(\d{4})\s+SCC\s+OnLine\s+(SC|Del|Bom|Cal|Mad|All|Kar|Ker)\s+(\d+)/g,
  // ILR 2023 Kar 1234
  ILR: /ILR\s+(\d{4})\s+(Kar|Del|Bom|Cal|Mad|All)\s+(\d+)/g,
  // CrLJ 2023 SC 1234
  CRLJ: /CrLJ\s+(\d{4})\s+(\w+)\s+(\d+)/g,
  // Section references: Section 302 of IPC / BNS / BNSS / BSA
  SECTION_REF: /[Ss]ection\s+(\d+[A-Za-z]*)\s+(?:of\s+(?:the\s+)?)?([A-Z][A-Za-z]{0,60}(?:\s[A-Za-z,]{1,30}){0,5}\s*(?:Act|Code)(?:,?\s*\d{4})?|BNS(?:\s+\d{4})?|BNSS(?:\s+\d{4})?|BSA(?:\s+\d{4})?|IPC|CrPC|CPC)/g,
  // Article references: Article 21 of the Constitution
  ARTICLE_REF: /[Aa]rticle\s+(\d+[A-Za-z]*)\s+(?:of\s+(?:the\s+)?)?Constitution/g,
  // Order and Rule: Order VII Rule 11 of CPC
  ORDER_RULE: /[Oo]rder\s+([IVXLC]+)\s+[Rr]ule\s+(\d+)\s+(?:of\s+(?:the\s+)?)?([A-Z][A-Za-z]{1,30}(?:\s[A-Za-z]{1,30}){0,4})/g,
} as const;

export type CitationFormat =
  | "AIR"
  | "SCC"
  | "NEUTRAL"
  | "SCR"
  | "SCC_ONLINE"
  | "ILR"
  | "CRLJ"
  | "SECTION_REF"
  | "ARTICLE_REF"
  | "ORDER_RULE";

export interface ParsedCitation {
  raw: string;
  format: CitationFormat;
  year?: number;
  court?: string;
  section?: string;
  act?: string;
}

export interface CitationVerification {
  citation: ParsedCitation;
  verified: boolean;
  chunk_id?: string;
  source_title?: string;
  suggestion?: string;
}

export function extractCitations(text: string): string[] {
  const citations: string[] = [];
  for (const pattern of Object.values(CITATION_PATTERNS)) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      citations.push(match[0]);
    }
  }
  return [...new Set(citations)];
}

export function parseCitations(text: string): ParsedCitation[] {
  const seen = new Set<string>();
  const results: ParsedCitation[] = [];

  const caseFormats: CitationFormat[] = ["AIR", "SCC", "NEUTRAL", "SCR", "SCC_ONLINE", "ILR", "CRLJ"];
  for (const format of caseFormats) {
    const regex = new RegExp(CITATION_PATTERNS[format].source, CITATION_PATTERNS[format].flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (seen.has(match[0])) continue;
      seen.add(match[0]);
      results.push({
        raw: match[0],
        format,
        year: Number(match[1]),
        // NEUTRAL only has 2 groups (year, number) — no court group
        court: format === "NEUTRAL" ? "SC" : match[2],
      });
    }
  }

  // Section references
  const secRegex = new RegExp(CITATION_PATTERNS.SECTION_REF.source, CITATION_PATTERNS.SECTION_REF.flags);
  let secMatch;
  while ((secMatch = secRegex.exec(text)) !== null) {
    if (seen.has(secMatch[0])) continue;
    seen.add(secMatch[0]);
    results.push({
      raw: secMatch[0],
      format: "SECTION_REF",
      section: secMatch[1],
      act: secMatch[2].trim(),
    });
  }

  // Article references
  const artRegex = new RegExp(CITATION_PATTERNS.ARTICLE_REF.source, CITATION_PATTERNS.ARTICLE_REF.flags);
  let artMatch;
  while ((artMatch = artRegex.exec(text)) !== null) {
    if (seen.has(artMatch[0])) continue;
    seen.add(artMatch[0]);
    results.push({
      raw: artMatch[0],
      format: "ARTICLE_REF",
      section: artMatch[1],
      act: "Constitution of India",
    });
  }

  // Order and Rule
  const ordRegex = new RegExp(CITATION_PATTERNS.ORDER_RULE.source, CITATION_PATTERNS.ORDER_RULE.flags);
  let ordMatch;
  while ((ordMatch = ordRegex.exec(text)) !== null) {
    if (seen.has(ordMatch[0])) continue;
    seen.add(ordMatch[0]);
    results.push({
      raw: ordMatch[0],
      format: "ORDER_RULE",
      section: `Order ${ordMatch[1]} Rule ${ordMatch[2]}`,
      act: ordMatch[3].trim(),
    });
  }

  return results;
}

export function extractSectionReferences(
  text: string
): Array<{ section: string; act: string }> {
  const refs: Array<{ section: string; act: string }> = [];
  const regex = new RegExp(
    CITATION_PATTERNS.SECTION_REF.source,
    CITATION_PATTERNS.SECTION_REF.flags
  );
  let match;
  while ((match = regex.exec(text)) !== null) {
    refs.push({ section: match[1], act: match[2].trim() });
  }
  return refs;
}
