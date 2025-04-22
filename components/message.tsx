"use client";

import { Message as MessageType } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { Bot, User } from "lucide-react";
import Image from "next/image";
import { Markdown } from "./markdown"; // Import the Markdown component
import { TextShimmer } from "./motion-primitives/text-shimmer";


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

// Helper to check if a tool invocation is in progress
function isWebsiteToolLoading(message: MessageType): boolean {
  if (!message.parts) return false;
  return message.parts.some(
    (part: any) =>
      part.type === "tool-invocation" &&
      part.toolInvocation.toolName === "websiteGenerator" &&
      part.toolInvocation.state !== "result"
  );
}

export const Message = ({
  message
}: {
  message: MessageType;
}) => {
  const { role, content } = message;

  // Extract htmlContent if this message has a website artifact
  const htmlContent = getHtmlArtifactFromMessage(message);

  // Helper to strip <context>...</context> from user message content
  function stripContextBlock(text: string): string {
    // Remove <context>...</context> and any surrounding whitespace
    return text.replace(/\n?<context>[\s\S]*?<\/context>/g, '').trim();
  }

  // Helper to check if a tool invocation is in progress
  const websiteLoading = role === "assistant" && isWebsiteToolLoading(message);
  return (
    <motion.div
      id={message.id}
      className={`flex flex-row gap-4 px-4 w-full md:w-[500px] md:px-0 py-4 first-of-type:pt-20 last:pb-8`}
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="size-[28px] flex flex-col justify-center items-center flex-shrink-0 text-zinc-400">
        {role === "assistant" ? (
          <Bot />
        ) : (
          <User />
        )}
      </div>
      <div className="flex flex-col gap-2 w-full">
        <div className="flex flex-col gap-3 prose prose-zinc dark:prose-invert prose-sm max-w-none">
          {/* Render content using Markdown component if it's a string */}
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

        {/* Loader for tool invocation (website generation) */}
        {(websiteLoading) && (
          <TextShimmer className="font-mono text-sm" duration={1.5}>
            Generating website...
          </TextShimmer>
        )}

        {/* Render image attachments if present */}
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
                      <div className="bg-blue-50 p-2 text-center">
                        <span className="text-xs font-medium text-blue-600">
                          PDF: {attachment.name || `Document ${index + 1}`}
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

        {/* If this assistant message has a website artifact, show a [WEBSITE UPDATE] chip instead of the HTML */}
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
