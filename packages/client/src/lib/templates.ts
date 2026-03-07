import type { DocumentTemplate } from "@nyay/shared";

export interface TemplateField {
  key: string;
  label: string;
  required: boolean;
  placeholder?: string;
  type?: "text" | "textarea" | "date" | "select";
  options?: string[];
}

export interface TemplateDefinition {
  id: DocumentTemplate;
  name: string;
  description: string;
  icon: string;
  practiceArea: string;
  practiceAreaLabel: string;
  fields: TemplateField[];
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: "legal-notice",
    name: "Legal Notice",
    description: "Formal notice demanding action or remedy under Indian law, with statutory deadlines and consequences.",
    icon: "mail-warning",
    practiceArea: "civil",
    practiceAreaLabel: "Civil Law",
    fields: [
      { key: "sender_name", label: "Sender (Through Advocate)", required: true, placeholder: "Adv. Rajesh Kumar" },
      { key: "sender_address", label: "Sender Address", required: true, type: "textarea" },
      { key: "recipient_name", label: "Recipient Name", required: true },
      { key: "recipient_address", label: "Recipient Address", required: true, type: "textarea" },
      { key: "subject", label: "Subject / Re", required: true, placeholder: "Recovery of dues under..." },
      { key: "facts", label: "Facts of the Matter", required: true, type: "textarea" },
      { key: "demand", label: "Demand / Relief Sought", required: true, type: "textarea" },
      { key: "deadline_days", label: "Response Deadline (days)", required: false, placeholder: "15" },
      { key: "consequences", label: "Consequences of Non-Compliance", required: false, type: "textarea" },
    ],
  },
  {
    id: "bail-application",
    name: "Bail Application",
    description: "Application for regular or anticipatory bail before Sessions Court or High Court.",
    icon: "shield-check",
    practiceArea: "criminal",
    practiceAreaLabel: "Criminal Law",
    fields: [
      { key: "court_name", label: "Court Name", required: true, placeholder: "Hon'ble Sessions Court, Delhi" },
      { key: "case_number", label: "FIR / Case Number", required: true, placeholder: "FIR No. 123/2025" },
      { key: "police_station", label: "Police Station", required: true },
      { key: "applicant_name", label: "Applicant (Accused) Name", required: true },
      { key: "sections_charged", label: "Sections Charged Under", required: true, placeholder: "Sections 303, 304 BNS" },
      { key: "date_of_arrest", label: "Date of Arrest", required: false, type: "date" },
      { key: "grounds", label: "Grounds for Bail", required: true, type: "textarea" },
      { key: "advocate_name", label: "Advocate Name", required: true },
      { key: "opposing_party", label: "State / Complainant", required: false, placeholder: "State of Delhi" },
    ],
  },
  {
    id: "writ-petition",
    name: "Writ Petition",
    description: "Constitutional writ petition under Article 226 (High Court) or Article 32 (Supreme Court).",
    icon: "landmark",
    practiceArea: "constitutional",
    practiceAreaLabel: "Constitutional Law",
    fields: [
      { key: "court_name", label: "Court", required: true, placeholder: "Hon'ble High Court of Delhi" },
      { key: "article", label: "Article (226 or 32)", required: true, placeholder: "226", type: "select", options: ["226", "32"] },
      { key: "petitioner_name", label: "Petitioner Name", required: true },
      { key: "petitioner_description", label: "Petitioner Description", required: false },
      { key: "respondent_name", label: "Respondent Name", required: true },
      { key: "respondent_description", label: "Respondent Description", required: false },
      { key: "jurisdiction_facts", label: "Jurisdiction & Cause of Action", required: true, type: "textarea" },
      { key: "facts", label: "Facts of the Case", required: true, type: "textarea" },
      { key: "grounds", label: "Grounds", required: true, type: "textarea" },
      { key: "interim_relief", label: "Interim Relief Sought", required: false, type: "textarea" },
      { key: "prayer", label: "Final Prayer", required: true, type: "textarea" },
      { key: "advocate_name", label: "Advocate Name", required: true },
    ],
  },
  {
    id: "contract-nda",
    name: "Non-Disclosure Agreement",
    description: "Standard mutual or unilateral NDA for protecting confidential business information.",
    icon: "file-lock-2",
    practiceArea: "corporate",
    practiceAreaLabel: "Corporate Law",
    fields: [
      { key: "disclosing_party", label: "Disclosing Party Name", required: true },
      { key: "disclosing_party_address", label: "Disclosing Party Address", required: true, type: "textarea" },
      { key: "receiving_party", label: "Receiving Party Name", required: true },
      { key: "receiving_party_address", label: "Receiving Party Address", required: true, type: "textarea" },
      { key: "purpose", label: "Purpose of Disclosure", required: true, type: "textarea", placeholder: "Evaluating a potential business partnership..." },
      { key: "confidential_info_scope", label: "Scope of Confidential Information", required: true, type: "textarea" },
      { key: "term_years", label: "Term (years)", required: false, placeholder: "2" },
      { key: "governing_law_state", label: "Governing Law (State)", required: false, placeholder: "Maharashtra" },
      { key: "jurisdiction_city", label: "Exclusive Jurisdiction (City)", required: false, placeholder: "Mumbai" },
    ],
  },
  {
    id: "affidavit",
    name: "Affidavit",
    description: "Sworn statement of facts for submission before courts, tribunals, or administrative authorities.",
    icon: "stamp",
    practiceArea: "civil",
    practiceAreaLabel: "Civil Law",
    fields: [
      { key: "deponent_name", label: "Deponent Name", required: true },
      { key: "deponent_parent", label: "Father's / Husband's Name", required: true },
      { key: "deponent_age", label: "Age", required: true },
      { key: "deponent_address", label: "Residential Address", required: true, type: "textarea" },
      { key: "deponent_occupation", label: "Occupation", required: false },
      { key: "purpose", label: "Purpose of Affidavit", required: true, type: "textarea", placeholder: "For submission before the Hon'ble Court..." },
      { key: "statements", label: "Statements of Fact", required: true, type: "textarea" },
      { key: "court_name", label: "Court / Authority (if for court)", required: false },
      { key: "case_number", label: "Case Number (if applicable)", required: false },
    ],
  },
];

export function getTemplateById(id: string): TemplateDefinition | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByPracticeArea(): Record<string, TemplateDefinition[]> {
  const grouped: Record<string, TemplateDefinition[]> = {};
  for (const t of TEMPLATES) {
    if (!grouped[t.practiceAreaLabel]) {
      grouped[t.practiceAreaLabel] = [];
    }
    grouped[t.practiceAreaLabel].push(t);
  }
  return grouped;
}
