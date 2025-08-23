import React, { useRef, useState } from "react";
import { Upload, FileText, X } from "lucide-react";

/**
 * Pretty file input with drag & drop, file preview, and replace/clear actions.
 * Props:
 *  - label: string
 *  - required?: boolean
 *  - accept?: string (".pdf,.jpg,.jpeg,.png")
 *  - file: File | null
 *  - onChange: (fileOrNull) => void
 */
export default function NiceFileInput({
  label = "Choose file",
  required = false,
  accept = ".pdf,.jpg,.jpeg,.png",
  file,
  onChange,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const pick = () => inputRef.current?.click();

  const handleFiles = (files) => {
    if (!files || !files.length) return;
    const f = files[0];
    // very light accept check
    if (accept && !accept.split(",").some(ext => f.name.toLowerCase().endsWith(ext.trim().toLowerCase()))) {
      alert(`Only ${accept} allowed`);
      return;
    }
    onChange?.(f);
  };

  const formatSize = (b) => {
    if (!b && b !== 0) return "";
    const mb = b / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-800">
        {label} {required && <span className="text-red-500">*</span>}
      </div>

      {/* Empty state: dropzone */}
      {!file && (
        <div
          onClick={pick}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          className={`flex items-center justify-center w-full h-24 rounded-lg border-2 border-dashed transition
            ${dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400 bg-white"}
            cursor-pointer`}
          role="button"
          aria-label="Upload file"
        >
          <div className="flex items-center gap-2 text-gray-600">
            <Upload className="h-5 w-5" />
            <span className="text-sm">Choose file</span>
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

      {/* Selected state: file chip */}
      {file && (
        <div className="flex items-center justify-between w-full rounded-lg border bg-white px-3 py-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 p-2 rounded-md bg-gray-100">
              <FileText className="h-5 w-5 text-gray-500" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-gray-900">{file.name}</div>
              <div className="text-xs text-gray-500">
                {formatSize(file.size)} · {file.type || "file"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-sm px-2 py-1 rounded border hover:bg-gray-50"
              onClick={pick}
            >
              Replace
            </button>
            <button
              type="button"
              className="p-1 rounded hover:bg-red-50 text-red-600"
              onClick={() => onChange?.(null)}
              aria-label="Remove file"
              title="Remove"
            >
              <X className="h-4 w-4" />
            </button>
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
