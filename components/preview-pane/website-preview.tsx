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

// Mobile device dimensions
const MOBILE_WIDTH = 375;
const MOBILE_HEIGHT = 667;

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
  
  return html.includes("</body>") 
    ? html.replace("</body>", handlerScript + "</body>") 
    : html + handlerScript;
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

  useEffect(() => {
    if (htmlVersions.length === 0) {
      setCurrentVersionIndex(0);
    } else {
      setCurrentVersionIndex(htmlVersions.length - 1);
    }
  }, [htmlVersions.length]);

  const htmlContent = htmlVersions[currentVersionIndex] || "";
  const safeHtmlContent = injectLinkHandler(htmlContent);
  const versionNumber = currentVersionIndex + 1;
  const hasPreviousVersion = currentVersionIndex > 0;
  const hasNextVersion = currentVersionIndex < htmlVersions.length - 1;
  const isDeployed = deployedVersionIndex === currentVersionIndex;
  const hasVersions = htmlVersions.length > 0;

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

  const refreshIframe = () => {
    if (!iframeRef.current) return;
    
    try {
      iframeRef.current.src = "about:blank";
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = "";
          iframeRef.current.srcdoc = safeHtmlContent;
        }
      }, 50);
    } catch (err) {
      console.error("Error refreshing iframe:", err);
    }
  };

  const renderIconButton = (
    icon: React.ReactNode,
    onClick: () => void,
    tooltipText: string,
    disabled: boolean = false,
    className: string = ""
  ) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onClick}
            disabled={disabled}
            variant="ghost"
            size="sm"
            className={cn("h-7 w-7 p-0 rounded-sm text-zinc-700", className)}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const renderVersionNavigation = () => (
    <div className="flex items-center">
      <div className="flex items-center">
        {hasVersions && renderIconButton(
          <ChevronLeftIcon size={16} />,
          goToPreviousVersion,
          "Previous version",
          !hasPreviousVersion
        )}

        <div className="flex items-center px-2">
          <span className="text-xs font-medium text-zinc-700">
            {hasVersions ? `Version ${versionNumber}` : "No versions"}
          </span>
          {isDeployed && (
            <Badge variant="outline" className="ml-2 h-5 bg-green-50 text-green-700 border-green-200 text-[10px] font-medium">
              Live
            </Badge>
          )}
        </div>

        {hasVersions && renderIconButton(
          <ChevronRightIcon size={16} />,
          goToNextVersion,
          "Next version",
          !hasNextVersion
        )}
      </div>

      {hasVersions && renderIconButton(
        <RefreshCw size={14} />,
        refreshIframe,
        "Refresh preview"
      )}

      {hasVersions && renderIconButton(
        isMobileView ? <Monitor size={14} /> : <Smartphone size={14} />,
        toggleViewMode,
        isMobileView ? "Switch to desktop view" : "Switch to mobile view",
        false,
        cn(
          "hidden md:flex md:items-center md:justify-center",
          isMobileView && "bg-zinc-200 text-zinc-800"
        )
      )}
    </div>
  );

  const renderActionButtons = () => (
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
  );

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] bg-zinc-50 w-full">
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
  );

  const renderIframe = () => (
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
        width={isMobileView ? MOBILE_WIDTH : "100%"}
        height={isMobileView ? MOBILE_HEIGHT : "100%"}
        style={{
          border: "none",
          minHeight: 0,
          height: isMobileView ? `${MOBILE_HEIGHT}px` : "100%",
          width: isMobileView ? `${MOBILE_WIDTH}px` : "100%",
          borderRadius: isMobileView ? "20px" : 0,
        }}
      />
    </div>
  );

  const renderLoadingOverlay = () => (
    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center">
      <Loader className="w-8 h-8 text-slate-500 animate-spin mb-4" />
      <div className="text-lg font-medium text-gray-700">
        Building your website...
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="bg-zinc-100 border-b border-zinc-200">
        <div className="flex h-9 items-center px-2 justify-between">
          {renderVersionNavigation()}
          {renderActionButtons()}
        </div>
      </div>

      <div className="flex-grow overflow-auto relative min-h-0 bg-white flex items-center justify-center">
        {htmlContent ? renderIframe() : renderEmptyState()}
        {isPreviewLoading && renderLoadingOverlay()}
      </div>
    </div>
  );
};

export default WebsitePreview;
