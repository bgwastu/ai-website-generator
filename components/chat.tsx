import Input, { AttachmentPreview } from "@/components/input";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import { cn } from "@/lib/utils";
import { Message as MessageType } from "@ai-sdk/react";
import {
  AlertTriangle,
  BotIcon,
  Loader,
  RotateCcw,
  UserIcon,
} from "lucide-react";
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
  className?: string;
}

// Extended type for tool results
interface ToolResult {
  htmlVersionId?: string;
  message?: string;
  success?: boolean;
}

// Get info about the tool call in the message
function getToolCallInfo(message: MessageType) {
  if (!message.parts) return null;
  for (const part of message.parts) {
    if (part.type === "tool-invocation") {
      return {
        toolName: part.toolInvocation.toolName,
        state: part.toolInvocation.state,
        result:
          part.toolInvocation.state === "result"
            ? (part.toolInvocation.result as ToolResult | undefined)
            : undefined,
      };
    }
  }
  return null;
}

// Helper function to get loading text based on tool name
function getLoadingText(toolName: string | undefined): string | null {
  if (!toolName) return null;
  switch (toolName) {
    case "createWebsite":
      return "Creating your website...";
    case "updateWebsite":
      return "Updating your website...";
    case "getHtmlByVersion":
      return "Retrieving website version...";
    default:
      return `Working with ${toolName}...`;
  }
}

const Message = ({ message }: { message: MessageType }) => {
  const { role, content } = message;
  const toolCallInfo = getToolCallInfo(message);
  const isLoadingTool = toolCallInfo && toolCallInfo.state !== "result";
  const toolResult =
    toolCallInfo && toolCallInfo.state === "result"
      ? toolCallInfo.result
      : null;

  const loadingText = toolCallInfo
    ? getLoadingText(toolCallInfo.toolName)
    : null;

  return (
    <div
      id={message.id}
      className={`flex flex-row gap-4 px-4 w-full md:w-[500px] md:px-0`}
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
            <Markdown>{content.trim()}</Markdown>
          ) : (
            content
          )}
        </div>
        {isLoadingTool && loadingText && (
          <TextShimmer className="font-mono text-sm" duration={1.5}>
            {loadingText}
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
        {role === "assistant" && toolResult && toolResult.message && (
          <div className="w-full max-w-[500px] mx-auto mt-2 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-3 py-2">
            {toolResult.message}
          </div>
        )}
      </div>
    </div>
  );
};

export function Chat({
  messages,
  handleSend,
  status,
  error,
  reload,
  className,
}: ChatProps) {
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
    <div className={cn("flex flex-col h-full", className)}>
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={containerRef}
          className="flex flex-col items-center overflow-y-auto px-4 py-8 gap-12 h-full"
        >
          {messages.length === 0 && (
            <div className="h-[350px] w-full md:w-[500px] pt-20">
              <div className="border rounded-lg p-6 flex flex-col gap-4 text-zinc-500 text-sm border-zinc-200">
                <div className="flex flex-col justify-center gap-4 items-center text-zinc-900">
                  <p className="text-lg font-bold">AI Website Generator</p>
                  <p className="text-center">
                    Start by describing the website you want to build, or try
                    one of the suggestions below.
                  </p>
                </div>
              </div>
            </div>
          )}
          {messages.map((m: any) => (
            <div key={m.id} className="flex flex-col w-full mx-auto">
              <Message message={m} />
            </div>
          ))}
          <div ref={endRef} />
        </div>
        {messages.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        )}
      </div>
      <div>
        <div className="w-full flex flex-col px-4 pb-2">
          {(() => {
            // Find the latest assistant message
            const latestAssistantMsg = [...messages]
              .reverse()
              .find((m) => m.role === "assistant");
            const latestToolCallInfo = latestAssistantMsg
              ? getToolCallInfo(latestAssistantMsg)
              : null;
            const showStatus =
              (latestToolCallInfo && latestToolCallInfo.state !== "result") ||
              status === "submitted" ||
              status === "streaming" ||
              status === "tooling";

            if (!error && !showStatus) return null;
            let statusText = null;
            if (latestToolCallInfo && latestToolCallInfo.state !== "result") {
              switch (latestToolCallInfo.toolName) {
                case "createWebsite":
                  statusText = "Creating website...";
                  break;
                case "updateWebsite":
                  statusText = "Updating website...";
                  break;
                case "getHtmlByVersion":
                  statusText = "Retrieving website version...";
                  break;
                default:
                  statusText = `Working with ${latestToolCallInfo.toolName}...`;
              }
            } else if (status === "tooling") {
              statusText = "Working with tools...";
            } else if (status === "streaming") {
              statusText = "Generating message...";
            } else if (status === "submitted") {
              statusText = "Initializing message...";
            }

            return (
              <div className="flex flex-col gap-2 border-t border-l border-r border-b-0 border-zinc-200 rounded-t-md p-2 text-zinc-500 text-sm bg-zinc-50">
                {error && (
                  <div className="w-full flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-red-700">
                        Something went wrong. Please try again.
                      </span>
                    </div>
                    <button
                      className="flex items-center gap-1 text-xs text-zinc-500 hover:text-blue-600 px-2 py-1 rounded transition-colors border border-zinc-200 bg-white dark:bg-zinc-900"
                      onClick={() => reload()}
                      title="Retry"
                    >
                      <RotateCcw className="w-4 h-4" /> Retry
                    </button>
                  </div>
                )}
                {statusText && (
                  <div className="flex items-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>{statusText}</span>
                  </div>
                )}
              </div>
            );
          })()}
          <div>
            <Input
              value={input}
              onChange={setInput}
              onSend={handleLocalSend}
              loading={
                status === "streaming" ||
                status === "submitted" ||
                status === "tooling"
              }
              disabled={
                status === "streaming" ||
                status === "submitted" ||
                status === "tooling"
              }
              className={
                status === "submitted" ||
                status === "streaming" ||
                status === "tooling"
                  ? "rounded-t-none"
                  : ""
              }
            />
            <div className="mt-2 text-xs text-gray-400 text-center">
              You can attach images or PDF files to provide more context for
              your request.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
