"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  MaximizeIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

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
  const modalIframeRef = useRef<HTMLIFrameElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Keep currentVersionIndex in sync with htmlVersions length
  useEffect(() => {
    if (htmlVersions.length === 0) {
      setCurrentVersionIndex(0);
    } else if (currentVersionIndex > htmlVersions.length - 1) {
      setCurrentVersionIndex(htmlVersions.length - 1);
    } else if (currentVersionIndex === htmlVersions.length - 2) {
      // If a new version is added, jump to the latest
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

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen]);

  useEffect(() => {
    if (!isModalOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsModalOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {htmlContent && (
        <div className="bg-zinc-50 px-3 py-2 flex items-center gap-2 border-b border-zinc-200">
          {htmlVersions.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPreviousVersion();
                }}
                disabled={!hasPreviousVersion}
                className={`p-1 rounded ${
                  hasPreviousVersion
                    ? "text-zinc-700 hover:bg-zinc-200"
                    : "text-zinc-400 cursor-not-allowed"
                }`}
                title="Previous version"
              >
                <ChevronLeftIcon size={14} />
              </button>
              <span className="mx-1 text-zinc-600 flex items-center gap-1 text-sm">
                {`Version ${versionNumber}`}
                {isDeployed && (
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold border border-green-200">
                    Deployed
                  </span>
                )}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNextVersion();
                }}
                disabled={!hasNextVersion}
                className={`p-1 rounded ${
                  hasNextVersion
                    ? "text-zinc-700 hover:bg-zinc-200"
                    : "text-zinc-400 cursor-not-allowed"
                }`}
                title="Next version"
              >
                <ChevronRightIcon size={14} />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {isDeployed && deployedUrl ? (
              <a
                href={deployedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 px-3 py-1 rounded text-xs font-medium border border-blue-500 text-blue-700 bg-white hover:bg-blue-50 transition-colors flex items-center gap-1"
                title={`View deployed site: ${deployedUrl}`}
                onClick={e => e.stopPropagation()}
              >
                <ExternalLinkIcon size={14} /> See the site
              </a>
            ) : isDeployed && !deployedUrl ? (
              <span className="ml-2 px-3 py-1 rounded text-xs font-medium border border-blue-500 text-blue-700 bg-white flex items-center gap-1 select-none">
                <UploadIcon size={14} className="opacity-60" /> Deployed
              </span>
            ) : !isDeployed && htmlContent ? (
              <button
                onClick={() => onDeploy(htmlContent, currentVersionIndex)}
                disabled={isUploading || !htmlContent}
                className="ml-2 px-3 py-1 rounded text-xs font-medium border border-blue-500 text-blue-700 bg-white hover:bg-blue-50 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UploadIcon size={14} />
                {isUploading ? "Deploying..." : "Deploy"}
              </button>
            ) : null}
          </div>
        </div>
      )}
      <div
        className="flex-grow overflow-auto relative cursor-pointer group min-h-0"
        onClick={() => setIsModalOpen(true)}
        style={{ minHeight: 0 }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
          <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
            <MaximizeIcon size={14} /> Click to enlarge
          </span>
        </div>
        {htmlContent ? (
          <iframe
            ref={iframeRef}
            srcDoc={safeHtmlContent}
            title="Generated Website Preview Portal"
            sandbox="allow-scripts allow-same-origin"
            width="100%"
            height="100%"
            style={{
              border: "none",
              pointerEvents: "none",
              minHeight: 0,
              height: "100%",
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-zinc-400 text-sm">
            No preview available yet.
          </div>
        )}
        {isPreviewLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center pointer-events-none">
            <span className="text-zinc-700 text-sm font-medium animate-pulse">
              Generating new preview...
            </span>
          </div>
        )}
      </div>
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative bg-white w-full h-full rounded-lg shadow-xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-2 border-b border-zinc-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-700">
                  Website Preview
                </span>
                {htmlVersions.length > 0 && (
                  <div className="flex items-center border-l border-zinc-300 pl-2 ml-2 gap-1">
                    <button
                      onClick={goToPreviousVersion}
                      disabled={!hasPreviousVersion}
                      className={`p-1 rounded ${
                        hasPreviousVersion
                          ? "text-zinc-700 hover:bg-zinc-200"
                          : "text-zinc-400 cursor-not-allowed"
                      }`}
                      title="Previous version"
                    >
                      <ChevronLeftIcon size={16} />
                    </button>
                    <span className="mx-1 text-sm text-zinc-600 flex items-center gap-1">
                      {`Version ${versionNumber}`}
                      {isDeployed && (
                        <span className="ml-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold border border-green-200">
                          Deployed
                        </span>
                      )}
                    </span>
                    <button
                      onClick={goToNextVersion}
                      disabled={!hasNextVersion}
                      className={`p-1 rounded ${
                        hasNextVersion
                          ? "text-zinc-700 hover:bg-zinc-200"
                          : "text-zinc-400 cursor-not-allowed"
                      }`}
                      title="Next version"
                    >
                      <ChevronRightIcon size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-200"
                  aria-label="Close preview"
                >
                  <XIcon size={18} />
                </button>
              </div>
            </div>
            <div className="flex-grow overflow-auto relative">
              {htmlContent ? (
                <iframe
                  ref={modalIframeRef}
                  srcDoc={safeHtmlContent}
                  title="Generated Website Preview Full"
                  sandbox="allow-scripts allow-same-origin"
                  width="100%"
                  height="100%"
                  style={{ border: "none" }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-zinc-400 text-sm">
                  No preview available yet.
                </div>
              )}
              {isPreviewLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center pointer-events-none">
                  <span className="text-zinc-700 text-sm font-medium animate-pulse">
                    Generating new preview...
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebsitePreview;
