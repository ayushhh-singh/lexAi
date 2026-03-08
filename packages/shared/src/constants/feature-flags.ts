export const FEATURE_FLAGS = {
  AI_CHAT: true,
  AI_DOCUMENT_ANALYSIS: true,
  AI_CASE_PREDICTION: false,
  PAYMENT_GATEWAY: true,
  LAWYER_MARKETPLACE: false,
  VIDEO_CONSULTATION: false,
  MULTI_LANGUAGE: true,
  DOCUMENT_E_SIGN: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;
