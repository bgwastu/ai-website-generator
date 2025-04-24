"use client";

import { Button } from "@/components/ui/button";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  Globe,
  Layout,
  Loader,
  UploadIcon
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Badge } from "../ui/badge";

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

  const htmlContent = htmlVersions[currentVersionIndex] || "";
  const safeHtmlContent = injectLinkHandler(htmlContent);
  const versionNumber = currentVersionIndex + 1;
  const hasPreviousVersion = currentVersionIndex > 0;
  const hasNextVersion = currentVersionIndex < htmlVersions.length - 1;
  const isDeployed = deployedVersionIndex === currentVersionIndex;

  // Function to open preview in a new tab
  const openFullPreview = () => {
    if (!htmlContent) return;
    
    // Create a new blob from the HTML content
    const blob = new Blob([safeHtmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Open in a new tab
    window.open(url, '_blank');
    
    // Clean up the URL object after a delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {htmlContent && (
        <div className="bg-white border-b border-zinc-200 shadow-sm">
          <div className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-2">
            {/* Version Controls Group */}
            <div className="flex flex-row items-center gap-2 w-full sm:w-auto">
              <div className="bg-zinc-100 p-1 rounded-md flex items-center">
                <Button
                  onClick={goToPreviousVersion}
                  disabled={!hasPreviousVersion}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 rounded-sm"
                  title="Previous version"
                >
                  <ChevronLeftIcon size={16} />
                </Button>
                <div className="flex items-center px-2">
                  <span className="text-xs font-medium text-zinc-700">
                    Version {versionNumber}
                  </span>
                </div>
                <Button
                  onClick={goToNextVersion}
                  disabled={!hasNextVersion}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 rounded-sm"
                  title="Next version"
                >
                  <ChevronRightIcon size={16} />
                </Button>
              </div>
              
              {isDeployed && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 h-8 ml-2 sm:ml-3">
                  <Globe size={12} className="mr-1" />
                  Deployed
                </Badge>
              )}
            </div>
            
            {/* Action Buttons Group */}
            <div className="flex flex-row flex-wrap items-center gap-2 w-full sm:w-auto sm:ml-auto">
              {isDeployed && deployedUrl ? (
                <Button 
                  asChild 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 w-full sm:w-auto"
                >
                  <a href={deployedUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLinkIcon size={14} className="mr-1.5" /> 
                    View live site
                  </a>
                </Button>
              ) : !isDeployed && htmlContent ? (
                <Button
                  onClick={() => onDeploy(htmlContent, currentVersionIndex)}
                  disabled={isUploading}
                  variant="outline"
                  size="sm"
                  className={`h-8 text-xs w-full sm:w-auto ${isUploading ? 'bg-zinc-100' : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:text-blue-800'}`}
                >
                  <UploadIcon size={14} className="mr-1.5" />
                  {isUploading ? "Deploying..." : "Deploy version"}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      )}
      <div className="flex-grow overflow-auto relative min-h-0">
        {htmlContent ? (
          <iframe
            ref={iframeRef}
            srcDoc={safeHtmlContent}
            title="Generated Website Preview"
            sandbox="allow-scripts allow-same-origin"
            width="100%"
            height="100%"
            style={{
              border: "none",
              minHeight: 0,
              height: "100%",
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] bg-zinc-50 text-zinc-500">
            <div className="flex flex-col items-center gap-4 max-w-md p-6 text-center">
              <div className="rounded-full bg-zinc-100 p-4">
                <Layout size={32} className="text-zinc-400" />
              </div>
              <h3 className="text-lg font-medium text-zinc-700">No preview available</h3>
              <p className="text-sm text-zinc-500">
                Describe the website you want to build in the chat to generate a
                preview. Your website will appear here once it&apos;s created.
              </p>
            </div>
          </div>
        )}
        {isPreviewLoading && (
          <div className="absolute inset-0 bg-white backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="flex flex-col items-center gap-4 max-w-xs text-center">
              <Loader size={28} className="text-zinc-600 animate-spin" />
              <div>
                <h3 className="text-base font-medium text-zinc-800">Generating preview</h3>
                <p className="text-sm text-zinc-500 mt-1">
                  Building your website with AI. This may take a moment...
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebsitePreview;
