import { CheckCircle2, Circle, Loader2 } from "lucide-react";

export type GenerationStage =
  | "analyzing"
  | "researching"
  | "drafting"
  | "verifying"
  | "formatting";

const STAGES: { id: GenerationStage; label: string }[] = [
  { id: "analyzing", label: "Analyzing template & inputs" },
  { id: "researching", label: "Researching applicable law" },
  { id: "drafting", label: "Drafting document" },
  { id: "verifying", label: "Verifying citations" },
  { id: "formatting", label: "Formatting output" },
];

interface GenerationProgressProps {
  currentStage: GenerationStage | "done" | "error";
  errorMessage?: string;
}

export function GenerationProgress({ currentStage, errorMessage }: GenerationProgressProps) {
  const currentIndex = currentStage === "done" || currentStage === "error"
    ? STAGES.length
    : STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="space-y-0">
        {STAGES.map((stage, i) => {
          const isCompleted = i < currentIndex || currentStage === "done";
          const isActive = i === currentIndex && currentStage !== "done" && currentStage !== "error";

          return (
            <div key={stage.id} className="flex items-start gap-3">
              {/* Vertical connector + icon */}
              <div className="flex flex-col items-center">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-success animate-fade-in" />
                  ) : isActive ? (
                    <Loader2 className="h-5 w-5 animate-spin text-accent" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300" />
                  )}
                </div>
                {i < STAGES.length - 1 && (
                  <div
                    className={`h-5 w-0.5 ${
                      isCompleted ? "bg-success" : "bg-gray-200"
                    } transition-colors duration-300`}
                  />
                )}
              </div>

              {/* Label */}
              <div className="flex h-7 items-center">
                <span
                  className={`font-heading text-sm ${
                    isCompleted
                      ? "font-medium text-success-dark"
                      : isActive
                        ? "font-medium text-gray-900"
                        : "text-gray-400"
                  } transition-colors duration-200`}
                >
                  {stage.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {currentStage === "error" && errorMessage && (
        <div className="mt-4 rounded-lg border border-error/20 bg-error/5 px-4 py-3">
          <p className="font-heading text-sm text-error">{errorMessage}</p>
        </div>
      )}

      {currentStage !== "done" && currentStage !== "error" && (
        <p className="mt-4 text-center font-heading text-xs text-gray-400">
          This usually takes 15-45 seconds
        </p>
      )}
    </div>
  );
}
