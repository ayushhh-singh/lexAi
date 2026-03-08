import type {
  LimitationPeriod,
  LimitationCategory,
  LimitationCalculation,
  LimitationSuggestion,
  ExclusionInput,
  CalculateLimitationInput,
  LimitationSuggestInput,
} from "@nyay/shared";

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Add a limitation period to a date using calendar-based computation.
 * Legal limitation in India uses calendar years/months, not fixed day counts.
 * e.g. 3 years from 29 Jan 2023 = 29 Jan 2026, accounting for leap years.
 */
function addPeriodToDate(base: Date, periodDays: number, periodLabel: string): Date {
  const result = new Date(base);
  const match = periodLabel.match(/^(\d+)\s+(year|month|day)/i);
  if (match) {
    const n = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    if (unit === "year" || unit === "years") {
      result.setFullYear(result.getFullYear() + n);
      return result;
    }
    if (unit === "month" || unit === "months") {
      result.setMonth(result.getMonth() + n);
      return result;
    }
  }
  // Fallback for day-based and non-standard labels (e.g. "90 days")
  result.setDate(result.getDate() + periodDays);
  return result;
}

/**
 * Parse a YYYY-MM-DD string as a local-midnight Date (no timezone shift).
 */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Format a Date as YYYY-MM-DD (local).
 */
function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Days between two local-midnight dates.
 */
function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Limitation Periods (Limitation Act, 1963 + Special Statutes) ──

