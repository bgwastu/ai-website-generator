"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  MaximizeIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface HtmlViewerProps {
  htmlContent: string;
  projectId: string | null;
  isUploading: boolean;
  onDeploy: () => void;
  uploadResult: { success: boolean; message: string; url?: string } | null;
  isPreviewLoading?: boolean;
  onDelete: (
    projectId: string
  ) => Promise<{ success: boolean; message: string }>;
  onDeleteSuccess: () => void;
  currentVersionIndex: number;
  totalVersions: number;
  onPreviousVersion: () => void;
  onNextVersion: () => void;
}

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

const HtmlViewer: React.FC<HtmlViewerProps> = ({
  htmlContent,
  projectId,
  isUploading,
  onDeploy,
  uploadResult,
  isPreviewLoading = false,
  onDelete,
  onDeleteSuccess,
  currentVersionIndex,
  totalVersions,
  onPreviousVersion,
  onNextVersion,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const modalIframeRef = useRef<HTMLIFrameElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [portalHeight, setPortalHeight] = useState<string>("100%");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const safeHtmlContent = injectLinkHandler(htmlContent);

  const openModal = () => setIsModalOpen(true);

  const closeModal = () => setIsModalOpen(false);

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
        closeModal();
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
  const hasMultipleVersions = totalVersions > 1;

  return (
    <>
      <div
        className="w-full h-full border rounded-md overflow-hidden border-zinc-200 cursor-pointer group relative flex flex-col"
        onClick={openModal}
      >
        <div className="bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 flex-shrink-0 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm">Generated Website Preview</span>
            {totalVersions > 0 && (
              <div className="flex items-center border-l border-zinc-300 pl-2 ml-2">
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
                <span className="mx-1 text-zinc-600">
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
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {projectId && uploadResult?.success && uploadResult?.url && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (
                    confirm("Are you sure you want to delete this project?")
                  ) {
                    setIsDeleting(true);
                    setDeleteResult(null);
                    const result = await onDelete(projectId!);
                    setDeleteResult(result);
                    setIsDeleting(false);

                    if (result.success) {
                      onDeleteSuccess();
                    }
                  }
                }}
                className="px-2 py-0.5 rounded text-xs bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                disabled={isDeleting || isUploading}
                title="Delete website"
              >
                <Trash2Icon size={12} />
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            )}

            {!(uploadResult?.success && uploadResult?.url) ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeploy();
                }}
                className="px-2 py-0.5 rounded text-xs bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isUploading || isDeleting}
                title="Deploy website"
              >
                {isUploading ? "Uploading..." : "Deploy"}
              </button>
            ) : (
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
                <ExternalLinkIcon size={12} /> Deployed
              </a>
            )}
          </div>
        </div>

        <div className="flex-grow overflow-auto relative">
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
            <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
              <MaximizeIcon size={14} /> Click to enlarge
            </span>
          </div>
          <iframe
            ref={iframeRef}
            srcDoc={safeHtmlContent}
            title="Generated Website Preview Portal"
            sandbox="allow-scripts allow-same-origin"
            width="100%"
            height="100%"
            style={{ border: "none", pointerEvents: "none" }}
            scrolling="auto"
          />
        </div>

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
          onClick={closeModal}
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
                  <div className="flex items-center border-l border-zinc-300 pl-2 ml-2">
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
                    <span className="mx-1 text-sm text-zinc-600">
                      {`Version ${versionNumber}`}
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
                {projectId && uploadResult?.success && uploadResult?.url && (
                  <button
                    onClick={async () => {
                      if (
                        confirm("Are you sure you want to delete this project?")
                      ) {
                        setIsDeleting(true);
                        setDeleteResult(null);
                        const result = await onDelete(projectId!);
                        setDeleteResult(result);
                        setIsDeleting(false);

                        if (result.success) {
                          onDeleteSuccess();
                          closeModal();
                        }
                      }
                    }}
                    className="px-3 py-1 rounded text-sm bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    disabled={isDeleting || isUploading}
                    title="Delete website"
                  >
                    <Trash2Icon size={14} />
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                )}

                {!(uploadResult?.success && uploadResult?.url) ? (
                  <button
                    onClick={() => onDeploy()}
                    className="px-3 py-1 rounded text-sm bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isUploading || isDeleting}
                    title="Deploy website"
                  >
                    {isUploading ? "Uploading..." : "Deploy"}
                  </button>
                ) : (
                  <a
                    href={uploadResult.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 rounded text-sm bg-green-500 text-white cursor-pointer hover:bg-green-600 flex items-center gap-1"
                    title={`View deployed site: ${uploadResult.url}`}
                  >
                    <ExternalLinkIcon size={14} /> Deployed
                  </a>
                )}
                <button
                  onClick={closeModal}
                  className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-200"
                  aria-label="Close preview"
                >
                  <XIcon size={18} />
                </button>
              </div>
            </div>

            <div className="flex-grow overflow-auto relative">
              <iframe
                ref={modalIframeRef}
                srcDoc={safeHtmlContent}
                title="Generated Website Preview Full"
                sandbox="allow-scripts allow-same-origin"
                width="100%"
                height="100%"
                style={{ border: "none" }}
              />

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
    </>
  );
};

export default HtmlViewer;
