import type { TemplateDefinition } from "./index.js";

export const affidavitTemplate: TemplateDefinition = {
  id: "affidavit",
  name: "Affidavit",
  documentType: "affidavit",
  fields: [
    { key: "deponent_name", label: "Deponent Name", required: true },
    { key: "deponent_parent", label: "Father's / Husband's Name", required: true },
    { key: "deponent_age", label: "Age", required: true },
    { key: "deponent_address", label: "Residential Address", required: true },
    { key: "deponent_occupation", label: "Occupation", required: false },
    { key: "purpose", label: "Purpose of Affidavit", required: true, placeholder: "For submission before the Hon'ble Court..." },
    { key: "statements", label: "Statements of Fact", required: true },
    { key: "court_name", label: "Court / Authority (if for court)", required: false },
    { key: "case_number", label: "Case Number (if applicable)", required: false },
  ],
  instructionBuilder(values, context) {
    let instruction = `Draft an Affidavit under Indian law.

DEPONENT: ${values.deponent_name}
S/O or D/O or W/O: ${values.deponent_parent}
AGE: ${values.deponent_age} years
ADDRESS: ${values.deponent_address}`;

    if (values.deponent_occupation) {
      instruction += `\nOCCUPATION: ${values.deponent_occupation}`;
    }

    instruction += `

PURPOSE: ${values.purpose}`;

    if (values.court_name) {
      instruction += `\nCOURT: ${values.court_name}`;
    }
    if (values.case_number) {
      instruction += `\nCASE: ${values.case_number}`;
    }

    instruction += `

STATEMENTS:
${values.statements}

Structure:
1. Heading: "AFFIDAVIT"
2. If for court: case caption (court name, case number, parties)
3. Deponent introduction: "I, [Name], S/o [Father], aged [age] years, R/o [Address], do hereby solemnly affirm and state on oath as under:"
4. Numbered statements, each beginning with "That..."
   - First paragraph: identity and capacity
   - Subsequent: facts as provided
   - Final: "That the contents of the above affidavit are true and correct to the best of my knowledge and belief..."
5. Verification clause:
   "VERIFICATION
   Verified at [Place] on this ___ day of ___, 20__ that the contents of the above affidavit are true and correct to the best of my knowledge and belief and nothing material has been concealed therefrom."
6. Signature line: "DEPONENT"
7. "BEFORE ME" block for Notary Public / Oath Commissioner

Use formal legal language appropriate for sworn statements.`;

    if (context) {
      instruction += `\n\nRELEVANT LEGAL CONTEXT:\n${context}`;
    }

    return instruction;
  },
};
