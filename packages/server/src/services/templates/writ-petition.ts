import type { TemplateDefinition } from "./index.js";

export const writPetitionTemplate: TemplateDefinition = {
  id: "writ-petition",
  name: "Writ Petition",
  documentType: "petition",
  fields: [
    { key: "court_name", label: "Court", required: true, placeholder: "Hon'ble High Court of Delhi" },
    { key: "article", label: "Article (226 or 32)", required: true, placeholder: "226" },
    { key: "petitioner_name", label: "Petitioner Name", required: true },
    { key: "petitioner_description", label: "Petitioner Description", required: false },
    { key: "respondent_name", label: "Respondent Name", required: true },
    { key: "respondent_description", label: "Respondent Description", required: false },
    { key: "jurisdiction_facts", label: "Jurisdiction & Cause of Action", required: true },
    { key: "facts", label: "Facts of the Case", required: true },
    { key: "grounds", label: "Grounds", required: true },
    { key: "interim_relief", label: "Interim Relief Sought", required: false },
    { key: "prayer", label: "Final Prayer", required: true },
    { key: "advocate_name", label: "Advocate Name", required: true },
  ],
  instructionBuilder(values, context) {
    let instruction = `Draft a Writ Petition under Article ${values.article} of the Constitution of India.

COURT: ${values.court_name}
PETITIONER: ${values.petitioner_name}${values.petitioner_description ? ` (${values.petitioner_description})` : ""}
RESPONDENT: ${values.respondent_name}${values.respondent_description ? ` (${values.respondent_description})` : ""}
ADVOCATE: ${values.advocate_name}

JURISDICTION & CAUSE OF ACTION:
${values.jurisdiction_facts}

FACTS:
${values.facts}

GROUNDS:
${values.grounds}

PRAYER:
${values.prayer}`;

    if (values.interim_relief) {
      instruction += `\n\nINTERIM RELIEF:\n${values.interim_relief}`;
    }

    instruction += `

Structure:
1. Heading: "IN THE HON'BLE HIGH COURT OF [State] AT [Seat]" or "IN THE HON'BLE SUPREME COURT OF INDIA"
2. "WRIT PETITION (CIVIL/CRIMINAL) NO. ___ OF ___"
3. Caption: "IN THE MATTER OF: Article ${values.article} of the Constitution of India"
4. Parties block with designations
5. "PETITION UNDER ARTICLE ${values.article} OF THE CONSTITUTION OF INDIA"
6. Numbered paragraphs:
   a. Jurisdiction & maintainability
   b. Facts in chronological order ("That..." format)
   c. Grounds (separately numbered)
7. Interim relief prayer (if applicable)
8. Main prayer with specific writs sought (mandamus/certiorari/prohibition/habeas/quo warranto)
9. Verification
10. Advocate-on-Record / Advocate signature

Cite constitutional provisions, relevant statutes (BNS/BNSS/BSA post July 2024), and case law in AIR/SCC format.`;

    if (context) {
      instruction += `\n\nRELEVANT LEGAL CONTEXT:\n${context}`;
    }

    return instruction;
  },
};