const LIMITATION_PERIODS: LimitationPeriod[] = [
  // ─── Suits Relating to Contracts ─────────────────────────────────
  {
    id: "art-55",
    article: "55",
    description: "Suit for compensation for breach of any contract, express or implied, not herein specifically provided for",
    period_days: 3 * 365,
    period_label: "3 years",
    act: "Limitation Act, 1963",
    section: null,
    category: "suits_relating_to_contracts",
    condonable: true,
    condonation_section: "S.5",
    notes: "From the date when the contract is broken, or (where there are successive breaches) from the date of the last breach",
  },
  {
    id: "art-56",
    article: "56",
    description: "Suit for compensation for breach of contract for sale of immovable property",
    period_days: 3 * 365,
    period_label: "3 years",
    act: "Limitation Act, 1963",
    section: null,
    category: "suits_relating_to_contracts",
    condonable: true,
    condonation_section: "S.5",
    notes: "From the date fixed for the performance, or, if no such date is fixed, when the plaintiff has notice of the refusal",
  },
  {
    id: "art-57",
    article: "57",
    description: "Suit for specific performance of a contract",
    period_days: 3 * 365,
    period_label: "3 years",
    act: "Limitation Act, 1963",
    section: null,
    category: "suits_relating_to_contracts",
    condonable: true,
    condonation_section: "S.5",
    notes: "From the date fixed for the performance, or, if no such date is fixed, when the plaintiff has notice that performance is refused",
  },
  {
    id: "art-58",
    article: "58",
    description: "Suit on a promissory note or bond payable at a fixed time after date",
    period_days: 3 * 365,
    period_label: "3 years",
    act: "Limitation Act, 1963",
    section: null,
    category: "suits_relating_to_contracts",
    condonable: true,
    condonation_section: "S.5",
    notes: "When the fixed period expires",
  },
  {
    id: "art-59",
    article: "59",
    description: "Suit on a promissory note or bond payable at sight or on demand",
    period_days: 3 * 365,
    period_label: "3 years",
    act: "Limitation Act, 1963",
    section: null,
    category: "suits_relating_to_contracts",
    condonable: true,
    condonation_section: "S.5",
    notes: "When the note or bond is made",
  },
  {
    id: "art-62",
    article: "62",
    description: "Suit for money payable for money lent",
    period_days: 3 * 365,
    period_label: "3 years",
    act: "Limitation Act, 1963",
    section: null,
    category: "suits_relating_to_contracts",
    condonable: true,
    condonation_section: "S.5",
    notes: "When the loan is made",
  },
  {
    id: "art-63",
    article: "63",
    description: "Suit for price of goods sold and delivered where no fixed period of credit is agreed upon",
    period_days: 3 * 365,
    period_label: "3 years",
    act: "Limitation Act, 1963",
    section: null,
    category: "suits_relating_to_contracts",
    condonable: true,
    condonation_section: "S.5",
    notes: "When the goods are delivered",
  },
  {
    id: "art-67",
    article: "67",
    description: "Suit for compensation for inducing a person to break a contract with the plaintiff",
    period_days: 1 * 365,
    period_label: "1 year",
    act: "Limitation Act, 1963",
    section: null,
    category: "suits_relating_to_contracts",
    condonable: true,
    condonation_section: "S.5",
    notes: "When the contract is broken",
  },

  // ─── Suits Relating to Declarations ──────────────────────────────
  {
    id: "art-56-dec",
    article: "56 (Declaratory)",
    description: "Suit for a declaration and consequential relief",
    period_days: 3 * 365,
    period_label: "3 years",
    act: "Limitation Act, 1963",
    section: null,
    category: "suits_relating_to_declarations",
    condonable: true,
    condonation_section: "S.5",
    notes: "When the right to sue first accrues",
  },

  // ─── Suits Relating to Immovable Property ───────────────────────
  {
    id: "art-64",
    article: "64",
    description: "Suit for possession of immovable property based on title",
    period_days: 12 * 365,
    period_label: "12 years",
    act: "Limitation Act, 1963",
    section: null,
    category: "suits_relating_to_immovable_property",
    condonable: false,
    condonation_section: null,
    notes: "When the possession of the defendant becomes adverse to the plaintiff",
  },
  {
    id: "art-65",
    article: "65",
    description: "Suit for possession of immovable property or any interest therein based on title (Government)",
    period_days: 30 * 365,
    period_label: "30 years",
    act: "Limitation Act, 1963",
    section: null,
    category: "suits_relating_to_immovable_property",
    condonable: false,
    condonation_section: null,
    notes: "Government suits — 30 years from when possession becomes adverse",
  },
  {
    id: "art-66",
    article: "66",
    description: "Suit for possession of immovable property when the plaintiff has been dispossessed",
    period_days: 12 * 365,
    period_label: "12 years",
    act: "Limitation Act, 1963",
    section: null,
    category: "suits_relating_to_immovable_property",
    condonable: false,
    condonation_section: null,
    notes: "When the plaintiff is dispossessed",
  },
  {
    id: "art-109",
    article: "109",
    description: "Suit by mortgagor for redemption of mortgaged property",
    period_days: 30 * 365,
    period_label: "30 years",
    act: "Limitation Act, 1963",
    section: null,
    category: "suits_relating_to_immovable_property",
    condonable: false,
    condonation_section: null,
    notes: "When the right to redeem accrues",
  },
  {
    id: "art-110",
    article: "110",
    description: "Suit by mortgagee for foreclosure",
    period_days: 30 * 365,
    period_label: "30 years",
    act: "Limitation Act, 1963",
    section: null,
    category: "suits_relating_to_immovable_property",
    condonable: false,
    condonation_section: null,
    notes: "When the money secured by the mortgage becomes due",
  },

  // ─── Suits Relating to Movable Property ──────────────────────────
  {
    id: "art-68",
    article: "68",
    description: "Suit for specific movable property, or for compensation for wrongfully taking or detaining the same",
    period_days: 3 * 365,
    period_label: "3 years",
    act: "Limitation Act, 1963",
    section: null,
    category: "suits_relating_to_movable_property",
    condonable: true,
    condonation_section: "S.5",
    notes: "When the property is wrongfully taken or when the detainer's possession becomes unlawful",
  },

  // ─── Suits Relating to Torts ─────────────────────────────────────
  {
    id: "art-72",
    article: "72",
    description: "Suit for compensation for false imprisonment",
    period_days: 1 * 365,
    period_label: "1 year",
    act: "Limitation Act, 1963",
    section: null,
    category: "suits_relating_to_torts",
    condonable: true,
    condonation_section: "S.5",
    notes: "When the imprisonment ends",
  },
  {
    id: "art-73",
    article: "73",
    description: "Suit for compensation for malicious prosecution",
    period_days: 1 * 365,
    period_label: "1 year",
    act: "Limitation Act, 1963",
    section: null,
    category: "suits_relating_to_torts",
    condonable: true,
    condonation_section: "S.5",
    notes: "When the plaintiff is acquitted or the prosecution is otherwise terminated",
  },
  {
    id: "art-74",
    article: "74",
    description: "Suit for compensation for defamation (libel or slander)",
    period_days: 1 * 365,
    period_label: "1 year",
    act: "Limitation Act, 1963",
    section: null,
    category: "suits_relating_to_torts",
    condonable: true,
    condonation_section: "S.5",
    notes: "When the defamatory matter is published",
  },
  {
    id: "art-76",
    article: "76",
    description: "Suit for compensation for injury to person (negligence/accident)",
    period_days: 1 * 365,
    period_label: "1 year",
    act: "Limitation Act, 1963",
    section: null,
    category: "suits_relating_to_torts",
    condonable: true,
    condonation_section: "S.5",
    notes: "When the injury is caused / accident occurs",
  },

  // ─── Appeals ─────────────────────────────────────────────────────
  {
    id: "art-116",
    article: "116",
    description: "Appeal from a decree or order of any civil court (to High Court)",
    period_days: 90,
    period_label: "90 days",
    act: "Limitation Act, 1963",
    section: null,
    category: "appeals",
    condonable: true,
    condonation_section: "S.5",
    notes: "From the date of the decree or order appealed from",
  },
  {
    id: "art-117",
    article: "117",
    description: "Appeal to High Court from a decree or order of a subordinate court",
    period_days: 90,
    period_label: "90 days",
    act: "Limitation Act, 1963",
    section: null,
    category: "appeals",
    condonable: true,
    condonation_section: "S.5",
    notes: "From the date of the decree or order appealed from",
  },
  {
    id: "art-114",
    article: "114",
    description: "Appeal to the Supreme Court from any decree or final order",
    period_days: 90,
    period_label: "90 days",
    act: "Limitation Act, 1963",
    section: null,
    category: "appeals",
    condonable: true,
    condonation_section: "S.5",
    notes: "From the date of the decree or order sought to be appealed from",
  },
  {
    id: "art-115",
    article: "115",
    description: "Appeal from an order of a subordinate court to a district court",
    period_days: 30,
    period_label: "30 days",
    act: "Limitation Act, 1963",
    section: null,
    category: "appeals",
    condonable: true,
    condonation_section: "S.5",
    notes: "From the date of the order appealed from",
  },

  // ─── Applications ────────────────────────────────────────────────
  {
    id: "art-137",
    article: "137",
    description: "Any other application for which no period of limitation is provided (residuary)",
    period_days: 3 * 365,
    period_label: "3 years",
    act: "Limitation Act, 1963",
    section: null,
    category: "applications",
    condonable: true,
    condonation_section: "S.5",
    notes: "The residuary article; from when the right to apply accrues",
  },
  {
    id: "art-136",
    article: "136",
    description: "Application for execution of any decree (other than order or award) of any civil court",
    period_days: 12 * 365,
    period_label: "12 years",
    act: "Limitation Act, 1963",
    section: null,
    category: "applications",
    condonable: false,
    condonation_section: null,
    notes: "When the decree becomes enforceable or where the decree or any subsequent order directs any payment of money or the delivery of any property to be made at a certain date or at recurring periods, when default in making the payment or delivery in respect of which the execution is sought, is first made",
  },
  {
    id: "art-127",
    article: "127",
    description: "Application for review of judgement by a court other than Supreme Court",
    period_days: 30,
    period_label: "30 days",
    act: "Limitation Act, 1963",
    section: null,
    category: "applications",
    condonable: true,
    condonation_section: "S.5",
    notes: "From the date of the decree or order sought to be reviewed",
  },
  {
    id: "art-124",
    article: "124",
    description: "Application to set aside a decree passed ex parte",
    period_days: 30,
    period_label: "30 days",
    act: "Limitation Act, 1963",
    section: null,
    category: "applications",
    condonable: true,
    condonation_section: "S.5",
    notes: "From the date of the decree (or where summons / notice was not duly served, when the applicant had knowledge of the decree)",
  },

  // ─── Criminal (Special Statutes) ─────────────────────────────────
  {
    id: "s138-ni",
    article: "S.138 NI Act",
    description: "Complaint for dishonour of cheque under Section 138 of the Negotiable Instruments Act, 1881",
    period_days: 30,
    period_label: "30 days",
    act: "Negotiable Instruments Act, 1881",
    section: "S.142(b)",
    category: "criminal",
    condonable: false,
    condonation_section: null,
    notes: "STRICT: 30 days from the date of cause of action (expiry of 15-day notice period after receipt of notice by drawer). NO condonation allowed per S.142(b) NI Act. The cause of action arises on the date of failure to pay within 15 days of receipt of the demand notice. The complaint must be filed within 30 days of expiry of the 15-day notice period.",
  },
  {
    id: "s468-bnss",
    article: "S.468 BNSS",
    description: "Complaint for offence punishable with fine only",
    period_days: 6 * 30,
    period_label: "6 months",
    act: "Bharatiya Nagarik Suraksha Sanhita, 2023",
    section: "S.468(2)(a)",
    category: "criminal",
    condonable: true,
    condonation_section: "S.473 BNSS",
    notes: "From the date of the offence. Court may condone delay under S.473 BNSS if it is satisfied that delay has been properly explained or necessary in interest of justice.",
  },
  {
    id: "s468-1yr-bnss",
    article: "S.468 BNSS (1 year)",
    description: "Complaint for offence punishable with imprisonment up to 1 year",
    period_days: 1 * 365,
    period_label: "1 year",
    act: "Bharatiya Nagarik Suraksha Sanhita, 2023",
    section: "S.468(2)(b)",
    category: "criminal",
    condonable: true,
    condonation_section: "S.473 BNSS",
    notes: "From the date of the offence",
  },
  {
    id: "s468-3yr-bnss",
    article: "S.468 BNSS (3 years)",
    description: "Complaint for offence punishable with imprisonment between 1 and 3 years",
    period_days: 3 * 365,
    period_label: "3 years",
    act: "Bharatiya Nagarik Suraksha Sanhita, 2023",
    section: "S.468(2)(c)",
    category: "criminal",
    condonable: true,
    condonation_section: "S.473 BNSS",
    notes: "From the date of the offence",
  },

  // ─── Special Statutes ────────────────────────────────────────────
  {
    id: "mact",
    article: "MACT Claim",
    description: "Motor accident compensation claim under Motor Vehicles Act, 1988",
    period_days: 6 * 30,
    period_label: "6 months",
    act: "Motor Vehicles Act, 1988",
    section: "S.166(3)",
    category: "special_statutes",
    condonable: true,
    condonation_section: "S.166(3) proviso",
    notes: "From the date of the accident. Tribunal may entertain application after 6 months if sufficient cause is shown for delay.",
  },
  {
    id: "consumer-2yr",
    article: "Consumer Complaint (2 years)",
    description: "Complaint before Consumer Disputes Redressal Forum/Commission",
    period_days: 2 * 365,
    period_label: "2 years",
    act: "Consumer Protection Act, 2019",
    section: "S.69(1)",
    category: "special_statutes",
    condonable: true,
    condonation_section: "S.69(2)",
    notes: "From the date on which the cause of action has arisen. Commission may condone delay if sufficient cause shown.",
  },
  {
    id: "rti-appeal",
    article: "RTI First Appeal",
    description: "First appeal against order of Central/State Public Information Officer",
    period_days: 30,
    period_label: "30 days",
    act: "Right to Information Act, 2005",
    section: "S.19(1)",
    category: "special_statutes",
    condonable: true,
    condonation_section: "S.19(1) proviso",
    notes: "From the date of expiry of prescribed period / receipt of decision. May be condoned if sufficient cause shown.",
  },
  {
    id: "rti-second-appeal",
    article: "RTI Second Appeal",
    description: "Second appeal before Central/State Information Commission",
    period_days: 90,
    period_label: "90 days",
    act: "Right to Information Act, 2005",
    section: "S.19(3)",
    category: "special_statutes",
    condonable: true,
    condonation_section: "S.19(3) proviso",
    notes: "From the date of order of first appellate authority. May be condoned if sufficient cause shown.",
  },
  {
    id: "labour-id",
    article: "Industrial Dispute Reference",
    description: "Raising of industrial dispute / Application before Labour Court or Tribunal",
    period_days: 3 * 365,
    period_label: "3 years",
    act: "Industrial Disputes Act, 1947",
    section: "S.2-A",
    category: "special_statutes",
    condonable: true,
    condonation_section: "S.2-A proviso",
    notes: "Individual worker may apply within 3 years of discharge/dismissal/retrenchment/termination.",
  },
  {
    id: "lt-eviction",
    article: "Land Tribunal / Eviction suit",
    description: "Suit for eviction of tenant from immovable property",
    period_days: 3 * 365,
    period_label: "3 years",
    act: "Limitation Act, 1963",
    section: null,
    category: "suits_relating_to_immovable_property",
    condonable: true,
    condonation_section: "S.5",
    notes: "From when the tenancy is determined. Subject to state-specific Rent Control Acts.",
  },
  {
    id: "writ-hc",
    article: "Writ Petition (HC)",
    description: "Writ petition before High Court under Article 226",
    period_days: 0,
    period_label: "No fixed period",
    act: "Constitution of India",
    section: "Art. 226",
    category: "applications",
    condonable: false,
    condonation_section: null,
    notes: "No fixed limitation period, but unreasonable delay may lead to dismissal on ground of laches. Generally, the High Courts expect filing within a reasonable time.",
  },
  {
    id: "writ-sc",
    article: "Writ Petition (SC)",
    description: "Writ petition before Supreme Court under Article 32",
    period_days: 0,
    period_label: "No fixed period",
    act: "Constitution of India",
    section: "Art. 32",
    category: "applications",
    condonable: false,
    condonation_section: null,
    notes: "Fundamental right — no limitation period, but courts may consider unexplained delay.",
  },
];

