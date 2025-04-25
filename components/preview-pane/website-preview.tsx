"use client";

import { Button } from "@/components/ui/button";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  Layout,
  Loader,
  RefreshCw,
  UploadIcon,
  Smartphone,
  Monitor,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function injectLinkHandler(html: string): string {
  const handlerScript = `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        document.body.addEventListener('click', function(e) {
          let target = e.target;
          while (target && target.tagName !== 'A') {
            target = target.parentElement;
          }
          if (target && target.tagName === 'A' && target.href && !target.target) {
            e.preventDefault();
            window.open(target.href, '_blank');
          }
        });
      });
    </script>
  `;
  if (html.includes("</body>")) {
    return html.replace("</body>", handlerScript + "</body>");
  }
  return html + handlerScript;
}

export interface WebsitePreviewProps {
  htmlVersions: string[];
  deployedVersionIndex: number | null;
  onDeploy: (html: string, versionIndex: number) => void;
  isUploading: boolean;
  isPreviewLoading: boolean;
  deployedUrl: string | null;
}

const WebsitePreview: React.FC<WebsitePreviewProps> = ({
  htmlVersions,
  deployedVersionIndex,
  onDeploy,
  isUploading,
  isPreviewLoading,
  deployedUrl,
}) => {
  const [currentVersionIndex, setCurrentVersionIndex] = useState(
    htmlVersions.length > 0 ? htmlVersions.length - 1 : 0
  );
  const [isMobileView, setIsMobileView] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Keep currentVersionIndex in sync with htmlVersions length
  useEffect(() => {
    if (htmlVersions.length === 0) {
      setCurrentVersionIndex(0);
    } else {
      setCurrentVersionIndex(htmlVersions.length - 1);
    }
  }, [htmlVersions.length]);

  const goToPreviousVersion = () => {
    setCurrentVersionIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };
  const goToNextVersion = () => {
    setCurrentVersionIndex((prev) =>
      prev < htmlVersions.length - 1 ? prev + 1 : prev
    );
  };

  const toggleViewMode = () => {
    setIsMobileView((prev) => !prev);
  };

  const htmlContent = htmlVersions[currentVersionIndex] || "";
  const safeHtmlContent = injectLinkHandler(htmlContent);
  const versionNumber = currentVersionIndex + 1;
  const hasPreviousVersion = currentVersionIndex > 0;
  const hasNextVersion = currentVersionIndex < htmlVersions.length - 1;
  const isDeployed = deployedVersionIndex === currentVersionIndex;

  // Function to refresh only the iframe
  const refreshIframe = () => {
    if (iframeRef.current) {
      iframeRef.current.src = "about:blank";
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = "";
          iframeRef.current.srcdoc = safeHtmlContent;
        }
      }, 50);
    }
  };

  const mobileWidth = 375; // iPhone standard width
  const mobileHeight = 667; // Approximate height

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="bg-zinc-100 border-b border-zinc-200">
        <div className="flex h-9 items-center px-2 gap-2">
          {/* Version Navigation */}
          <div className="flex items-center">
            {/* Version Info */}
            <div className="flex items-center">
              {htmlVersions.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={goToPreviousVersion}
                        disabled={!hasPreviousVersion}
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-sm text-zinc-700"
                      >
                        <ChevronLeftIcon size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Previous version
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <div className="flex items-center px-2">
                <span className="text-xs font-medium text-zinc-700">
                  {htmlVersions.length > 0 ? (
                    <>Version {versionNumber}</>
                  ) : (
                    "No versions"
                  )}
                </span>
                {isDeployed && (
                  <Badge
                    variant="outline"
                    className="ml-2 h-5 bg-green-50 text-green-700 border-green-200 text-[10px] font-medium"
                  >
                    Live
                  </Badge>
                )}
              </div>

              {htmlVersions.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={goToNextVersion}
                        disabled={!hasNextVersion}
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-sm text-zinc-700"
                      >
                        <ChevronRightIcon size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Next version</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {htmlVersions.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 rounded-sm text-zinc-700"
                      onClick={refreshIframe}
                    >
                      <RefreshCw size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Refresh preview</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Mobile/Desktop toggle button - hidden on mobile devices */}
            {htmlVersions.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 w-7 p-0 rounded-sm hidden md:flex md:items-center md:justify-center",
                        isMobileView
                          ? "bg-zinc-200 text-zinc-800"
                          : "text-zinc-700"
                      )}
                      onClick={toggleViewMode}
                    >
                      {isMobileView ? (
                        <Monitor size={14} />
                      ) : (
                        <Smartphone size={14} />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {isMobileView
                      ? "Switch to desktop view"
                      : "Switch to mobile view"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {isDeployed && deployedUrl ? (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2 flex items-center gap-1"
              >
                <a href={deployedUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLinkIcon size={14} />
                  <span className="hidden xs:inline">View site</span>
                </a>
              </Button>
            ) : !isDeployed && htmlContent ? (
              <Button
                onClick={() => onDeploy(htmlContent, currentVersionIndex)}
                disabled={isUploading}
                size="sm"
                className="h-7 text-xs px-2 flex items-center gap-1"
              >
                <UploadIcon size={14} />
                <span>{isUploading ? "Deploying..." : "Use this version"}</span>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-auto relative min-h-0 bg-white flex items-center justify-center">
        {htmlContent ? (
          <div
            className={cn(
              "transition-all duration-300 ease-in-out",
              isMobileView
                ? "scale-90 border-8 border-zinc-800 rounded-lg shadow-lg"
                : "w-full h-full"
            )}
          >
            <iframe
              ref={iframeRef}
              srcDoc={safeHtmlContent}
              title="Generated Website Preview"
              sandbox="allow-scripts allow-same-origin"
              width={isMobileView ? mobileWidth : "100%"}
              height={isMobileView ? mobileHeight : "100%"}
              style={{
                border: "none",
                minHeight: 0,
                height: isMobileView ? `${mobileHeight}px` : "100%",
                width: isMobileView ? `${mobileWidth}px` : "100%",
                borderRadius: isMobileView ? "20px" : 0,
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] bg-zinc-50 text-zinc-500 w-full">
            <div className="flex flex-col items-center gap-4 max-w-md p-6 text-center">
              <div className="rounded-full bg-zinc-100 p-4">
                <Layout size={32} className="text-zinc-400" />
              </div>
              <h3 className="text-lg font-medium text-zinc-700">
                No preview available
              </h3>
              <p className="text-sm text-zinc-500">
                Describe the website you want to build in the chat to generate a
                preview. Your website will appear here once it&apos;s created.
              </p>
            </div>
          </div>
        )}
        {isPreviewLoading && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center">
            <Loader className="w-8 h-8 text-slate-500 animate-spin mb-4" />
            <div className="text-lg font-medium text-gray-700">
              Building your website...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebsitePreview;
