export const PRACTICE_AREAS = [
  { id: "criminal", label: "Criminal Law", icon: "gavel" },
  { id: "civil", label: "Civil Law", icon: "scale" },
  { id: "family", label: "Family Law", icon: "users" },
  { id: "corporate", label: "Corporate Law", icon: "building" },
  { id: "labour", label: "Labour & Employment Law", icon: "briefcase" },
  { id: "property", label: "Property & Real Estate", icon: "home" },
  { id: "tax", label: "Taxation Law", icon: "indian-rupee" },
  { id: "constitutional", label: "Constitutional Law", icon: "landmark" },
  { id: "ipr", label: "Intellectual Property", icon: "lightbulb" },
  { id: "consumer", label: "Consumer Protection", icon: "shield" },
  { id: "cyber", label: "Cyber Law", icon: "monitor" },
  { id: "environmental", label: "Environmental Law", icon: "leaf" },
  { id: "banking", label: "Banking & Finance", icon: "wallet" },
  { id: "arbitration", label: "Arbitration & Mediation", icon: "handshake" },
  { id: "immigration", label: "Immigration Law", icon: "plane" },
] as const;

export type PracticeAreaId = (typeof PRACTICE_AREAS)[number]["id"];
