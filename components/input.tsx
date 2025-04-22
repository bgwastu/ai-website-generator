import { useRef, useState, useEffect, useCallback } from "react";
import { PaperclipIcon } from "lucide-react";

export type AttachmentPreview = {
  id: number;
  url: string;
  name: string;
  size: number;
  contentType: string;
};

export default function Input({
  value,
  onChange,
  onSend,
  loading,
  disabled,
  placeholder = "Ask AI to build...",
  className = "",
  disableAttachments = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: (value: string, attachments: AttachmentPreview[]) => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  disableAttachments?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);

  // Auto-grow textarea up to 5 lines
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const maxHeight = 5 * 24 + 16; // 5 lines * line-height + padding
      textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + "px";
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
    }
  }, [value]);

  // Global drag and drop
  useEffect(() => {
    if (disableAttachments) return;
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setDragActive(true);
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      setDragActive(false);
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        handleAttachmentAdd(e.dataTransfer.files);
      }
    };
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [attachments, disableAttachments]);

  // Attachment logic
  const handleAttachmentAdd = (files: FileList | File[]) => {
    const maxFiles = 5;
    const maxSize = 10 * 1024 * 1024;
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
    ];
    if (attachments.length + files.length > maxFiles) {
      // @ts-ignore
      if (typeof window !== 'undefined' && window.toast) window.toast.error(`You can only attach up to ${maxFiles} files at once.`);
      return;
    }
    Array.from(files).forEach((file) => {
      if (!validTypes.includes(file.type)) {
        // @ts-ignore
        if (typeof window !== 'undefined' && window.toast) window.toast.error(`Invalid file type: ${file.name}. Only images and PDFs are allowed.`);
        return;
      }
      if (file.size > maxSize) {
        // @ts-ignore
        if (typeof window !== 'undefined' && window.toast) window.toast.error(`File too large: ${file.name}. Maximum size is 10MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setAttachments((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            url: e.target?.result as string,
            name: file.name,
            size: file.size,
            contentType: file.type,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAttachmentRemove = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    if (!value.trim() && attachments.length === 0) return;
    onSend(value, attachments);
    onChange("");
    setAttachments([]);
  };

  // Keyboard behavior
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    if (!isMobile) {
      if (e.key === "Enter" && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        if (!disabled && !loading && (value.trim() || attachments.length > 0)) handleSend();
      } // Cmd+Enter or Shift+Enter for newline
    }
    // On mobile, Enter inserts new line by default
  };

  return (
    <div
      className={`w-full bg-white border border-zinc-200 rounded-xl p-2 flex flex-col gap-1 shadow-sm relative ${dragActive ? "ring-2 ring-blue-400" : ""} ${className}`}
    >
      {/* Attachment previews */}
      {attachments.length > 0 && !disableAttachments && (
        <div className="flex flex-wrap gap-2 mb-1">
          {attachments.map((file, idx) => (
            <div key={file.id} className="flex items-center bg-zinc-50 border border-zinc-200 rounded px-2 py-1 text-xs max-w-[180px]">
              <span className="truncate mr-2">{file.name}</span>
              <span className="text-zinc-400 ml-1">{(file.size / 1024 / 1024).toFixed(2)}MB</span>
              <button
                type="button"
                className="ml-2 text-zinc-400 hover:text-red-500"
                onClick={() => handleAttachmentRemove(idx)}
                tabIndex={-1}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <textarea
        ref={textareaRef}
        className="bg-transparent resize-none outline-none px-2 py-1 text-zinc-800 text-base min-h-[32px] max-h-[152px] w-full"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={1}
        onKeyDown={handleKeyDown}
        disabled={disabled || loading}
      />
      <div className="flex flex-row items-center justify-end gap-2 mt-1">
        {!disableAttachments && (
          <>
            <button
              type="button"
              className="text-zinc-500 hover:text-blue-600 p-1 flex items-center justify-center"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || loading}
              tabIndex={-1}
            >
              <PaperclipIcon className="w-4 h-4" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              multiple
              onChange={e => {
                if (e.target.files) {
                  handleAttachmentAdd(e.target.files);
                  e.target.value = "";
                }
              }}
            />
          </>
        )}
        <button
          type="button"
          className={`bg-blue-600 text-white rounded flex items-center justify-center disabled:opacity-50 transition p-1`}
          style={{ width: 28, height: 21 }}
          onClick={handleSend}
          disabled={disabled || loading || (!value.trim() && attachments.length === 0)}
        >
          {/* Arrow up icon, 4x3 symmetry, small */}
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 12V1M8 1L2 7M8 1l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
} 