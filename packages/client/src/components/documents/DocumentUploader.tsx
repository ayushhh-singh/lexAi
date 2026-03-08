import { useState, useRef, useCallback } from "react";
import { Upload, FileText, X, AlertCircle, Loader2 } from "lucide-react";
import { useTranslation } from "../../lib/i18n";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
];
const ACCEPTED_EXTENSIONS = ".pdf,.docx,.png,.jpg,.jpeg,.webp";

interface DocumentUploaderProps {
  onUpload: (file: File) => void;
  isUploading?: boolean;
  disabled?: boolean;
}

export function DocumentUploader({ onUpload, isUploading = false, disabled = false }: DocumentUploaderProps) {
  const { t } = useTranslation();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Unsupported file type. Please upload PDF, DOCX, or image files.";
    }
    if (file.size > MAX_SIZE) {
      return `File too large. Maximum size is ${MAX_SIZE / 1024 / 1024}MB.`;
    }
    return null;
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setSelectedFile(null);
        return;
      }
      setError(null);
      setSelectedFile(file);
    },
    [validateFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (disabled || isUploading) return;

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, isUploading, handleFile]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled && !isUploading) setDragActive(true);
    },
    [disabled, isUploading]
  );

  const handleDragLeave = useCallback(() => setDragActive(false), []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so the same file can be re-selected
      e.target.value = "";
    },
    [handleFile]
  );

  const handleAnalyze = () => {
    if (selectedFile && !isUploading) {
      onUpload(selectedFile);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setError(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && !isUploading && inputRef.current?.click()}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-200 ${
          dragActive
            ? "border-accent bg-accent/5"
            : disabled || isUploading
              ? "cursor-not-allowed border-gray-200 bg-gray-50"
              : "border-gray-300 bg-white hover:border-accent hover:bg-accent/5"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {isUploading ? (
          <>
            <Loader2 className="mb-3 h-10 w-10 animate-spin text-accent" />
            <p className="font-heading text-sm font-medium text-navy-600">
              Analyzing document...
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Extracting text and running AI analysis
            </p>
          </>
        ) : (
          <>
            <Upload className="mb-3 h-10 w-10 text-gray-400" />
            <p className="font-heading text-sm font-medium text-navy-600">
              Drop your document here, or{" "}
              <span className="text-accent">browse</span>
            </p>
            <p className="mt-1 text-xs text-gray-500">
              PDF, DOCX, or images (PNG, JPG, WEBP) up to 10MB
            </p>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Selected File */}
      {selectedFile && !isUploading && (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <FileText className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="font-heading text-sm font-medium text-navy-600 truncate max-w-[250px]">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              title={t("common.cancel")}
            >
              <X className="h-4 w-4" />
            </button>
            <button
              onClick={handleAnalyze}
              className="rounded-lg bg-navy-600 px-4 py-2 font-heading text-sm font-medium text-white transition-colors hover:bg-navy-700"
            >
              Analyze
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
