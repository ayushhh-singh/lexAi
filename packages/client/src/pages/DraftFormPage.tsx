import { useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Pencil,
  FileDown,
} from "lucide-react";
import { getTemplateById } from "../lib/templates";
import type { TemplateField, TemplateDefinition } from "../lib/templates";
import type { DocumentOutputFormat } from "@nyay/shared";
import { GenerationProgress } from "../components/drafts/GenerationProgress";
import type { GenerationStage } from "../components/drafts/GenerationProgress";
import { api } from "../lib/api-client";

const FIELDS_PER_STEP = 4;

function buildSteps(template: TemplateDefinition) {
  const fieldSteps: TemplateField[][] = [];
  for (let i = 0; i < template.fields.length; i += FIELDS_PER_STEP) {
    fieldSteps.push(template.fields.slice(i, i + FIELDS_PER_STEP));
  }
  // Add review step
  return { fieldSteps, totalSteps: fieldSteps.length + 1 };
}

function StepIndicator({
  current,
  total,
  labels,
}: {
  current: number;
  total: number;
  labels: string[];
}) {
  return (
    <div className="flex items-center justify-center gap-0">
      {Array.from({ length: total }).map((_, i) => {
        const isCompleted = i < current;
        const isActive = i === current;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 font-heading text-xs font-semibold transition-all duration-200 ${
                  isCompleted
                    ? "border-success bg-success text-white"
                    : isActive
                      ? "border-accent bg-accent text-white"
                      : "border-gray-300 bg-white text-gray-400"
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`mt-1 hidden text-center font-heading text-[10px] sm:block ${
                  isActive ? "font-medium text-gray-900" : "text-gray-400"
                }`}
                style={{ width: "5rem" }}
              >
                {labels[i]}
              </span>
            </div>
            {i < total - 1 && (
              <div
                className={`mx-1 h-0.5 w-6 sm:w-10 ${
                  isCompleted ? "bg-success" : "bg-gray-200"
                } transition-colors duration-200`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: TemplateField;
  value: string;
  onChange: (val: string) => void;
}) {
  const baseClass =
    "w-full rounded-lg border border-gray-300 px-4 py-2.5 font-heading text-sm text-gray-900 outline-none transition-colors duration-150 placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent";

  if (field.type === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={4}
        className={`${baseClass} resize-y`}
      />
    );
  }

  if (field.type === "select" && field.options) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={baseClass}
      >
        <option value="">Select...</option>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type={field.type === "date" ? "date" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      className={baseClass}
    />
  );
}

// Map SSE progress steps to our generation stages
function mapServerStep(step: string): GenerationStage {
  switch (step) {
    case "preparing":
      return "analyzing";
    case "generating":
      return "drafting";
    case "downloading":
      return "verifying";
    case "storing":
      return "formatting";
    default:
      return "analyzing";
  }
}

export function DraftFormPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const template = getTemplateById(templateId || "");

  const [values, setValues] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState<GenerationStage | "done" | "error">("analyzing");
  const [errorMessage, setErrorMessage] = useState("");

  const setField = useCallback((key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  }, []);

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <FileText className="h-12 w-12 text-gray-300" />
        <p className="font-heading text-sm text-gray-500">Template not found.</p>
        <Link
          to="/drafts"
          className="font-heading text-sm font-medium text-accent hover:text-accent-dark"
        >
          Back to templates
        </Link>
      </div>
    );
  }

  const { fieldSteps, totalSteps } = buildSteps(template);
  const isReviewStep = currentStep === fieldSteps.length;
  const stepLabels = fieldSteps.map((_, i) => `Step ${i + 1}`).concat("Review");

  const currentFields = isReviewStep ? [] : fieldSteps[currentStep];

  // Validate current step's required fields
  const canProceed = isReviewStep
    ? true
    : currentFields.every(
        (f) => !f.required || (values[f.key] && values[f.key].trim() !== ""),
      );

  const handleGenerate = async (format: DocumentOutputFormat) => {
    setGenerating(true);
    setGenerationStage("analyzing");
    setErrorMessage("");

    try {
      // Use SSE to track progress
      const response = await api.documents.generateSSE({
        template: template.id,
        format,
        fields: values,
        language: "en",
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(errorBody || `Server error (${response.status})`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Show initial stages while waiting for server SSE events
      setGenerationStage("analyzing");
      await delay(2000);
      setGenerationStage("researching");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          let data: { type: string; step?: string; message?: string; document?: { id: string; title: string; file_url: string; mime_type: string; file_size: number; tokens_used: number } };
          try {
            data = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          if (data.type === "progress" && data.step) {
            setGenerationStage(mapServerStep(data.step));
          } else if (data.type === "done" && data.document) {
            setGenerationStage("done");
            await delay(500);
            navigate(`/drafts/result/${data.document.id}`, {
              state: { document: data.document, template: template.id },
            });
            return;
          } else if (data.type === "error") {
            setGenerationStage("error");
            setErrorMessage(data.message || "Generation failed");
            setGenerating(false);
            return;
          }
        }
      }
    } catch (err) {
      setGenerationStage("error");
      setErrorMessage(err instanceof Error ? err.message : "Generation failed");
      setGenerating(false);
    }
  };

  if (generating) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6">
        <div className="mb-8 text-center">
          <h2 className="font-heading text-lg font-semibold text-gray-900">
            Generating {template.name}
          </h2>
          <p className="mt-1 font-heading text-sm text-gray-500">
            Our AI is drafting your document...
          </p>
        </div>
        <GenerationProgress
          currentStage={generationStage}
          errorMessage={errorMessage}
        />
        {generationStage === "error" && (
          <button
            onClick={() => {
              setGenerating(false);
              setGenerationStage("analyzing");
            }}
            className="mt-6 rounded-lg bg-navy-900 px-6 py-2.5 font-heading text-sm font-medium text-white transition-colors duration-150 hover:bg-navy-800"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 lg:p-6">
      {/* Back link */}
      <Link
        to="/drafts"
        className="inline-flex items-center gap-1.5 font-heading text-sm text-gray-500 transition-colors duration-150 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        All templates
      </Link>

      {/* Title */}
      <div>
        <h1 className="font-heading text-xl font-bold text-gray-900">
          {template.name}
        </h1>
        <p className="mt-1 font-heading text-sm text-gray-500">
          {template.description}
        </p>
      </div>

      {/* Step Indicator */}
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
        <StepIndicator
          current={currentStep}
          total={totalSteps}
          labels={stepLabels}
        />
      </div>

      {/* Form Content */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {isReviewStep ? (
          <ReviewStep
            template={template}
            fieldSteps={fieldSteps}
            values={values}
            onEdit={(stepIndex) => setCurrentStep(stepIndex)}
            onGenerate={handleGenerate}
          />
        ) : (
          <div className="space-y-5">
            {currentFields.map((field) => (
              <div key={field.key}>
                <label className="mb-1.5 block font-heading text-sm font-medium text-gray-700">
                  {field.label}
                  {field.required && (
                    <span className="ml-0.5 text-error">*</span>
                  )}
                </label>
                <FieldInput
                  field={field}
                  value={values[field.key] || ""}
                  onChange={(val) => setField(field.key, val)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      {!isReviewStep && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentStep((s) => s - 1)}
            disabled={currentStep === 0}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 font-heading text-sm font-medium text-gray-600 transition-colors duration-150 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>
          <button
            onClick={() => setCurrentStep((s) => s + 1)}
            disabled={!canProceed}
            className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-6 py-2.5 font-heading text-sm font-medium text-white transition-colors duration-150 hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {currentStep === fieldSteps.length - 1 ? "Review" : "Next"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function ReviewStep({
  fieldSteps,
  values,
  onEdit,
  onGenerate,
}: {
  template: TemplateDefinition;
  fieldSteps: TemplateField[][];
  values: Record<string, string>;
  onEdit: (stepIndex: number) => void;
  onGenerate: (format: DocumentOutputFormat) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-navy-600" />
        <h3 className="font-heading text-base font-semibold text-gray-900">
          Review Your Inputs
        </h3>
      </div>

      {fieldSteps.map((fields, stepIdx) => (
        <div
          key={stepIdx}
          className="rounded-lg border border-gray-100 bg-gray-50/50 p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="font-heading text-xs font-semibold uppercase tracking-wider text-gray-400">
              Step {stepIdx + 1}
            </span>
            <button
              onClick={() => onEdit(stepIdx)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-heading text-xs font-medium text-accent transition-colors duration-150 hover:bg-accent/10"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          </div>
          <div className="space-y-2">
            {fields.map((field) => {
              const val = values[field.key];
              return (
                <div key={field.key} className="flex gap-2">
                  <span className="shrink-0 font-heading text-xs font-medium text-gray-500">
                    {field.label}:
                  </span>
                  <span className="font-body text-xs text-gray-900">
                    {val || (
                      <span className="italic text-gray-400">Not provided</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Generate buttons */}
      <div className="flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row">
        <button
          onClick={() => onGenerate("docx")}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-navy-900 px-6 py-2.5 font-heading text-sm font-medium text-white transition-colors duration-150 hover:bg-navy-800"
        >
          <FileDown className="h-4 w-4" />
          Generate DOCX
        </button>
        <button
          onClick={() => onGenerate("pdf")}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-navy-900 bg-white px-6 py-2.5 font-heading text-sm font-medium text-navy-900 transition-colors duration-150 hover:bg-navy-50"
        >
          <FileDown className="h-4 w-4" />
          Generate PDF
        </button>
      </div>
    </div>
  );
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
