import Input, { AttachmentPreview } from "@/components/input";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import { Message as MessageType } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { AlertTriangle, BotIcon, RotateCcw, UserIcon } from "lucide-react";
import Image from "next/image";
import React from "react";
import { Markdown } from "./markdown";
import { TextShimmer } from "./text-shimmer";

export interface ChatProps {
  messages: MessageType[];
  handleSend: (value: string, attachments: AttachmentPreview[]) => void;
  status: string;
  error: Error | null;
  reload: () => void;
}

function getHtmlArtifactFromMessage(message: MessageType) {
  if (!message.parts) return null;
  for (const part of message.parts) {
    if (
      part.type === "tool-invocation" &&
      part.toolInvocation.toolName === "websiteGenerator" &&
      part.toolInvocation.state === "result" &&
      part.toolInvocation.result
    ) {
      return part.toolInvocation.result.htmlContent;
    }
  }
  return null;
}

function isWebsiteToolLoading(message: MessageType) {
  if (!message?.parts) return false;
  return message.parts.some(
    (part: any) =>
      part.type === "tool-invocation" &&
      part.toolInvocation.toolName === "websiteGenerator" &&
      part.toolInvocation.state !== "result"
  );
}

const Message = ({ message }: { message: MessageType }) => {
  const { role, content } = message;
  const htmlContent = getHtmlArtifactFromMessage(message);
  function stripContextBlock(text: string): string {
    return text.replace(/\n?<context>[\s\S]*?<\/context>/g, "").trim();
  }
  const websiteLoading = role === "assistant" && isWebsiteToolLoading(message);
  return (
    <motion.div
      id={message.id}
      className={`flex flex-row gap-4 px-4 w-full md:w-[500px] md:px-0`}
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="size-[28px] flex flex-col justify-center items-center flex-shrink-0 text-zinc-400">
        {role === "assistant" ? (
          <BotIcon className="w-5 h-5" />
        ) : (
          <UserIcon className="w-5 h-5" />
        )}
      </div>
      <div className="flex flex-col gap-2 w-full">
        <div className="flex flex-col gap-3 prose prose-zinc dark:prose-invert prose-sm max-w-none">
          {typeof content === "string" ? (
            role === "user" ? (
              <Markdown>{stripContextBlock(content)}</Markdown>
            ) : (
              <Markdown>{content}</Markdown>
            )
          ) : (
            content
          )}
        </div>
        {websiteLoading && (
          <TextShimmer className="font-mono text-sm" duration={1.5}>
            Generating website...
          </TextShimmer>
        )}
        {message.experimental_attachments &&
          message.experimental_attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {message.experimental_attachments
                .filter(
                  (attachment) =>
                    attachment.contentType?.startsWith("image/") ||
                    attachment.contentType === "application/pdf"
                )
                .map((attachment, index) =>
                  attachment.contentType?.startsWith("image/") ? (
                    <div
                      key={index}
                      className="h-32 w-32 rounded-md overflow-hidden border border-zinc-200"
                      data-attachment="image"
                    >
                      <Image
                        src={attachment.url}
                        alt={attachment.name || `Image ${index + 1}`}
                        width={128}
                        height={128}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : attachment.contentType === "application/pdf" ? (
                    <div
                      key={index}
                      className="border border-zinc-200 rounded-md overflow-hidden"
                      data-attachment="pdf"
                    >
                      <div className="bg-gray-50 p-2 text-center">
                        <span className="text-xs font-medium text-gray-600">
                          {attachment.name || `Document ${index + 1}`}
                        </span>
                      </div>
                      <iframe
                        src={attachment.url}
                        title={attachment.name || `PDF ${index + 1}`}
                        width="300"
                        height="200"
                        className="border-0"
                      />
                    </div>
                  ) : null
                )}
            </div>
          )}
        {role === "assistant" && htmlContent && (
          <div className="w-full max-w-[500px] mx-auto mt-2 flex justify-start">
            <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full border border-blue-200 shadow-sm">
              WEBSITE UPDATED!
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export function Chat({
  messages,
  handleSend,
  status,
  error,
  reload,
}: ChatProps) {
  if (messages.length > 2) {
    console.log("messages");
    console.log(messages[messages.length - 2].content);
    console.log(messages[messages.length - 1].content);
  }
  const [input, setInput] = React.useState("");
  const handleLocalSend = (
    value: string,
    newAttachments: AttachmentPreview[]
  ) => {
    handleSend(value, newAttachments);
    setInput("");
  };
  const [containerRef, endRef] = useScrollToBottom<HTMLDivElement>();
  return (
    <div className="flex flex-col h-full">
      <div
        ref={containerRef}
        className="flex flex-col flex-1 items-center overflow-y-auto px-4 py-8 gap-12"
      >
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
          <div key={m.id} className="flex flex-col w-full mx-auto">
            <Message message={m} />
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="px-4">
        <Input
          value={input}
          onChange={setInput}
          onSend={handleLocalSend}
          loading={status === "streaming" || status === "submitted"}
          disabled={status === "streaming" || status === "submitted"}
        />
        {error && (
          <div className="w-full mx-auto mb-2 flex flex-col items-center">
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