// ─── Category Labels ───────────────────────────────────────────────

const CATEGORY_LABELS: Record<LimitationCategory, string> = {
  suits_relating_to_contracts: "Suits Relating to Contracts",
  suits_relating_to_declarations: "Suits Relating to Declarations",
  suits_relating_to_decrees_and_instruments: "Suits Relating to Decrees & Instruments",
  suits_relating_to_movable_property: "Suits Relating to Movable Property",
  suits_relating_to_immovable_property: "Suits Relating to Immovable Property",
  suits_relating_to_torts: "Suits Relating to Torts",
  appeals: "Appeals",
  applications: "Applications",
  criminal: "Criminal Matters",
  special_statutes: "Special Statutes",
};

// ─── Service ───────────────────────────────────────────────────────

export class LimitationService {
  /**
   * Get all limitation periods, optionally filtered by category.
   */
  getPeriods(category?: LimitationCategory): LimitationPeriod[] {
    if (category) {
      return LIMITATION_PERIODS.filter((p) => p.category === category);
    }
    return LIMITATION_PERIODS;
  }

  /**
   * Get a single period by ID.
   */
  getPeriodById(id: string): LimitationPeriod | undefined {
    return LIMITATION_PERIODS.find((p) => p.id === id);
  }

  /**
   * Get category labels.
   */
  getCategories(): Array<{ id: LimitationCategory; label: string }> {
    return Object.entries(CATEGORY_LABELS).map(([id, label]) => ({
      id: id as LimitationCategory,
      label,
    }));
  }

