import Input, { AttachmentPreview } from "@/components/input";
import { Message } from "@/components/message";
import { Message as MessageType, useChat } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

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
      if (onChatFinished) onChatFinished();
    },
  });

  useEffect(() => {
    if (
      initialMessages &&
      initialMessages.length > 0 &&
      messages.length === 0
    ) {
      setMessages(initialMessages);
    }
  }, [initialMessages, messages.length, setMessages]);

  // Send initial message if provided and not already sent
  useEffect(() => {
    if (initialMessage) {
      append({
        role: "user",
        content: initialMessage,
      });
    }
  }, []);

  // Compute isPreviewLoading and notify parent
  useEffect(() => {
    let isPreviewLoading = false;
    if (messages.length > 0) {
      const lastAssistant = [...messages]
        .reverse()
        .find((m) => m.role === "assistant");
      if (lastAssistant && isWebsiteToolLoading(lastAssistant)) {
        isPreviewLoading = true;
      }
    }
    onPreviewLoadingChange(isPreviewLoading);
  }, [messages, onPreviewLoadingChange]);

  const handleSend = (value: string, attachments: AttachmentPreview[]) => {
    if (!value.trim() && attachments.length === 0) return;
    handleSubmit(undefined, { experimental_attachments: attachments });
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col flex-1 items-center overflow-y-auto px-4">
        {messages.length === 0 && (
          <motion.div className="h-[350px] w-full md:w-[500px] pt-20">
            <div className="border rounded-lg p-6 flex flex-col gap-4 text-zinc-500 text-sm border-zinc-200">
              <div className="flex flex-col justify-center gap-4 items-center text-zinc-900">
                <p className="text-lg font-bold">AI Website Generator</p>
                <p className="text-center">
                  Start by describing the website you want to build, or try one
                  of the suggestions below.
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
        <Input
          value={input}
          onChange={setInput}
          onSend={handleSend}
          loading={status === "streaming" || status === "submitted"}
          disabled={status === "streaming" || status === "submitted"}
        />
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
      </div>
    </div>
  );
}
