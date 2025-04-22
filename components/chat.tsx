import { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Message } from "@/components/message";
import { AlertTriangle, PaperclipIcon, RotateCcw, XCircle } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { Message as MessageType, useChat } from "@ai-sdk/react";

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};

function isWebsiteToolLoading(message: MessageType) {
  if (!message?.parts) return false;
  return message.parts.some(
    (part: any) =>
      part.type === "tool-invocation" &&
      part.toolInvocation.toolName === "websiteGenerator" &&
      part.toolInvocation.state !== "result"
  );
}

export function Chat({
  projectId,
  initialMessage,
  onPreviewLoadingChange,
  initialMessages,
  onChatFinished,
}: {
  projectId: string;
  initialMessage?: string | null;
  onPreviewLoadingChange: (loading: boolean) => void;
  initialMessages?: MessageType[];
  onChatFinished?: () => void;
}) {
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<
    { id: number; url: string; contentType: string }[]
  >([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasSentInitial, setHasSentInitial] = useState(false);

  const {
    messages,
    input,
    setInput,
    handleSubmit,
    append,
    status,
    error,
    reload,
    setMessages,
  } = useChat({
    api: projectId ? `/api/project/${projectId}/chat` : undefined,
    onError: (error) => {
      console.error("Chat error:", error);
      toast.error(`An error occurred: ${error.message}`);
    },
    onFinish: () => {
      inputRef.current?.focus();
      if (onChatFinished) onChatFinished();
    },
  });

  // Hydrate chat with initialMessages if provided and messages is empty
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0 && messages.length === 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages, messages.length, setMessages]);

  // Send initial message if provided and not already sent
  useEffect(() => {
    if (
      initialMessage &&
      !hasSentInitial &&
      messages.length === 0 &&
      projectId
    ) {
      append({
        id: Math.random().toString(36).slice(2),
        role: "user",
        content: initialMessage,
        createdAt: new Date(),
      });
      setHasSentInitial(true);
    }
    // Reset hasSentInitial if projectId changes
    if (!initialMessage) setHasSentInitial(false);
  }, [initialMessage, hasSentInitial, messages.length, projectId, append]);

  // Compute isPreviewLoading and notify parent
  useEffect(() => {
    let isPreviewLoading = false;
    if (messages.length > 0) {
      const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
      if (lastAssistant && isWebsiteToolLoading(lastAssistant)) {
        isPreviewLoading = true;
      }
    }
    onPreviewLoadingChange(isPreviewLoading);
  }, [messages, onPreviewLoadingChange]);

  // Suggestions for quick actions
  const suggestedActions = [
    {
      title: "Create a",
      label: "portfolio website",
      action: "Create a portfolio website for a photographer",
    },
    {
      title: "Build a",
      label: "landing page for my app",
      action: "Build a landing page for a new mobile app called 'TaskMaster'",
    },
    {
      title: "Generate a",
      label: "simple blog layout",
      action:
        "Generate a simple blog layout with a header, main content area, and sidebar",
    },
    {
      title: "Design a",
      label: "contact page",
      action: "Design a contact page with a form (name, email, message)",
    },
  ];

  const validateAndAddFiles = useCallback(
    (files: FileList | File[]) => {
      const validFiles: File[] = [];
      const maxFiles = 5;
      const maxSize = 10 * 1024 * 1024; // 10MB
      const validTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
      ];

      if (attachments.length + files.length > maxFiles) {
        toast.error(`You can only attach up to ${maxFiles} files at once.`);
        return;
      }

      Array.from(files).forEach((file) => {
        if (!validTypes.includes(file.type)) {
          toast.error(
            `Invalid file type: ${file.name}. Only images and PDFs are allowed.`
          );
          return;
        }
        if (file.size > maxSize) {
          toast.error(`File too large: ${file.name}. Maximum size is 10MB.`);
          return;
        }
        validFiles.push(file);
      });

      if (validFiles.length > 0) {
        setAttachments((prev) => [...prev, ...validFiles]);
        setIsLoadingAttachments(true);
        let loadedCount = 0;
        const totalFiles = validFiles.length;
        validFiles.forEach((file) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result;
            if (result) {
              setAttachmentPreviews((prev) => [
                ...prev,
                {
                  id: Date.now() + Math.random(),
                  url: result as string,
                  contentType: file.type,
                },
              ]);
            }
            loadedCount++;
            if (loadedCount === totalFiles) {
              setIsLoadingAttachments(false);
            }
          };
          reader.onerror = () => {
            toast.error(`Failed to read file: ${file.name}`);
            loadedCount++;
            if (loadedCount === totalFiles) {
              setIsLoadingAttachments(false);
            }
          };
          reader.readAsDataURL(file);
        });
      }
    },
    [attachments]
  );

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        e.preventDefault();
        validateAndAddFiles(e.clipboardData.files);
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [validateAndAddFiles]);

  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add("drag-over");
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove("drag-over");
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove("drag-over");
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        validateAndAddFiles(e.dataTransfer.files);
      }
    };
    dropZone.addEventListener("dragover", handleDragOver);
    dropZone.addEventListener("dragleave", handleDragLeave);
    dropZone.addEventListener("drop", handleDrop);
    return () => {
      dropZone.removeEventListener("dragover", handleDragOver);
      dropZone.removeEventListener("dragleave", handleDragLeave);
      dropZone.removeEventListener("drop", handleDrop);
    };
  }, [validateAndAddFiles]);

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setAttachmentPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col justify-between flex-1" ref={dropZoneRef}>
      <div
        className="flex flex-col flex-grow items-center overflow-y-scroll px-4"
      >
        {messages.length === 0 && (
          <motion.div className="h-[350px] w-full md:w-[500px] pt-20">
            <div className="border rounded-lg p-6 flex flex-col gap-4 text-zinc-500 text-sm border-zinc-200">
              <div className="flex flex-col justify-center gap-4 items-center text-zinc-900">
                <p className="text-lg font-bold">AI Website Generator</p>
                <p className="text-center">
                  Start by describing the website you want to build, or try one of the suggestions below.
                </p>
              </div>
            </div>
          </motion.div>
        )}
        {messages.map((m: any) => (
          <div
            key={m.id}
            className="flex flex-col items-center w-full max-w-[500px] mx-auto"
          >
            <Message message={m} />
          </div>
        ))}
        <div />
      </div>
      <div className="px-4">
        <div className="grid sm:grid-cols-2 gap-2 w-full mx-auto md:max-w-[500px] mb-4">
          {messages.length === 0 &&
            suggestedActions.map((action, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.01 * index }}
                key={index}
                className={index > 1 ? "hidden sm:block" : "block"}
              >
                <button
                  onClick={async () => {
                    if (isLoadingAttachments) {
                      toast.error("Please wait for attachments to finish loading");
                      return;
                    }
                    append({
                      role: "user",
                      content: action.action,
                    });
                  }}
                  className="w-full text-left border border-zinc-200 text-zinc-800 rounded-lg p-2 text-sm hover:bg-zinc-100 transition-colors flex flex-col"
                  disabled={
                    isLoadingAttachments ||
                    status === "streaming" ||
                    status === "submitted"
                  }
                >
                  <span className="font-medium">{action.title}</span>
                  <span className="text-zinc-500">{action.label}</span>
                </button>
              </motion.div>
            ))}
        </div>
        {(attachmentPreviews.length > 0 || isLoadingAttachments) && (
          <div className="flex flex-wrap gap-2 mb-2 w-full md:max-w-[500px] mx-auto">
            {isLoadingAttachments && (
              <div className="h-16 w-16 rounded-md overflow-hidden border border-zinc-200 flex items-center justify-center bg-zinc-50">
                <div className="animate-pulse flex flex-col items-center">
                  <svg
                    className="animate-spin h-5 w-5 text-zinc-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span className="text-xs mt-1 text-zinc-500">Loading</span>
                </div>
              </div>
            )}
            {attachmentPreviews.map((preview, index) => (
              <div key={preview.id} className="relative">
                <div className="h-16 w-16 rounded-md overflow-hidden border border-zinc-200">
                  {preview.contentType.startsWith("image/") ? (
                    <Image
                      src={preview.url}
                      alt={`Attachment ${index + 1}`}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                    />
                  ) : preview.contentType === "application/pdf" ? (
                    <div className="h-full w-full bg-blue-50 flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-600">PDF</span>
                    </div>
                  ) : (
                    <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-500">File</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeAttachment(index)}
                  className="absolute -top-2 -right-2 bg-white rounded-full text-red-500"
                >
                  <XCircle size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
        {error && (
          <div className="w-full md:max-w-[500px] mx-auto mb-2 flex flex-col items-center">
            <div className="w-full bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span>Something went wrong. Please try again.</span>
              </div>
              <button
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-blue-600 px-2 py-1 rounded transition-colors border border-zinc-200 bg-white dark:bg-zinc-900"
                onClick={() => reload()}
                title="Retry"
              >
                <RotateCcw className="w-4 h-4" /> Retry
              </button>
            </div>
          </div>
        )}
        <form
          className="flex flex-col gap-2 relative items-center"
          onSubmit={handleSubmit}
        >
          <div className="relative w-full md:max-w-[500px] flex flex-col items-center gap-2">
            <input
              ref={inputRef}
              className="bg-zinc-100 rounded-md px-2 py-1.5 w-full outline-none text-zinc-800 max-w-[calc(100dvw-32px)] mx-auto disabled:opacity-50 pr-10"
              placeholder={
                status === "streaming" ||
                status === "submitted" ||
                isLoadingAttachments
                  ? isLoadingAttachments
                    ? "Loading attachments..."
                    : "Loading..."
                  : "Send a message..."
              }
              disabled={
                status === "streaming" ||
                status === "submitted" ||
                isLoadingAttachments
              }
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  validateAndAddFiles(e.target.files);
                  e.target.value = "";
                }
              }}
            />
            {(status === "streaming" || status === "submitted") &&
              !isLoadingAttachments && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <svg
                    className="animate-spin h-4 w-4 text-zinc-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </div>
              )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`absolute right-2 top-1/2 -translate-y-1/2 ${
                isLoadingAttachments
                  ? "text-zinc-300 cursor-not-allowed"
                  : "text-zinc-500 hover:text-zinc-700"
              } ${
                status === "streaming" || status === "submitted"
                  ? "right-8"
                  : ""
              }`}
              disabled={isLoadingAttachments}
            >
              <PaperclipIcon className="w-4 h-4" />
            </button>
          </div>
        </form>
        <div className="text-center text-xs text-zinc-500 mt-1 md:max-w-[500px] mx-auto">
          Drag & drop images or PDFs, paste from clipboard, or click the paperclip to attach to attach
        </div>
      </div>
    </div>
  );
} 