  /**
   * Calculate the deadline given a cause date and limitation period,
   * with optional exclusions under Sections 12, 14, and 15.
   */
  calculateDeadline(input: CalculateLimitationInput): LimitationCalculation {
    const period = this.getPeriodById(input.period_id);
    if (!period) {
      throw new Error(`Unknown limitation period: ${input.period_id}`);
    }

    const causeDate = parseLocalDate(input.cause_date);
    if (isNaN(causeDate.getTime())) {
      throw new Error("Invalid cause date");
    }

    const warnings: string[] = [];
    const today = parseLocalDate(formatLocalDate(new Date()));

    // For writ petitions with no fixed period
    if (period.period_days === 0) {
      const daysSinceCause = daysBetween(causeDate, today);

      if (daysSinceCause > 180) {
        warnings.push(
          "More than 6 months have passed. Courts may question delay — prepare a satisfactory explanation."
        );
      }

      return {
        cause_date: input.cause_date,
        limitation_period: period,
        raw_deadline: "N/A — No fixed limitation",
        exclusions_applied: input.exclusions ?? {},
        total_excluded_days: 0,
        final_deadline: "N/A — No fixed limitation",
        days_remaining: -1,
        is_expired: false,
        is_condonable: false,
        condonation_note: period.notes,
        warnings,
      };
    }

    // Calculate raw deadline using calendar-based addition (handles leap years, variable months)
    const rawDeadline = addPeriodToDate(causeDate, period.period_days, period.period_label);

    // Apply exclusions
    const exclusions = input.exclusions ?? {};
    let totalExcludedDays = 0;

    if (exclusions.section_12) {
      totalExcludedDays += exclusions.section_12.days;
      if (period.id === "s138-ni") {
        warnings.push(
          "S.12 exclusion may not apply to S.138 NI Act complaints. Consult case law carefully."
        );
      }
    }

    if (exclusions.section_14) {
      totalExcludedDays += exclusions.section_14.days;
      warnings.push(
        "S.14 exclusion: Ensure the prior proceeding was prosecuted in good faith and with due diligence."
      );
    }

    if (exclusions.section_15) {
      totalExcludedDays += exclusions.section_15.days;
    }

    // Final deadline (exclusions are always in days)
    const finalDeadline = new Date(rawDeadline);
    finalDeadline.setDate(finalDeadline.getDate() + totalExcludedDays);

    const daysRemaining = daysBetween(today, finalDeadline);
    const isExpired = daysRemaining < 0;

    // Warnings
    if (isExpired && !period.condonable) {
      warnings.push(
        `CRITICAL: Limitation has expired and condonation is NOT available for ${period.article}.`
      );
    } else if (isExpired && period.condonable) {
      warnings.push(
        `Limitation has expired. File an application for condonation of delay under ${period.condonation_section} with sufficient cause.`
      );
    } else if (daysRemaining <= 7) {
      warnings.push("URGENT: Less than 7 days remaining. Prioritize immediate filing.");
    } else if (daysRemaining <= 30) {
      warnings.push("Deadline approaching within 30 days. Begin preparation immediately.");
    }

    // S.138 NI Act specific warnings
    if (period.id === "s138-ni") {
      warnings.push(
        "S.138 NI Act: NO condonation of delay is permitted. The 30-day period is STRICT and begins from the date the 15-day statutory notice period expires."
      );
    }

    let condonationNote: string | null = null;
    if (period.condonable) {
      condonationNote = `Delay may be condoned under ${period.condonation_section} if sufficient cause is shown. The applicant must demonstrate that they were prevented by sufficient cause from filing within the prescribed period.`;
    } else if (period.id === "s138-ni") {
      condonationNote =
        "NO condonation of delay is permitted for S.138 NI Act complaints as per S.142(b). This is a settled legal position confirmed by the Supreme Court.";
    }

    return {
      cause_date: input.cause_date,
      limitation_period: period,
      raw_deadline: formatLocalDate(rawDeadline),
      exclusions_applied: exclusions,
      total_excluded_days: totalExcludedDays,
      final_deadline: formatLocalDate(finalDeadline),
      days_remaining: daysRemaining,
      is_expired: isExpired,
      is_condonable: this.isCondonable(period.id),
      condonation_note: condonationNote,
      warnings,
    };
  }

