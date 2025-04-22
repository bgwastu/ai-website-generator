"use client";

// import HtmlViewer from "@/components/html-viewer";
import { Chat } from "@/components/chat";
import PreviewPane from "@/components/preview-pane";
import { Message as MessageType, useChat } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { toast } from "sonner";

// Helper to check if a tool invocation is in progress (copied from message.tsx)
function isWebsiteToolLoading(message: MessageType) {
  if (!message?.parts) return false;
  return message.parts.some(
    (part: any) =>
      part.type === "tool-invocation" &&
      part.toolInvocation.toolName === "websiteGenerator" &&
      part.toolInvocation.state !== "result"
  );
}

export default function Home() {
  const [currentHtml, setCurrentHtml] = useState<string>("");
  const [htmlVersions, setHtmlVersions] = useState<string[]>([]);
  const [deployedVersionIndex, setDeployedVersionIndex] = useState<number | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    url?: string;
    domain?: string;
  } | null>(null);
  const [domain, setDomain] = useState<string | null>(null);

  const {
    messages,
    input,
    setInput,
    handleSubmit,
    append,
    status,
    error,
    reload,
  } = useChat({
    api: "/api/chat",
    onError: (error) => {
      console.error("Chat error:", error);
      toast.error(`An error occurred: ${error.message}`);
    },
    onFinish: (message) => {
      let newHtmlContent: string | null = null;

      if (message.parts) {
        for (const part of message.parts) {
          if (
            part.type === "tool-invocation" &&
            part.toolInvocation.toolName === "websiteGenerator" &&
            part.toolInvocation.state === "result" &&
            part.toolInvocation.result &&
            typeof part.toolInvocation.result.htmlContent === "string"
          ) {
            newHtmlContent = part.toolInvocation.result.htmlContent;
            break;
          }
        }
      }

      if (newHtmlContent !== null) {
        setHtmlVersions(prev => {
          const newVersions = [...prev, newHtmlContent!];
          setCurrentHtml(newHtmlContent);
          // Deploy and mark as deployed for this new version
          deployWebsite(newHtmlContent, newVersions.length - 1);
          return newVersions;
        });
        toast.info("Website automatically updated with latest changes.");
      }
      inputRef.current?.focus();
    },
  });

  const inputRef = useRef<HTMLInputElement>(null);

  const deployWebsite = async (htmlToDeploy?: string, versionIndex?: number) => {
    const content = htmlToDeploy || htmlVersions[
      (typeof versionIndex === "number" ? versionIndex : htmlVersions.length - 1)
    ] || currentHtml;
    if (typeof content !== "string") {
      console.error(
        "Deployment error: Content is not a string. Value:",
        content
      );
      toast.error("Cannot deploy: Invalid website content.");
      return;
    }
    if (!content || content.trim() === "") {
      toast.error("No website content to deploy");
      return;
    }
    if (!htmlToDeploy) {
      toast.info("Deploying website...");
    }
    setIsUploading(true);
    setUploadResult(null);
    try {
      const payload = {
        htmlContent: content,
        domain: domain,
      };
      const response = await fetch("/api/deploy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      setUploadResult(result);
      if (result.success) {
        if (result.domain) {
          setDomain(result.domain);
        }
        // Use the provided versionIndex if available, otherwise fallback
        setDeployedVersionIndex(
          typeof versionIndex === "number" ? versionIndex : htmlVersions.length - 1
        );

        const DeploySuccessToast = ({
          message,
          url,
        }: {
          message: string;
          url?: string;
        }) => (
          <div className="flex flex-col gap-1 items-start">
            <span>{message}</span>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm underline break-all"
                onClick={(e) => e.stopPropagation()}
              >
                {url}
              </a>
            )}
          </div>
        );

        const baseMessage = result.message?.includes("successfully")
          ? result.message.split("URL")[0].trim()
          : "Website deployed successfully!";

        toast.success(
          <DeploySuccessToast message={baseMessage} url={result.url} />
        );
      } else {
        toast.error(result.message || "Failed to deploy website");
      }
    } catch (error) {
      console.error("Deployment error:", error);
      const message =
        error instanceof Error ? error.message : "Error deploying website";
      setUploadResult({ success: false, message });
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  // Determine if website is loading
  let isPreviewLoading = false;
  if (messages.length > 0) {
    // Find the latest assistant message
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (lastAssistant && isWebsiteToolLoading(lastAssistant)) {
      isPreviewLoading = true;
    }
  }

  return (
    <div className="h-screen">
      <motion.div layout className="flex flex-col md:flex-row h-screen gap-2 pb-4">
        {/* Main chat area */}
        <Chat
          messages={messages}
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          append={append}
          status={status}
          error={error}
          reload={reload}
        />
        {/* Desktop HTML preview area */}
        <div className="hidden md:flex md:flex-[1.4] flex-col w-[420px] max-w-[40vw] h-full flex-1">
          <motion.div
            className="h-full flex-1 flex flex-col"
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <PreviewPane
              htmlVersions={htmlVersions}
              deployedVersionIndex={deployedVersionIndex}
              onDeploy={deployWebsite}
              isUploading={isUploading}
              uploadResult={uploadResult}
              domain={domain}
              isPreviewLoading={isPreviewLoading}
            />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
