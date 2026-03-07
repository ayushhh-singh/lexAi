// Indian legal citation patterns
export const CITATION_PATTERNS = {
  // AIR 2023 SC 1234
  AIR: /AIR\s+(\d{4})\s+(SC|Del|Bom|Cal|Mad|All|Kar|Ker|Pat|Raj|AP|Guj|HP|J&K|MP|Ori|P&H|Pun)\s+(\d+)/g,
  // (2023) 1 SCC 123
  SCC: /\((\d{4})\)\s+(\d+)\s+SCC\s+(\d+)/g,
  // 2023 SCC OnLine SC 1234
  SCC_ONLINE: /(\d{4})\s+SCC\s+OnLine\s+(SC|Del|Bom|Cal|Mad|All|Kar|Ker)\s+(\d+)/g,
  // ILR 2023 Kar 1234
  ILR: /ILR\s+(\d{4})\s+(Kar|Del|Bom|Cal|Mad|All)\s+(\d+)/g,
  // CrLJ 2023 SC 1234
  CRLJ: /CrLJ\s+(\d{4})\s+(\w+)\s+(\d+)/g,
  // Section references: Section 302 of IPC
  SECTION_REF: /[Ss]ection\s+(\d+[A-Za-z]*)\s+(?:of\s+(?:the\s+)?)?([A-Z][A-Za-z\s,]+(?:Act|Code)(?:,?\s*\d{4})?)/g,
  // Article references: Article 21 of the Constitution
  ARTICLE_REF: /[Aa]rticle\s+(\d+[A-Za-z]*)\s+(?:of\s+(?:the\s+)?)?Constitution/g,
  // Order and Rule: Order VII Rule 11 of CPC
  ORDER_RULE: /[Oo]rder\s+([IVXLC]+)\s+[Rr]ule\s+(\d+)\s+(?:of\s+(?:the\s+)?)?([A-Z][A-Za-z\s]+)/g,
} as const;

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
