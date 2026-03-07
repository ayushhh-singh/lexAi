import type { TemplateDefinition } from "./index.js";

export const contractNdaTemplate: TemplateDefinition = {
  id: "contract-nda",
  name: "Non-Disclosure Agreement",
  documentType: "agreement",
  fields: [
    { key: "disclosing_party", label: "Disclosing Party Name", required: true },
    { key: "disclosing_party_address", label: "Disclosing Party Address", required: true },
    { key: "receiving_party", label: "Receiving Party Name", required: true },
    { key: "receiving_party_address", label: "Receiving Party Address", required: true },
    { key: "purpose", label: "Purpose of Disclosure", required: true, placeholder: "Evaluating a potential business partnership..." },
    { key: "confidential_info_scope", label: "Scope of Confidential Information", required: true },
    { key: "term_years", label: "Term (years)", required: false, placeholder: "2" },
    { key: "governing_law_state", label: "Governing Law (State)", required: false, placeholder: "Maharashtra" },
    { key: "jurisdiction_city", label: "Exclusive Jurisdiction (City)", required: false, placeholder: "Mumbai" },
  ],
  instructionBuilder(values, context) {
    const term = values.term_years || "2";
    const state = values.governing_law_state || "Maharashtra";
    const city = values.jurisdiction_city || "Mumbai";

    let instruction = `Draft a Non-Disclosure Agreement (NDA) under Indian law.

DISCLOSING PARTY: ${values.disclosing_party}, ${values.disclosing_party_address}
RECEIVING PARTY: ${values.receiving_party}, ${values.receiving_party_address}

PURPOSE: ${values.purpose}

SCOPE OF CONFIDENTIAL INFORMATION:
${values.confidential_info_scope}

TERM: ${term} years
GOVERNING LAW: Laws of India, State of ${state}
JURISDICTION: Courts at ${city}

Structure:
1. Title: "NON-DISCLOSURE AGREEMENT"
2. Preamble: "This Non-Disclosure Agreement ('Agreement') is entered into on this ___ day of ___, 20__"
3. "BETWEEN" block with party details ("hereinafter referred to as...")
4. "WHEREAS" recitals (purpose of agreement)
5. "NOW, THEREFORE, in consideration of the mutual covenants..."
6. Numbered clauses:
   1. Definitions (Confidential Information, Disclosing Party, Receiving Party)
   2. Obligations of Receiving Party
   3. Exclusions from Confidential Information
   4. Term and Termination
   5. Return of Materials
   6. Remedies (injunctive relief)
   7. No License / No Warranty
   8. Governing Law and Jurisdiction
   9. Entire Agreement / Amendment
   10. Severability
   11. Notices
7. "IN WITNESS WHEREOF" execution block
8. Signature blocks with witness lines

Use formal contract drafting language. Reference Indian Contract Act, 1872 and Information Technology Act, 2000 where applicable.`;

    if (context) {
      instruction += `\n\nRELEVANT LEGAL CONTEXT:\n${context}`;
    }

    return instruction;
  },
};
