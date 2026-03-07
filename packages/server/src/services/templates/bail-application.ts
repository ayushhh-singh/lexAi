import type { TemplateDefinition } from "./index.js";

export const bailApplicationTemplate: TemplateDefinition = {
  id: "bail-application",
  name: "Bail Application",
  documentType: "bail_application",
  fields: [
    { key: "court_name", label: "Court Name", required: true, placeholder: "Hon'ble Sessions Court, Delhi" },
    { key: "case_number", label: "FIR / Case Number", required: true, placeholder: "FIR No. 123/2025" },
    { key: "police_station", label: "Police Station", required: true },
    { key: "applicant_name", label: "Applicant (Accused) Name", required: true },
    { key: "sections_charged", label: "Sections Charged Under", required: true, placeholder: "Sections 303, 304 BNS" },
    { key: "date_of_arrest", label: "Date of Arrest", required: false },
    { key: "grounds", label: "Grounds for Bail", required: true },
    { key: "advocate_name", label: "Advocate Name", required: true },
    { key: "opposing_party", label: "State / Complainant", required: false, placeholder: "State of Delhi" },
  ],
  instructionBuilder(values, context) {
    let instruction = `Draft a Bail Application for filing before an Indian court.

COURT: ${values.court_name}
CASE: ${values.case_number}, P.S. ${values.police_station}
APPLICANT: ${values.applicant_name}
SECTIONS: ${values.sections_charged}
ADVOCATE: ${values.advocate_name}`;

    if (values.date_of_arrest) {
      instruction += `\nDATE OF ARREST: ${values.date_of_arrest}`;
    }
    if (values.opposing_party) {
      instruction += `\nRESPONDENT: ${values.opposing_party}`;
    }

    instruction += `

GROUNDS FOR BAIL:
${values.grounds}

Structure:
1. Heading: "IN THE COURT OF [Judge designation]" / court name
2. Case caption: "Criminal Misc. Application No. ___ of ___"
3. Parties: "In the matter of: [Applicant] ...Applicant" / "Versus" / "State ...Respondent"
4. "APPLICATION FOR REGULAR BAIL U/S 483 BNSS" (or 438 for anticipatory)
5. Body paragraphs with "That..." format:
   - Brief facts of the case
   - Custody status and duration
   - Grounds for bail (numbered)
6. Prayer clause: "It is, therefore, most respectfully prayed..."
7. Verification: place, date, deponent statement
8. Advocate signature with enrollment number

Use BNS/BNSS sections (post July 2024). Cite relevant bail jurisprudence in AIR/SCC format.`;

    if (context) {
      instruction += `\n\nRELEVANT LEGAL CONTEXT:\n${context}`;
    }

    return instruction;
  },
};
