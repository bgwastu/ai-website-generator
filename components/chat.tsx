import Input, { AttachmentPreview } from "@/components/input";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import { cn } from "@/lib/utils";
import { Message as MessageType } from "@ai-sdk/react";
import {
  AlertTriangle,
  BotIcon,
  CheckIcon,
  Loader,
  RotateCcw,
  UserIcon,
} from "lucide-react";
import Image from "next/image";
import React, { useEffect, useState } from "react";
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

interface ToolCallInfo {
  toolName: string;
  state: string;
  result?: ToolResult;
}

// Get info about the tool call in the message
function getToolCallInfo(message: MessageType): ToolCallInfo | null {
  if (!message.parts) return null;
  
  const toolPart = message.parts.find(part => part.type === "tool-invocation");
  
  if (!toolPart) return null;
  
  const toolInvocation = (toolPart as any).toolInvocation;
  return {
    toolName: toolInvocation.toolName,
    state: toolInvocation.state,
    result: toolInvocation.state === "result" ? toolInvocation.result as ToolResult : undefined,
  };
}

// Get loading text based on tool name
function getToolStatusText(toolName?: string, status?: string): string {
  if (!toolName && !status) return "Processing...";
  
  if (toolName) {
    switch (toolName) {
      case "createWebsite": return "Creating your website...";
      case "updateWebsite": return "Updating your website...";
      case "getHtmlByVersion": return "Retrieving website version...";
      default: return `Working with ${toolName}...`;
    }
  }
  
  switch (status) {
    case "tooling": return "Working with tools...";
    case "streaming": return "Generating message...";
    case "submitted": return "Initializing message...";
    default: return "Processing...";
  }
}

