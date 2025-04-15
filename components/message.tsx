"use client";

import { motion } from "framer-motion";
import { BotIcon, UserIcon } from "./icons";
import { Markdown } from "./markdown"; // Import the Markdown component
import { useCallback, useState } from "react";
import { toast } from "sonner";
import HtmlViewer from "./html-viewer"; // Import HtmlViewer
import { Message as MessageType } from "@ai-sdk/react";

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
          {typeof content === "string" ? (
            <Markdown>{content}</Markdown>
          ) : (
            content
          )}
        </div>
        {/* If this message has a website artifact, render the HtmlViewer below the message */}
        {role === "assistant" && htmlContent && (
          <div className="w-full max-w-[500px] mx-auto mt-2">
            <HtmlViewer
              htmlContent={htmlContent}
              projectId={projectId}
              isUploading={isUploading}
              onUpload={handleUpload}
              uploadResult={uploadResult}
              isPreviewLoading={isPreviewLoading}
              onDeleteSuccess={handleDeletionSuccess}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};