  /**
   * Apply exclusions under Sections 12, 14, and 15 of the Limitation Act, 1963.
   *
   * S.12 — Exclude time required for obtaining certified copies of decree/order.
   * S.14 — Exclude time spent prosecuting in good faith in a court without jurisdiction.
   * S.15 — Exclude time during which proceedings were stayed by injunction or order.
   */
  applyExclusions(
    baseDays: number,
    exclusions: ExclusionInput
  ): { totalDays: number; excluded: number; breakdown: string[] } {
    let excluded = 0;
    const breakdown: string[] = [];

    if (exclusions.section_12) {
      excluded += exclusions.section_12.days;
      breakdown.push(
        `S.12: ${exclusions.section_12.days} days excluded (${exclusions.section_12.reason})`
      );
    }

    if (exclusions.section_14) {
      excluded += exclusions.section_14.days;
      breakdown.push(
        `S.14: ${exclusions.section_14.days} days excluded (${exclusions.section_14.reason})`
      );
    }

    if (exclusions.section_15) {
      excluded += exclusions.section_15.days;
      breakdown.push(
        `S.15: ${exclusions.section_15.days} days excluded (${exclusions.section_15.reason})`
      );
    }

    return {
      totalDays: baseDays + excluded,
      excluded,
      breakdown,
    };
  }

