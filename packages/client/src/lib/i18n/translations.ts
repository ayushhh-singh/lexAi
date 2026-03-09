import type { AppLanguage } from "@nyay/shared";

/**
 * Flat translation keys → { en, hi } map.
 * Convention: dot-separated namespace (nav., dashboard., chat., etc.)
 */
const translations = {
  // ─── Navigation / Sidebar ────────────────────────────────────────
  "nav.dashboard": { en: "Dashboard", hi: "डैशबोर्ड" },
  "nav.chat": { en: "Chat", hi: "चैट" },
  "nav.research": { en: "Research", hi: "शोध" },
  "nav.drafts": { en: "Drafts", hi: "प्रारूप" },
  "nav.cases": { en: "Cases", hi: "मामले" },
  "nav.documents": { en: "Documents", hi: "दस्तावेज़" },
  "nav.settings": { en: "Settings", hi: "सेटिंग्स" },
  "nav.collapse": { en: "Collapse", hi: "छोटा करें" },
  "nav.more": { en: "More", hi: "और" },

  // ─── Header ──────────────────────────────────────────────────────
  "header.search": { en: "Search...", hi: "खोजें..." },
  "header.searchPlaceholder": { en: "Search cases, documents, chats...", hi: "मामले, दस्तावेज़, चैट खोजें..." },
  "header.startTyping": { en: "Start typing to search", hi: "खोजने के लिए टाइप करें" },
  "header.credits": { en: "credits", hi: "क्रेडिट" },
  "header.profile": { en: "Profile", hi: "प्रोफ़ाइल" },
  "header.settings": { en: "Settings", hi: "सेटिंग्स" },
  "header.signOut": { en: "Sign out", hi: "साइन आउट" },

  // ─── Dashboard ───────────────────────────────────────────────────
  "dashboard.welcome": { en: "Welcome back, {name}", hi: "स्वागत है, {name}" },
  "dashboard.subtitle": { en: "Here's what's happening with your practice today.", hi: "आज आपके अभ्यास में क्या हो रहा है।" },
  "dashboard.gettingStarted": { en: "Getting Started", hi: "शुरू करें" },
  "dashboard.completedOf": { en: "{done} of {total} completed", hi: "{done} में से {total} पूर्ण" },
  "dashboard.start": { en: "Start", hi: "शुरू करें" },

  // Dashboard checklist
  "dashboard.step.profile.label": { en: "Complete your profile", hi: "अपनी प्रोफ़ाइल पूरी करें" },
  "dashboard.step.profile.desc": { en: "Add bar council ID and practice areas", hi: "बार काउंसिल आईडी और अभ्यास क्षेत्र जोड़ें" },
  "dashboard.step.case.label": { en: "Create your first case", hi: "अपना पहला मामला बनाएँ" },
  "dashboard.step.case.desc": { en: "Organize matters by case for better AI context", hi: "बेहतर AI संदर्भ के लिए मामले के अनुसार व्यवस्थित करें" },
  "dashboard.step.chat.label": { en: "Start an AI conversation", hi: "AI वार्तालाप शुरू करें" },
  "dashboard.step.chat.desc": { en: "Ask a legal question or analyze a document", hi: "कानूनी प्रश्न पूछें या दस्तावेज़ का विश्लेषण करें" },
  "dashboard.step.draft.label": { en: "Draft a legal document", hi: "कानूनी दस्तावेज़ का प्रारूप तैयार करें" },
  "dashboard.step.draft.desc": { en: "Generate petitions, notices, or contracts", hi: "याचिकाएँ, नोटिस, या अनुबंध तैयार करें" },

  // Dashboard quick actions
  "dashboard.action.research": { en: "Research", hi: "शोध" },
  "dashboard.action.research.desc": { en: "Search case law & statutes", hi: "केस लॉ और विधियाँ खोजें" },
  "dashboard.action.draft": { en: "Draft", hi: "प्रारूप" },
  "dashboard.action.draft.desc": { en: "Generate legal documents", hi: "कानूनी दस्तावेज़ तैयार करें" },
  "dashboard.action.chat": { en: "Chat", hi: "चैट" },
  "dashboard.action.chat.desc": { en: "AI legal assistant", hi: "AI कानूनी सहायक" },
  "dashboard.action.cases": { en: "Cases", hi: "मामले" },
  "dashboard.action.cases.desc": { en: "Manage your matters", hi: "अपने मामलों का प्रबंधन करें" },
  "dashboard.getStarted": { en: "Get started", hi: "शुरू करें" },

  // Dashboard sections
  "dashboard.recentConversations": { en: "Recent Conversations", hi: "हाल की वार्तालाप" },
  "dashboard.upcomingDeadlines": { en: "Upcoming Deadlines", hi: "आगामी समय सीमाएँ" },
  "dashboard.viewAll": { en: "View all", hi: "सभी देखें" },

  // Dashboard stats
  "dashboard.stat.activeCases": { en: "Active Cases", hi: "सक्रिय मामले" },
  "dashboard.stat.aiCredits": { en: "AI Credits", hi: "AI क्रेडिट" },
  "dashboard.stat.winRate": { en: "Win Rate", hi: "जीत दर" },
  "dashboard.stat.documents": { en: "Documents", hi: "दस्तावेज़" },

  // ─── Chat ────────────────────────────────────────────────────────
  "chat.newConversation": { en: "New Conversation", hi: "नई वार्तालाप" },
  "chat.placeholder": { en: "Ask a legal question...", hi: "कानूनी प्रश्न पूछें..." },
  "chat.send": { en: "Send", hi: "भेजें" },
  "chat.thinking": { en: "Thinking...", hi: "सोच रहा है..." },
  "chat.emptyTitle": { en: "How can I help you today?", hi: "आज मैं आपकी कैसे सहायता कर सकता हूँ?" },
  "chat.emptySubtitle": { en: "Ask me anything about Indian law — statutes, case law, procedures, or draft a document.", hi: "भारतीय कानून के बारे में कुछ भी पूछें — विधियाँ, केस लॉ, प्रक्रियाएँ, या दस्तावेज़ का प्रारूप तैयार करें।" },
  "chat.suggestedPrompts.bail": { en: "Draft a bail application under BNS Section 480", hi: "BNS धारा 480 के तहत जमानत आवेदन का प्रारूप" },
  "chat.suggestedPrompts.limitation": { en: "What is the limitation period for a money suit?", hi: "धन वसूली वाद के लिए परिसीमा अवधि क्या है?" },
  "chat.suggestedPrompts.article21": { en: "Explain Article 21 and recent SC judgements", hi: "अनुच्छेद 21 और हालिया सर्वोच्च न्यायालय के निर्णय समझाएँ" },
  "chat.suggestedPrompts.fir": { en: "Procedure to quash an FIR under BNSS Section 528", hi: "BNSS धारा 528 के तहत FIR रद्द करने की प्रक्रिया" },
  "chat.deleteConfirm": { en: "Delete this conversation?", hi: "यह वार्तालाप हटाएँ?" },
  "chat.conversations": { en: "Conversations", hi: "वार्तालाप" },
  "chat.noConversations": { en: "No conversations yet", hi: "अभी तक कोई वार्तालाप नहीं" },

  // ─── Research ────────────────────────────────────────────────────
  "research.title": { en: "Legal Research", hi: "कानूनी शोध" },
  "research.searchPlaceholder": { en: "Search case law, statutes, and commentaries...", hi: "केस लॉ, विधियाँ, और टीकाएँ खोजें..." },
  "research.search": { en: "Search", hi: "खोजें" },
  "research.filters": { en: "Filters", hi: "फ़िल्टर" },
  "research.results": { en: "Results", hi: "परिणाम" },
  "research.noResults": { en: "No results found", hi: "कोई परिणाम नहीं मिला" },
  "research.caseLaw": { en: "Case Law", hi: "केस लॉ" },
  "research.statutes": { en: "Statutes", hi: "विधियाँ" },
  "research.commentary": { en: "Commentary", hi: "टीका" },
  "research.verified": { en: "Verified", hi: "सत्यापित" },
  "research.unverified": { en: "Unverified", hi: "असत्यापित" },
  "research.browseActs": { en: "Browse Acts", hi: "अधिनियम ब्राउज़ करें" },

  // ─── Document Analysis ─────────────────────────────────────────
  "documents.title": { en: "Documents", hi: "दस्तावेज़" },
  "documents.analyze": { en: "Analyze Document", hi: "दस्तावेज़ का विश्लेषण करें" },
  "documents.upload": { en: "Upload Document", hi: "दस्तावेज़ अपलोड करें" },
  "documents.analyzing": { en: "Analyzing document...", hi: "दस्तावेज़ का विश्लेषण हो रहा है..." },
  "documents.summary": { en: "Executive Summary", hi: "कार्यकारी सारांश" },
  "documents.keyIssues": { en: "Key Issues", hi: "प्रमुख मुद्दे" },
  "documents.statutes": { en: "Relevant Statutes", hi: "संबंधित विधियाँ" },
  "documents.risks": { en: "Risk Assessment", hi: "जोखिम मूल्यांकन" },
  "documents.nextSteps": { en: "Next Steps", hi: "अगले कदम" },
  "documents.askFollowUp": { en: "Ask Follow-up", hi: "अनुवर्ती प्रश्न पूछें" },
  "documents.draftResponse": { en: "Draft Response", hi: "प्रतिक्रिया प्रारूप" },
  "documents.generateReport": { en: "Generate Report (PDF)", hi: "रिपोर्ट तैयार करें (PDF)" },
  "documents.noDocuments": { en: "No documents yet", hi: "अभी तक कोई दस्तावेज़ नहीं" },
  "documents.searchPlaceholder": { en: "Search documents...", hi: "दस्तावेज़ खोजें..." },

  // ─── Drafts / Documents ──────────────────────────────────────────
  "drafts.title": { en: "Document Drafts", hi: "दस्तावेज़ प्रारूप" },
  "drafts.newDraft": { en: "New Draft", hi: "नया प्रारूप" },
  "drafts.generate": { en: "Generate", hi: "तैयार करें" },
  "drafts.download": { en: "Download", hi: "डाउनलोड" },
  "drafts.selectTemplate": { en: "Select Template", hi: "टेम्पलेट चुनें" },
  "drafts.selectCourt": { en: "Select Court", hi: "न्यायालय चुनें" },
  "drafts.noDrafts": { en: "No drafts yet", hi: "अभी तक कोई प्रारूप नहीं" },

  // Generation progress stages
  "drafts.progress.analyzing": { en: "Analyzing requirements...", hi: "आवश्यकताओं का विश्लेषण..." },
  "drafts.progress.researching": { en: "Researching legal context...", hi: "कानूनी संदर्भ की खोज..." },
  "drafts.progress.drafting": { en: "Drafting document...", hi: "दस्तावेज़ का प्रारूप तैयार हो रहा है..." },
  "drafts.progress.verifying": { en: "Verifying citations...", hi: "उद्धरणों का सत्यापन..." },
  "drafts.progress.formatting": { en: "Formatting document...", hi: "दस्तावेज़ स्वरूपित हो रहा है..." },

  // ─── Cases ───────────────────────────────────────────────────────
  "cases.title": { en: "Case Management", hi: "मामला प्रबंधन" },
  "cases.newCase": { en: "New Case", hi: "नया मामला" },
  "cases.noCases": { en: "No cases yet", hi: "अभी तक कोई मामला नहीं" },
  "cases.status": { en: "Status", hi: "स्थिति" },
  "cases.courtLevel": { en: "Court Level", hi: "न्यायालय स्तर" },
  "cases.practiceArea": { en: "Practice Area", hi: "अभ्यास क्षेत्र" },
  "cases.filingDate": { en: "Filing Date", hi: "दाखिल तिथि" },
  "cases.nextHearing": { en: "Next Hearing", hi: "अगली सुनवाई" },
  "cases.opposingParty": { en: "Opposing Party", hi: "विपक्षी पक्ष" },
  "cases.opposingCounsel": { en: "Opposing Counsel", hi: "विपक्षी वकील" },
  "cases.deadlines": { en: "Deadlines", hi: "समय सीमाएँ" },
  "cases.notes": { en: "Notes", hi: "नोट्स" },
  "cases.addNote": { en: "Add Note", hi: "नोट जोड़ें" },
  "cases.addDeadline": { en: "Add Deadline", hi: "समय सीमा जोड़ें" },
  "cases.summary": { en: "Generate Summary", hi: "सारांश तैयार करें" },

  // Case statuses
  "cases.status.draft": { en: "Draft", hi: "प्रारूप" },
  "cases.status.filed": { en: "Filed", hi: "दाखिल" },
  "cases.status.in_progress": { en: "In Progress", hi: "प्रगति में" },
  "cases.status.hearing_scheduled": { en: "Hearing Scheduled", hi: "सुनवाई निर्धारित" },
  "cases.status.judgement_reserved": { en: "Judgement Reserved", hi: "निर्णय सुरक्षित" },
  "cases.status.disposed": { en: "Disposed", hi: "निस्तारित" },
  "cases.status.appealed": { en: "Appealed", hi: "अपील की गई" },
  "cases.status.closed": { en: "Closed", hi: "बंद" },

  // ─── Limitation Calculator ───────────────────────────────────────
  "limitation.title": { en: "Limitation Calculator", hi: "परिसीमा कैलकुलेटर" },
  "limitation.causeOfAction": { en: "Date of cause of action", hi: "वाद हेतुक की तिथि" },
  "limitation.calculate": { en: "Calculate", hi: "गणना करें" },
  "limitation.expired": { en: "Limitation expired", hi: "परिसीमा समाप्त" },
  "limitation.remaining": { en: "days remaining", hi: "दिन शेष" },

  // ─── Auth ────────────────────────────────────────────────────────
  "auth.login": { en: "Sign in", hi: "साइन इन" },
  "auth.signup": { en: "Create account", hi: "खाता बनाएँ" },
  "auth.email": { en: "Email", hi: "ईमेल" },
  "auth.password": { en: "Password", hi: "पासवर्ड" },
  "auth.forgotPassword": { en: "Forgot password?", hi: "पासवर्ड भूल गए?" },
  "auth.noAccount": { en: "Don't have an account?", hi: "खाता नहीं है?" },
  "auth.hasAccount": { en: "Already have an account?", hi: "पहले से खाता है?" },
  "auth.fullName": { en: "Full Name", hi: "पूरा नाम" },
  "auth.phone": { en: "Phone Number", hi: "फ़ोन नंबर" },

  // ─── Common / Shared ────────────────────────────────────────────
  "common.save": { en: "Save", hi: "सहेजें" },
  "common.cancel": { en: "Cancel", hi: "रद्द करें" },
  "common.delete": { en: "Delete", hi: "हटाएँ" },
  "common.edit": { en: "Edit", hi: "संपादित करें" },
  "common.close": { en: "Close", hi: "बंद करें" },
  "common.back": { en: "Back", hi: "वापस" },
  "common.next": { en: "Next", hi: "अगला" },
  "common.loading": { en: "Loading...", hi: "लोड हो रहा है..." },
  "common.error": { en: "Something went wrong", hi: "कुछ गलत हो गया" },
  "common.retry": { en: "Retry", hi: "पुनः प्रयास करें" },
  "common.confirm": { en: "Confirm", hi: "पुष्टि करें" },
  "common.yes": { en: "Yes", hi: "हाँ" },
  "common.no": { en: "No", hi: "नहीं" },
  "common.or": { en: "or", hi: "या" },
  "common.and": { en: "and", hi: "और" },
  "common.noData": { en: "No data available", hi: "कोई डेटा उपलब्ध नहीं" },
  "common.viewMore": { en: "View more", hi: "और देखें" },
  "common.selectOption": { en: "Select an option", hi: "एक विकल्प चुनें" },

  // ─── Onboarding ──────────────────────────────────────────────────
  "onboarding.title": { en: "Let's set up your profile", hi: "आइए आपकी प्रोफ़ाइल सेट करें" },
  "onboarding.barCouncil": { en: "Bar Council Registration Number", hi: "बार काउंसिल पंजीकरण संख्या" },
  "onboarding.practiceAreas": { en: "Practice Areas", hi: "अभ्यास क्षेत्र" },
  "onboarding.defaultCourt": { en: "Default Court", hi: "डिफ़ॉल्ट न्यायालय" },
  "onboarding.experience": { en: "Years of Experience", hi: "अनुभव (वर्ष)" },
  "onboarding.city": { en: "City", hi: "शहर" },
  "onboarding.state": { en: "State", hi: "राज्य" },
  "onboarding.complete": { en: "Complete Setup", hi: "सेटअप पूरा करें" },

  // ─── Notifications ───────────────────────────────────────────────
  "notifications.title": { en: "Notifications", hi: "सूचनाएँ" },
  "notifications.markRead": { en: "Mark as read", hi: "पढ़ा हुआ चिन्हित करें" },
  "notifications.noNew": { en: "No new notifications", hi: "कोई नई सूचना नहीं" },
  "notifications.deadlineUpcoming": { en: "Deadline approaching", hi: "समय सीमा निकट" },
  "notifications.deadlineOverdue": { en: "Deadline overdue", hi: "समय सीमा बीत चुकी" },

  // ─── Errors ──────────────────────────────────────────────────────
  "error.unauthorized": { en: "Please sign in to continue", hi: "कृपया जारी रखने के लिए साइन इन करें" },
  "error.forbidden": { en: "You don't have permission", hi: "आपके पास अनुमति नहीं है" },
  "error.notFound": { en: "Page not found", hi: "पृष्ठ नहीं मिला" },
  "error.network": { en: "Network error. Please check your connection.", hi: "नेटवर्क त्रुटि। कृपया कनेक्शन जाँचें।" },
  "error.creditsExhausted": { en: "AI credits exhausted. Upgrade your plan.", hi: "AI क्रेडिट समाप्त। अपना प्लान अपग्रेड करें।" },

  // ─── Billing / Pricing ─────────────────────────────────────────
  "billing.title": { en: "Billing & Plans", hi: "बिलिंग और प्लान" },
  "billing.currentPlan": { en: "Current Plan", hi: "वर्तमान प्लान" },
  "billing.betaPlan": { en: "Beta Plan", hi: "बीटा प्लान" },
  "billing.betaPlanDesc": { en: "All features are free during beta. Your usage is being tracked.", hi: "बीटा के दौरान सभी सुविधाएँ मुफ्त हैं। आपका उपयोग ट्रैक किया जा रहा है।" },
  "billing.usageThisMonth": { en: "Your usage this month", hi: "इस महीने आपका उपयोग" },
  "billing.equivalentCost": { en: "would cost {amount} on {plan}", hi: "{plan} पर {amount} लागत होगी" },
  "billing.creditsUsed": { en: "Credits Used", hi: "उपयोग किए गए क्रेडिट" },
  "billing.queriesToday": { en: "Queries Today", hi: "आज की क्वेरी" },
  "billing.skillsDocs": { en: "Skills Documents", hi: "स्किल्स दस्तावेज़" },
  "billing.history": { en: "Billing History", hi: "बिलिंग इतिहास" },
  "billing.noHistory": { en: "No billing history yet", hi: "अभी तक कोई बिलिंग इतिहास नहीं" },
  "billing.upgrade": { en: "Upgrade", hi: "अपग्रेड" },
  "billing.cancelSubscription": { en: "Cancel Subscription", hi: "सदस्यता रद्द करें" },
  "billing.cancelConfirm": { en: "Are you sure you want to cancel?", hi: "क्या आप वाकई रद्द करना चाहते हैं?" },

  "pricing.title": { en: "Choose Your Plan", hi: "अपना प्लान चुनें" },
  "pricing.free": { en: "Free", hi: "मुफ्त" },
  "pricing.starter": { en: "Starter", hi: "स्टार्टर" },
  "pricing.professional": { en: "Professional", hi: "प्रोफेशनल" },
  "pricing.perMonth": { en: "/month", hi: "/महीना" },
  "pricing.currentPlan": { en: "Current Plan", hi: "वर्तमान प्लान" },
  "pricing.popular": { en: "Most Popular", hi: "सबसे लोकप्रिय" },

  "beta.bannerText": { en: "Beta — All Features Free. Share feedback!", hi: "बीटा — सभी सुविधाएँ मुफ्त। प्रतिक्रिया दें!" },

  "feedback.helpful": { en: "Was this helpful?", hi: "क्या यह सहायक था?" },
  "feedback.placeholder": { en: "Any additional feedback? (optional)", hi: "कोई अतिरिक्त प्रतिक्रिया? (वैकल्पिक)" },
  "feedback.submit": { en: "Submit Feedback", hi: "प्रतिक्रिया भेजें" },
  "feedback.thanks": { en: "Thanks for your feedback!", hi: "आपकी प्रतिक्रिया के लिए धन्यवाद!" },

  "nav.billing": { en: "Billing", hi: "बिलिंग" },
} as const;

export type TranslationKey = keyof typeof translations;

export function getTranslation(key: TranslationKey, lang: AppLanguage): string {
  return translations[key][lang];
}

export function getTranslationWithParams(
  key: TranslationKey,
  lang: AppLanguage,
  params: Record<string, string | number>,
): string {
  let text: string = translations[key][lang];
  for (const [param, value] of Object.entries(params)) {
    text = text.replaceAll(`{${param}}`, String(value));
  }
  return text;
}

export { translations };
