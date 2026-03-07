import type { DocumentTemplate } from "@nyay/shared";

export interface TemplateField {
  key: string;
  label: string;
  required: boolean;
  placeholder?: string;
}

export interface TemplateDefinition {
  id: DocumentTemplate;
  name: string;
  documentType: string;
  fields: TemplateField[];
  instructionBuilder: (values: Record<string, string>, context?: string) => string;
}

import { legalNoticeTemplate } from "./legal-notice.js";
import { bailApplicationTemplate } from "./bail-application.js";
import { writPetitionTemplate } from "./writ-petition.js";
import { contractNdaTemplate } from "./contract-nda.js";
import { affidavitTemplate } from "./affidavit.js";

const templates: Record<DocumentTemplate, TemplateDefinition> = {
  "legal-notice": legalNoticeTemplate,
  "bail-application": bailApplicationTemplate,
  "writ-petition": writPetitionTemplate,
  "contract-nda": contractNdaTemplate,
  "affidavit": affidavitTemplate,
};

export function getTemplate(id: DocumentTemplate): TemplateDefinition {
  const template = templates[id];
  if (!template) {
    throw new Error(`Unknown template: ${id}`);
  }
  return template;
}

export function getAllTemplates(): TemplateDefinition[] {
  return Object.values(templates);
}
