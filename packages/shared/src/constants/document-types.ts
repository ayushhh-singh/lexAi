export const DOCUMENT_TYPES = [
  { id: "petition", label: "Petition" },
  { id: "affidavit", label: "Affidavit" },
  { id: "complaint", label: "Complaint" },
  { id: "fir", label: "FIR Copy" },
  { id: "charge_sheet", label: "Charge Sheet" },
  { id: "written_statement", label: "Written Statement" },
  { id: "evidence", label: "Evidence Document" },
  { id: "judgement", label: "Judgement/Order" },
  { id: "appeal", label: "Appeal" },
  { id: "bail_application", label: "Bail Application" },
  { id: "vakalatnama", label: "Vakalatnama" },
  { id: "power_of_attorney", label: "Power of Attorney" },
  { id: "agreement", label: "Agreement/Contract" },
  { id: "notice", label: "Legal Notice" },
  { id: "reply", label: "Reply/Response" },
  { id: "memo", label: "Memo of Parties" },
  { id: "other", label: "Other" },
] as const;

export type DocumentTypeId = (typeof DOCUMENT_TYPES)[number]["id"];