const Message = ({ message }: { message: MessageType }) => {
  const { role, content } = message;
  const toolCallInfo = getToolCallInfo(message);
  const isLoadingTool = toolCallInfo && toolCallInfo.state !== "result";
  const toolResult = toolCallInfo?.result;
  const loadingText = isLoadingTool ? getToolStatusText(toolCallInfo?.toolName) : null;

  const avatarClassNames = "size-[28px] flex justify-center items-center flex-shrink-0 text-zinc-400";
  const messageContainerClassNames = "flex flex-row gap-4 px-4 w-full md:w-[500px] md:px-0";
  const contentClassNames = "flex flex-col gap-2 w-full";
  const textClassNames = "flex flex-col gap-3 prose prose-zinc dark:prose-invert prose-sm max-w-none";

  return (
    <div id={message.id} className={messageContainerClassNames}>
      <div className={avatarClassNames}>
        {role === "assistant" ? (
          <BotIcon className="w-5 h-5" />
        ) : (
          <UserIcon className="w-5 h-5" />
        )}
      </div>
      
      <div className={contentClassNames}>
        <div className={textClassNames}>
          {typeof content === "string" ? (
            <Markdown>{content.trim()}</Markdown>
          ) : (
            content
          )}
        </div>
        
        {isLoadingTool && loadingText && (
          <div className="mt-2 bg-zinc-50 border border-zinc-200 rounded-md px-3 py-2 flex items-center gap-2">
            <Loader size={14} className="text-zinc-500 animate-spin" />
            <TextShimmer className="text-sm">{loadingText}</TextShimmer>
          </div>
        )}
        
        {message.experimental_attachments && message.experimental_attachments.length > 0 && (
          <AttachmentsList attachments={message.experimental_attachments} />
        )}
        
        {role === "assistant" && toolResult?.message && (
          <div className="mt-2 text-sm text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-md px-3 py-2 flex items-center gap-2">
            <CheckIcon className="w-4 h-4 flex-shrink-0" />
            <span>{toolResult.message}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const AttachmentsList = ({ attachments }: { attachments: any[] }) => {
  const validAttachments = attachments.filter(
    attachment => 
      attachment.contentType?.startsWith("image/") || 
      attachment.contentType === "application/pdf"
  );
  
  if (validAttachments.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {validAttachments.map((attachment, index) => (
        <RenderAttachment key={index} attachment={attachment} index={index} />
      ))}
    </div>
  );
};

const RenderAttachment = ({ attachment, index }: { attachment: any, index: number }) => {
  const isImage = attachment.contentType?.startsWith("image/");
  const isPdf = attachment.contentType === "application/pdf";
  const name = attachment.name || (isImage ? `Image ${index + 1}` : `Document ${index + 1}`);
  
  if (isImage) {
    return (
      <div className="h-32 w-32 rounded-md overflow-hidden border border-zinc-200" data-attachment="image">
        <Image
          src={attachment.url}
          alt={name}
          width={128}
          height={128}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
  
  if (isPdf) {
    return (
      <div className="border border-zinc-200 rounded-md overflow-hidden" data-attachment="pdf">
        <div className="bg-zinc-50 p-2 text-center">
          <span className="text-xs font-medium text-zinc-600">{name}</span>
        </div>
        <iframe
          src={attachment.url}
          title={`PDF ${index + 1}`}
          width="300"
          height="200"
          className="border-0"
        />
      </div>
    );
  }
  
  return null;
};

const StatusBar = ({ error, status, latestToolInfo, reload }: { 
  error: Error | null, 
  status: string, 
  latestToolInfo: ToolCallInfo | null,
  reload: () => void 
}) => {
  // Determine if we should show status
  const showStatus = Boolean(
    (latestToolInfo && latestToolInfo.state !== "result") ||
    ["submitted", "streaming", "tooling"].includes(status)
  );
  
  if (!error && !showStatus) return null;
  
  // Get appropriate status text
  const statusText = latestToolInfo && latestToolInfo.state !== "result"
    ? getToolStatusText(latestToolInfo.toolName)
    : getToolStatusText(undefined, status);
  
  return (
    <div className="flex flex-col gap-2 border border-zinc-200 rounded-t-md p-2 text-zinc-500 text-sm bg-zinc-50">
      {error && (
        <div className="w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-red-700">Something went wrong. Please try again.</span>
          </div>
          <button
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-blue-600 px-2 py-1 rounded-md transition-colors border border-zinc-200 bg-white"
            onClick={reload}
            title="Retry"
          >
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
        </div>
      )}
      
      {statusText && (
        <div className="flex items-center gap-2">
          <Loader className="w-4 h-4 animate-spin text-zinc-500" />
          <span>{statusText}</span>
        </div>
      )}
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
  const [containerRef, endRef] = useScrollToBottom<HTMLDivElement>();
  const [isScrolling, setIsScrolling] = useState(false);
  const [showTopGradient, setShowTopGradient] = useState(false);
  const [showBottomGradient, setShowBottomGradient] = useState(false);
  
  // Find the latest assistant message with tool info
  const latestAssistantMsg = [...messages].reverse().find(m => m.role === "assistant");
  const latestToolInfo = latestAssistantMsg ? getToolCallInfo(latestAssistantMsg) : null;
  
  const handleLocalSend = (value: string, newAttachments: AttachmentPreview[]) => {
    handleSend(value, newAttachments);
    setInput("");
  };
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    let timeout: NodeJS.Timeout;
    const scrollHandler = () => {
      // Clear any existing timeout
      if (timeout) clearTimeout(timeout);
      
      // Get scroll position
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      
      // Show top gradient when not at the top
      setShowTopGradient(scrollTop > 20);
      
      // Show bottom gradient when not at the bottom
      setShowBottomGradient(scrollTop + clientHeight < scrollHeight - 20);
      
      // Set scrolling state to true
      setIsScrolling(true);
      
      // Set a timeout to reset scrolling state
      timeout = setTimeout(() => {
        setIsScrolling(false);
      }, 1000);
    };
    
    // Initial check
    scrollHandler();
    
    // Add scroll event listener
    container.addEventListener('scroll', scrollHandler);
    
    return () => {
      if (timeout) clearTimeout(timeout);
      if (container) {
        container.removeEventListener('scroll', scrollHandler);
      }
    };
  }, [containerRef, messages]);
  
  const isInputDisabled = ["streaming", "submitted", "tooling"].includes(status);
  
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages container */}
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={containerRef}
          className="flex flex-col items-center overflow-y-auto px-4 py-8 gap-12 h-full"
        >
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            messages.map(message => (
              <div key={message.id} className="flex flex-col w-full mx-auto">
                <Message message={message} />
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
        
        {messages.length > 0 && (
          <>
            {/* Top gradient - only shown when scrolling down from top */}
            {showTopGradient && (
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-white to-transparent pointer-events-none transition-opacity duration-300" />
            )}
            
            {/* Bottom gradient - only shown when not at the bottom */}
            {showBottomGradient && (
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none transition-opacity duration-300" />
            )}
          </>
        )}
      </div>
      
      {/* Input area */}
      <div className="w-full flex flex-col px-4 pb-2">
        <StatusBar 
          error={error} 
          status={status} 
          latestToolInfo={latestToolInfo} 
          reload={reload} 
        />
        
        <div>
          <Input
            value={input}
            onChange={setInput}
            onSend={handleLocalSend}
            loading={isInputDisabled}
            disabled={isInputDisabled}
            className={isInputDisabled ? "rounded-t-none" : ""}
          />
          <div className="mt-2 text-xs text-zinc-400 text-center">
            You can attach images or PDF files to provide more context for your request.
          </div>
        </div>
      </div>
    </div>
  );
}

const EmptyState = () => (
  <div className="h-[350px] w-full md:w-[500px] pt-20">
    <div className="border rounded-lg p-6 flex flex-col gap-4 text-zinc-500 text-sm border-zinc-200">
      <div className="flex flex-col justify-center gap-4 items-center text-zinc-900">
        <p className="text-lg font-bold">AI Website Generator</p>
        <p className="text-center">
          Start by describing the website you want to build, or try one of the suggestions below.
        </p>
      </div>
    </div>
  </div>
);
