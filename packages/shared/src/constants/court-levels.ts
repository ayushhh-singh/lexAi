export const COURT_LEVELS = [
  { id: "supreme_court", label: "Supreme Court of India", abbreviation: "SC" },
  { id: "high_court", label: "High Court", abbreviation: "HC" },
  { id: "district_court", label: "District Court", abbreviation: "DC" },
  { id: "sessions_court", label: "Sessions Court", abbreviation: "SC" },
  { id: "magistrate_court", label: "Magistrate Court", abbreviation: "MC" },
  { id: "family_court", label: "Family Court", abbreviation: "FC" },
  { id: "consumer_court", label: "Consumer Court", abbreviation: "CC" },
  { id: "labour_court", label: "Labour Court", abbreviation: "LC" },
  { id: "tribunal", label: "Tribunal", abbreviation: "T" },
  { id: "nclt", label: "NCLT", abbreviation: "NCLT" },
  { id: "ncdrc", label: "NCDRC", abbreviation: "NCDRC" },
  { id: "itat", label: "ITAT", abbreviation: "ITAT" },
  { id: "ngt", label: "National Green Tribunal", abbreviation: "NGT" },
] as const;

export type CourtLevelId = (typeof COURT_LEVELS)[number]["id"];

export const HIGH_COURTS = [
  "Allahabad", "Andhra Pradesh", "Bombay", "Calcutta", "Chhattisgarh",
  "Delhi", "Gauhati", "Gujarat", "Himachal Pradesh", "Jammu & Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Madras",
  "Manipur", "Meghalaya", "Orissa", "Patna", "Punjab & Haryana",
  "Rajasthan", "Sikkim", "Telangana", "Tripura", "Uttarakhand",
] as const;
