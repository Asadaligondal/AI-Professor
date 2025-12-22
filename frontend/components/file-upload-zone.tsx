"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadZoneProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  accept?: string;
  maxSize?: number;
  label?: string;
  description?: string;
}

export function FileUploadZone({
  file,
  onFileSelect,
  accept = ".pdf",
  maxSize = 50 * 1024 * 1024, // 50MB
  label = "Upload File",
  description = "Drag and drop or click to browse",
}: FileUploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept: { "application/pdf": [accept] },
      maxSize,
      maxFiles: 1,
      multiple: false,
    });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-2">
      {!file ? (
        <div
          {...getRootProps()}
          className={cn(
            "relative cursor-pointer rounded-lg border-2 border-dashed p-8 transition-colors",
            isDragActive
              ? "border-zinc-900 bg-zinc-100 dark:border-zinc-50 dark:bg-zinc-900"
              : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600",
            fileRejections.length > 0 && "border-red-500"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="rounded-full bg-zinc-100 p-3 dark:bg-zinc-900">
              <Upload className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {isDragActive ? "Drop file here" : label}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {description}
              </p>
            </div>
            <p className="text-xs text-zinc-400">
              PDF files up to {formatFileSize(maxSize)}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-2 dark:bg-green-900">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {file.name}
              </p>
              <p className="text-xs text-zinc-500">
                {formatFileSize(file.size)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onFileSelect(null)}
            className="rounded-full p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
          </button>
        </div>
      )}

      {fileRejections.length > 0 && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {fileRejections[0].errors[0].message}
        </p>
      )}
    </div>
  );
}
