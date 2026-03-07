import type { TemplateDefinition } from "./index.js";

export const legalNoticeTemplate: TemplateDefinition = {
  id: "legal-notice",
  name: "Legal Notice",
  documentType: "notice",
  fields: [
    { key: "sender_name", label: "Sender (Through Advocate)", required: true, placeholder: "Adv. Rajesh Kumar" },
    { key: "sender_address", label: "Sender Address", required: true },
    { key: "recipient_name", label: "Recipient Name", required: true },
    { key: "recipient_address", label: "Recipient Address", required: true },
    { key: "subject", label: "Subject / Re", required: true, placeholder: "Recovery of dues under..." },
    { key: "facts", label: "Facts of the Matter", required: true },
    { key: "demand", label: "Demand / Relief Sought", required: true },
    { key: "deadline_days", label: "Response Deadline (days)", required: false, placeholder: "15" },
    { key: "consequences", label: "Consequences of Non-Compliance", required: false },
  ],
  instructionBuilder(values, context) {
    const deadline = values.deadline_days || "15";
    let instruction = `Draft a formal Legal Notice under Indian law.

FROM: ${values.sender_name}
ADDRESS: ${values.sender_address}
TO: ${values.recipient_name}
ADDRESS: ${values.recipient_address}

SUBJECT: ${values.subject}

FACTS:
${values.facts}

DEMAND:
${values.demand}

The notice must demand a response within ${deadline} days.`;

    if (values.consequences) {
      instruction += `\n\nCONSEQUENCES OF NON-COMPLIANCE:\n${values.consequences}`;
    }

    instruction += `

Structure:
1. Date and "LEGAL NOTICE" heading
2. "Through: [Advocate name]" with enrollment number
3. "To:" block with recipient details
4. "Subject/Re:" line
5. Body: factual background with paragraph numbers
6. Demand with specific deadline
7. Consequences paragraph
8. Closing: "Under instructions of my client..."
9. Signature block with advocate details

Use formal legal language. Cite applicable sections (BNS/BNSS post July 2024, not IPC/CrPC). Use AIR/SCC citation format for any case law.`;

    if (context) {
      instruction += `\n\nRELEVANT LEGAL CONTEXT:\n${context}`;
    }

    return instruction;
  },
};
