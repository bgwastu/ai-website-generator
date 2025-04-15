"use client";

import { motion } from "framer-motion";
import { BotIcon, UserIcon } from "./icons";
import { Markdown } from "./markdown"; // Import the Markdown component
import { useCallback, useState, useEffect } from "react";
import { toast } from "sonner";
import HtmlViewer from "./html-viewer"; // Import HtmlViewer
import { Message as MessageType } from "@ai-sdk/react";
import Image from "next/image";

// Add a loading indicator component for attachments
function AttachmentLoadingIndicator() {
  return (
    <div className="flex items-center space-x-2 p-3 bg-zinc-50 border border-zinc-200 rounded-md">
      <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span className="text-xs text-zinc-600">Processing attachment...</span>
    </div>
  );
}

function getHtmlArtifactFromMessage(message: MessageType) {
  if (!message.parts) return null;
  for (const part of message.parts) {
    if (
      part.type === "tool-invocation" &&
      part.toolInvocation.toolName === "websiteGenerator" &&
      part.toolInvocation.state === "result" &&
      part.toolInvocation.result &&
      typeof part.toolInvocation.result.htmlContent === "string"
    ) {
      return part.toolInvocation.result.htmlContent;
    }
  }
  return null;
}

export const Message = ({ message }: { message: MessageType }) => {
  const { role, content } = message;

  // Extract htmlContent if this message has a website artifact
  const htmlContent = getHtmlArtifactFromMessage(message);

  // Add state for attachment processing
  const [isProcessingAttachments, setIsProcessingAttachments] = useState(false);
  
  // Show loading indicator for new assistant messages for a brief period
  useEffect(() => {
    if (role === 'assistant') {
      setIsProcessingAttachments(true);
      
      // After 2.5 seconds, hide the loading indicator
      const timer = setTimeout(() => {
        setIsProcessingAttachments(false);
      }, 2500);
      
      return () => clearTimeout(timer);
    }
  }, [role, message.id]);

  // Helper to strip <context>...</context> from user message content
  function stripContextBlock(text: string): string {
    // Remove <context>...</context> and any surrounding whitespace
    return text.replace(/\n?<context>[\s\S]*?<\/context>/g, '').trim();
  }

  // Per-message upload/delete state
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    url?: string;
  } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Upload handler for this artifact
  const handleUpload = useCallback(async () => {
    if (!htmlContent) {
      toast.error("No website content to upload");
      return;
    }
    try {
      setIsUploading(true);
      setUploadResult(null);
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlContent, projectId }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setProjectId(data.projectId);
        setUploadResult({
          success: true,
          message: "Website uploaded successfully!",
          url: data.url,
        });
        toast.success(
          <div>
            <p>Website uploaded successfully!</p>
            {data.url && (
              <p className="text-xs mt-1 break-all">
                <a
                  href={data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  {data.url}
                </a>
              </p>
            )}
          </div>
        );
      } else {
        setUploadResult({
          success: false,
          message: data.message || "Upload failed",
        });
        toast.error(data.message || "Upload failed");
      }
    } catch (error) {
      setUploadResult({
        success: false,
        message: error instanceof Error ? error.message : "Upload failed",
      });
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }, [htmlContent, projectId]);

  // Deletion handler for this artifact
  const handleDeletionSuccess = useCallback(() => {
    setProjectId(null);
    setUploadResult(null);
    toast.success("Project deleted successfully.");
  }, []);

  return (
    <motion.div
      id={message.id}
      className={`flex flex-row gap-4 px-4 w-full md:w-[500px] md:px-0 first-of-type:pt-20`}
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="size-[24px] flex flex-col justify-center items-center flex-shrink-0 text-zinc-400">
        {role === "assistant" ? <BotIcon /> : <UserIcon />}
      </div>
      <div className="flex flex-col gap-1 w-full">
        <div className="flex flex-col gap-4 prose prose-zinc dark:prose-invert prose-sm max-w-none">
          {/* Render content using Markdown component if it's a string */}
          {typeof content === "string"
            ? (
                role === "user"
                  ? <Markdown>{stripContextBlock(content)}</Markdown>
                  : <Markdown>{content}</Markdown>
              )
            : content}
        </div>
        
        {/* Show loading indicator when processing attachments */}
        {isProcessingAttachments && (
          <div className="mt-2">
            <AttachmentLoadingIndicator />
          </div>
        )}
        
        {/* Render image attachments if present */}
        {message.experimental_attachments && message.experimental_attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.experimental_attachments
              .filter(attachment => 
                attachment.contentType?.startsWith('image/') || 
                attachment.contentType === 'application/pdf'
              )
              .map((attachment, index) => 
                attachment.contentType?.startsWith('image/') ? (
                  <div key={index} className="h-32 w-32 rounded-md overflow-hidden border border-zinc-200" data-attachment="image">
                    <Image 
                      src={attachment.url} 
                      alt={attachment.name || `Image ${index + 1}`}
                      width={128} 
                      height={128} 
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : attachment.contentType === 'application/pdf' ? (
                  <div key={index} className="border border-zinc-200 rounded-md overflow-hidden" data-attachment="pdf">
                    <div className="bg-blue-50 p-2 text-center">
                      <span className="text-xs font-medium text-blue-600">PDF: {attachment.name || `Document ${index + 1}`}</span>
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
        
        {/* If this assistant message has a website artifact, show a [WEBSITE UPDATE] chip instead of the HTML */}
        {role === "assistant" && htmlContent && (
          <div className="w-full max-w-[500px] mx-auto mt-2 flex justify-start">
            {/* Chip-like component for website update */}
            <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full border border-blue-200 shadow-sm">
              WEBSITE UPDATED!
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
