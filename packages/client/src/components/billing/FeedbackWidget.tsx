import { useState } from "react";
import { ThumbsUp, ThumbsDown, Send } from "lucide-react";
import { useTranslation } from "../../lib/i18n";
import { api } from "../../lib/api-client";

interface FeedbackWidgetProps {
  feature: string;
  responseId?: string;
  metadata?: Record<string, unknown>;
}

export function FeedbackWidget({ feature, responseId, metadata }: FeedbackWidgetProps) {
  const { t } = useTranslation();
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submitFeedback = async (value: number, text?: string) => {
    setSubmitting(true);
    try {
      await api.payments.submitFeedback({
        feature,
        rating: value,
        comment: text,
        response_id: responseId,
        metadata,
      });
      setSubmitted(true);
    } catch {
      // Silent failure for feedback
    } finally {
      setSubmitting(false);
    }
  };

  const handleRate = (value: 1 | -1) => {
    setRating(value);
    setShowComment(true);
  };

  const handleSubmitComment = () => {
    if (rating === null) return;
    submitFeedback(rating, comment.trim() || undefined);
  };

  const handleSkipComment = () => {
    if (rating === null) return;
    submitFeedback(rating);
  };

  if (submitted) {
    return (
      <p className="font-heading text-xs text-success animate-fade-in">
        {t("feedback.thanks")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      <div className="flex items-center gap-2">
        <span className="font-heading text-xs text-gray-400">
          {t("feedback.helpful")}
        </span>
        <button
          onClick={() => handleRate(1)}
          aria-label="Thumbs up"
          className={`rounded-lg p-1.5 transition-colors duration-150 ${
            rating === 1
              ? "bg-success/10 text-success"
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          }`}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => handleRate(-1)}
          aria-label="Thumbs down"
          className={`rounded-lg p-1.5 transition-colors duration-150 ${
            rating === -1
              ? "bg-error/10 text-error"
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          }`}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {showComment && !submitted && (
        <div className="flex items-center gap-2 animate-fade-in">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("feedback.placeholder")}
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 font-heading text-xs text-gray-900 outline-none placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent/20"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmitComment();
            }}
          />
          <button
            onClick={comment.trim() ? handleSubmitComment : handleSkipComment}
            disabled={submitting}
            className="rounded-lg bg-navy-600 p-1.5 text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
