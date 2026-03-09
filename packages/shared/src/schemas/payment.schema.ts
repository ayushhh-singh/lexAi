import { z } from "zod";

export const createSubscriptionSchema = z.object({
  tier: z.enum(["starter", "professional"]),
});

export const verifyPaymentSchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_subscription_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export const cancelSubscriptionSchema = z.object({
  cancel_at_period_end: z.boolean().optional().default(true),
});

export const submitFeedbackSchema = z.object({
  feature: z.string().min(1),
  rating: z.number().min(-1).max(1),
  comment: z.string().max(2000).optional(),
  response_id: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;
