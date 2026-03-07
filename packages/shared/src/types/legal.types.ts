export interface LegalCitation {
  citation: string;
  court: string;
  year: number;
  parties: string;
  volume?: string;
  page?: string;
  reporter?: string;
}

export interface CaseAnalysis {
  summary: string;
  key_issues: string[];
  applicable_sections: LegalSection[];
  relevant_precedents: LegalCitation[];
  recommended_actions: string[];
  risk_assessment: RiskLevel;
}

export interface LegalSection {
  act: string;
  section: string;
  title: string;
  description: string;
}

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface CourtHearing {
  date: string;
  time: string;
  court_name: string;
  court_room: string | null;
  judge: string | null;
  purpose: string;
  case_id: string;
}

export interface LawyerProfile {
  user_id: string;
  specializations: string[];
  courts_practiced: string[];
  languages: string[];
  consultation_fee: number;
  rating: number;
  total_cases: number;
  win_rate: number | null;
  bio: string;
}
