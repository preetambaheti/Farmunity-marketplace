import React, { useRef, useState, useMemo } from "react";
import { Upload, FileText, X, Image as ImageIcon } from "lucide-react";

/**
 * Pretty file input with drag & drop, file preview, and replace/clear actions.
 * Props:
 *  - label: string
 *  - required?: boolean
 *  - accept?: string (".pdf,.jpg,.jpeg,.png")
 *  - file: File | null
 *  - onChange: (fileOrNull) => void
 *  - hint?: string (optional helper text, e.g. "PDF/JPG/PNG up to 5MB")
 *  - maxSizeMB?: number (soft check; shows alert if exceeded)
 */
export default function NiceFileInput({
  label = "Choose file",
  required = false,
  accept = ".pdf,.jpg,.jpeg,.png",
  file,
  onChange,
  hint,
  maxSizeMB,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Clean up preview URL when file changes
  React.useEffect(() => {
    if (file && isImageFile(file)) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [file]);

  const acceptList = useMemo(
    () =>
      (accept || "")
        .split(",")
        .map((ext) => ext.trim().toLowerCase())
        .filter(Boolean),
    [accept]
  );

  const pick = () => inputRef.current?.click();

  function isImageFile(f) {
    if (!f) return false;
    const name = f.name?.toLowerCase?.() || "";
    const type = f.type?.toLowerCase?.() || "";
    return (
      type.startsWith("image/") ||
      [".jpg", ".jpeg", ".png", ".gif", ".webp"].some((x) => name.endsWith(x))
    );
  }

  function validateAccept(f) {
    if (!acceptList.length) return true;
    const name = f.name?.toLowerCase?.() || "";
    const type = f.type?.toLowerCase?.() || "";

    // If accept contains MIME-like tokens (e.g., image/*), allow by mime
    const hasMimeWildcard = acceptList.some((a) => a.includes("/"));
    if (hasMimeWildcard) {
      // Exact match or wildcard like image/*
      const ok = acceptList.some((a) => {
        if (!a.includes("/")) return false;
        const [maj, sub] = a.split("/");
        const [fmaj, fsub] = type.split("/");
        if (!maj || !sub || !fmaj) return false;
        return (maj === fmaj && (sub === "*" || sub === fsub));
      });
      if (ok) return true;
    }

    // Otherwise check by extension list
    return acceptList.some((ext) => name.endsWith(ext));
  }

  function validateSize(f) {
    if (!maxSizeMB) return true;
    const ok = f.size <= maxSizeMB * 1024 * 1024;
    return ok;
  }

  const handleFiles = (files) => {
    if (!files || !files.length) return;
    const f = files[0];

    if (!validateAccept(f)) {
      alert(`Only ${accept} allowed`);
      return;
    }
    if (!validateSize(f)) {
      alert(`Max file size is ${maxSizeMB} MB`);
      return;
    }
    onChange?.(f);
  };

  const formatSize = (b) => {
    if (b == null) return "";
    const mb = b / (1024 * 1024);
    if (mb < 1) {
      const kb = b / 1024;
      return `${kb.toFixed(0)} KB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  // Keyboard support for dropzone
  const onDropzoneKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick();
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-800">
        {label} {required && <span className="text-red-500">*</span>}
      </div>

      {/* Helper / hint text (optional) */}
      {hint && (
        <div className="text-xs text-gray-500 -mt-1">{hint}</div>
      )}

      {/* Empty state: dropzone */}
      {!file && (
        <div
          onClick={pick}
          onKeyDown={onDropzoneKeyDown}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={`flex items-center justify-center w-full h-24 rounded-lg border-2 border-dashed transition cursor-pointer
            ${dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400 bg-white"}
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
          role="button"
          tabIndex={0}
          aria-label="Upload file"
        >
          <div className="flex items-center gap-2 text-gray-600">
            <Upload className="h-5 w-5" />
            <span className="text-sm">Tap to browse or drag &amp; drop</span>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {/* Selected state: file chip / preview */}
      {file && (
        <div className="flex items-center justify-between w-full rounded-lg border bg-white px-3 py-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 p-2 rounded-md bg-gray-100">
              {isImageFile(file) ? (
                previewUrl ? (
                  // Thumbnail preview (kept small to not change desktop layout)
                  <img
                    src={previewUrl}
                    alt="Selected"
                    className="h-8 w-8 rounded object-cover bg-white"
                  />
                ) : (
                  <ImageIcon className="h-5 w-5 text-gray-500" />
                )
              ) : (
                <FileText className="h-5 w-5 text-gray-500" />
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-gray-900">
                {file.name}
              </div>
              <div className="text-xs text-gray-500">
                {formatSize(file.size)} · {file.type || "file"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-sm px-3 py-2 rounded border hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-h-[40px]"
              onClick={pick}
            >
              Replace
            </button>
            <button
              type="button"
              className="p-2 rounded hover:bg-red-50 text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 min-h-[40px]"
              onClick={() => onChange?.(null)}
              aria-label="Remove file"
              title="Remove"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Keep input here so Replace re-opens native picker */}
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
