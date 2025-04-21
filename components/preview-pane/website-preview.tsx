"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  MaximizeIcon,
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
  htmlContent: string;
  isPreviewLoading?: boolean;
  currentVersionIndex: number;
  totalVersions: number;
  onPreviousVersion: () => void;
  onNextVersion: () => void;
  isUploading: boolean;
  onDeploy: () => void;
  uploadResult: { success: boolean; message: string; url?: string; domain?: string } | null;
  deployedVersionIndex: number | null;
}

const WebsitePreview: React.FC<WebsitePreviewProps> = ({
  htmlContent,
  isPreviewLoading = false,
  currentVersionIndex,
  totalVersions,
  onPreviousVersion,
  onNextVersion,
  isUploading,
  onDeploy,
  uploadResult,
  deployedVersionIndex,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const modalIframeRef = useRef<HTMLIFrameElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const safeHtmlContent = injectLinkHandler(htmlContent);

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

  const versionNumber = currentVersionIndex + 1;
  const hasPreviousVersion = currentVersionIndex > 0;
  const hasNextVersion = currentVersionIndex < totalVersions - 1;
  const isDeployed = deployedVersionIndex === currentVersionIndex;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="bg-zinc-50 px-3 py-2 flex items-center gap-2 border-b border-zinc-200">
        {totalVersions > 0 && (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreviousVersion();
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
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNextVersion();
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
            {isDeployed && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold border border-green-200">
                Deployed
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {uploadResult?.success && uploadResult?.url && isDeployed ? (
            <a
              href={uploadResult.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-0.5 rounded text-xs bg-green-500 text-white cursor-pointer hover:bg-green-600 flex items-center gap-1"
              title={`View deployed site: ${uploadResult.url}`}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <ExternalLinkIcon size={12} /> See the site
            </a>
          ) : null}
        </div>
      </div>
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
            scrolling="auto"
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
                {totalVersions > 0 && (
                  <div className="flex items-center border-l border-zinc-300 pl-2 ml-2 gap-1">
                    <button
                      onClick={onPreviousVersion}
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
                      onClick={onNextVersion}
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