  /**
   * Check whether delay can be condoned for a given limitation period.
   */
  isCondonable(periodId: string): boolean {
    const period = this.getPeriodById(periodId);
    if (!period) return false;
    return period.condonable;
  }

  /**
   * Get suggested limitation periods based on case type and description.
   */
  getSuggestions(input: LimitationSuggestInput): LimitationSuggestion[] {
    const { case_type, description } = input;
    const query = `${case_type} ${description ?? ""}`.toLowerCase();

    const suggestions: LimitationSuggestion[] = [];

    for (const period of LIMITATION_PERIODS) {
      let score = 0;
      let relevance = "";

      // Exact matches on common case types
      if (query.includes("cheque") || query.includes("dishonour") || query.includes("138") || query.includes("bounced")) {
        if (period.id === "s138-ni") {
          score = 100;
          relevance = "Direct match: Cheque dishonour / S.138 NI Act";
        }
      }

      if (query.includes("motor") || query.includes("accident") || query.includes("mact")) {
        if (period.id === "mact") {
          score = 100;
          relevance = "Direct match: Motor accident claim";
        }
      }

      if (query.includes("consumer") || query.includes("deficiency") || query.includes("service")) {
        if (period.id === "consumer-2yr") {
          score = 100;
          relevance = "Direct match: Consumer complaint";
        }
      }

      if (query.includes("breach") && query.includes("contract")) {
        if (period.id === "art-55") {
          score = 90;
          relevance = "Strong match: Breach of contract";
        }
      }

      if (query.includes("specific performance")) {
        if (period.id === "art-57") {
          score = 95;
          relevance = "Direct match: Specific performance of contract";
        }
      }

      if (query.includes("property") || query.includes("possession") || query.includes("land") || query.includes("title")) {
        if (period.category === "suits_relating_to_immovable_property") {
          score = Math.max(score, 70);
          relevance = relevance || "Related: Immovable property dispute";
        }
      }

      if (query.includes("appeal") || query.includes("revision")) {
        if (period.category === "appeals") {
          score = Math.max(score, 75);
          relevance = relevance || "Related: Appeal/revision matter";
        }
      }

      if (query.includes("defamation") || query.includes("libel") || query.includes("slander")) {
        if (period.id === "art-74") {
          score = 95;
          relevance = "Direct match: Defamation suit";
        }
      }

      if (query.includes("negligence") || query.includes("injury") || query.includes("tort")) {
        if (period.id === "art-76") {
          score = 85;
          relevance = "Strong match: Personal injury / negligence";
        }
      }

      if (query.includes("promissory") || query.includes("bond") || query.includes("note")) {
        if (period.id === "art-58" || period.id === "art-59") {
          score = Math.max(score, 85);
          relevance = relevance || "Strong match: Promissory note / bond";
        }
      }

      if (query.includes("money") || query.includes("loan") || query.includes("recovery") || query.includes("debt")) {
        if (period.id === "art-62") {
          score = Math.max(score, 80);
          relevance = relevance || "Related: Money recovery / loan";
        }
      }

      if (query.includes("writ") || query.includes("fundamental right") || query.includes("habeas") || query.includes("mandamus")) {
        if (period.id === "writ-hc" || period.id === "writ-sc") {
          score = Math.max(score, 90);
          relevance = relevance || "Direct match: Writ petition";
        }
      }

      if (query.includes("execution") || query.includes("decree")) {
        if (period.id === "art-136") {
          score = Math.max(score, 80);
          relevance = relevance || "Related: Execution of decree";
        }
      }

      if (query.includes("review")) {
        if (period.id === "art-127") {
          score = Math.max(score, 85);
          relevance = relevance || "Direct match: Review of judgement";
        }
      }

      if (query.includes("ex parte") || query.includes("ex-parte")) {
        if (period.id === "art-124") {
          score = Math.max(score, 90);
          relevance = relevance || "Direct match: Setting aside ex parte decree";
        }
      }

      if (query.includes("rti") || query.includes("information")) {
        if (period.id === "rti-appeal" || period.id === "rti-second-appeal") {
          score = Math.max(score, 85);
          relevance = relevance || "Related: RTI appeal";
        }
      }

      if (query.includes("labour") || query.includes("industrial") || query.includes("termination") || query.includes("dismissal")) {
        if (period.id === "labour-id") {
          score = Math.max(score, 85);
          relevance = relevance || "Related: Industrial / labour dispute";
        }
      }

      if (query.includes("eviction") || query.includes("tenant") || query.includes("rent")) {
        if (period.id === "lt-eviction") {
          score = Math.max(score, 80);
          relevance = relevance || "Related: Eviction / tenancy";
        }
      }

      if (query.includes("mortgage") || query.includes("redemption") || query.includes("foreclosure")) {
        if (period.id === "art-109" || period.id === "art-110") {
          score = Math.max(score, 85);
          relevance = relevance || "Related: Mortgage matter";
        }
      }

      if (score > 0) {
        suggestions.push({ period, relevance });
      }
    }

    // Sort by relevance text (direct > strong > related)
    suggestions.sort((a, b) => {
      const priority = (r: string) => {
        if (r.startsWith("Direct")) return 3;
        if (r.startsWith("Strong")) return 2;
        return 1;
      };
      return priority(b.relevance) - priority(a.relevance);
    });

    return suggestions.slice(0, 5);
  }
}

export const limitationService = new LimitationService();
