"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  MaximizeIcon,
  Trash2Icon,
  XIcon,
  GlobeIcon,
  UploadIcon,
  FileIcon,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useQuery } from '@tanstack/react-query';

interface HtmlViewerProps {
  htmlContent: string;
  domain: string | null;
  isUploading: boolean;
  onDeploy: () => void;
  uploadResult: { success: boolean; message: string; url?: string; domain?: string } | null;
  isPreviewLoading?: boolean;
  onDelete: (
    domain: string
  ) => Promise<{ success: boolean; message: string }>;
  onDeleteSuccess: () => void;
  currentVersionIndex: number;
  totalVersions: number;
  onPreviousVersion: () => void;
  onNextVersion: () => void;
  deployedVersionIndex: number | null;
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

const useFiles = (domain: string | null, enabled: boolean) => {
  return useQuery({
    queryKey: ['files', domain],
    queryFn: async () => {
      if (!domain) return [];
      const res = await fetch(`/api/deploy/${domain}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.files)) {
        return data.files;
      }
      return [];
    },
    enabled: !!domain && enabled,
  });
};

const HtmlViewer: React.FC<HtmlViewerProps> = ({
  htmlContent,
  domain,
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
  deployedVersionIndex,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const modalIframeRef = useRef<HTMLIFrameElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<"version" | "files">("version");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  // Use React Query for file fetching
  const { data: files = [], isLoading: isFetchingFiles, refetch } = useFiles(domain, activeTab === "files");

  const safeHtmlContent = injectLinkHandler(htmlContent);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !domain) return;
    setIsUploadingFile(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    try {
      await fetch(`/api/deploy/${domain}`, {
        method: "POST",
        body: formData,
      });
      await refetch();
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleDeleteFile = async (filename: string) => {
    if (!domain) return;
    if (!confirm(`Delete file ${filename}?`)) return;
    setDeletingFile(filename);
    try {
      await fetch(`/api/deploy/${domain}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      await refetch();
    } finally {
      setDeletingFile(null);
    }
  };

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
  const isDeployed = deployedVersionIndex === currentVersionIndex;

  return (
    <div className="border border-zinc-200 rounded-md h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2 bg-white">
        <GlobeIcon size={18} className="text-blue-500" />
        <span className="text-sm font-medium text-zinc-700">Website Builder</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-2 bg-white border-b border-zinc-100">
        <button
          className={`px-3 py-1 rounded-t text-sm font-medium focus:outline-none ${activeTab === "version" ? "bg-zinc-50 border-x border-t border-zinc-200 text-blue-700" : "text-zinc-500 hover:text-blue-700"}`}
          onClick={() => setActiveTab("version")}
        >
          Web Preview
        </button>
        <button
          className={`px-3 py-1 rounded-t text-sm font-medium focus:outline-none ${activeTab === "files" ? "bg-zinc-50 border-x border-t border-zinc-200 text-blue-700" : "text-zinc-500 hover:text-blue-700"}`}
          onClick={() => setActiveTab("files")}
        >
          Images
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === "version" ? (
          <>
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
                  <span className="mx-1 text-zinc-600 flex items-center gap-1">
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
              <div className="flex items-center gap-2 ml-auto">
                {domain && uploadResult?.success && uploadResult?.url && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (
                        confirm("Are you sure you want to delete this project?")
                      ) {
                        setIsDeleting(true);
                        const result = await onDelete(domain!);
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
                {!(uploadResult?.success && uploadResult?.url) || !isDeployed ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeploy();
                    }}
                    className="px-2 py-0.5 rounded text-xs bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isUploading || isDeployed || isDeleting}
                    title={
                      isDeployed
                        ? "This version is already deployed"
                        : "Deploy this version"
                    }
                  >
                    {isUploading
                      ? "Uploading..."
                      : isDeployed
                      ? "Deployed"
                      : "Deploy this version"}
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
            <div
              className="flex-grow overflow-auto relative cursor-pointer group min-h-0"
              onClick={openModal}
              style={{ minHeight: 0 }}
            >
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
                style={{ border: "none", pointerEvents: "none", minHeight: 0, height: '100%' }}
                scrolling="auto"
              />
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
                      {domain && uploadResult?.success && uploadResult?.url && (
                        <button
                          onClick={async () => {
                            if (
                              confirm("Are you sure you want to delete this project?")
                            ) {
                              setIsDeleting(true);
                              const result = await onDelete(domain!);
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

                      {!(uploadResult?.success && uploadResult?.url) ||
                      !isDeployed ? (
                        <button
                          onClick={() => onDeploy()}
                          className="px-3 py-1 rounded text-sm bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isUploading || isDeployed || isDeleting}
                          title={
                            isDeployed
                              ? "This version is already deployed"
                              : "Deploy this version"
                          }
                        >
                          {isUploading
                            ? "Uploading..."
                            : isDeployed
                            ? "Deployed"
                            : "Deploy this version"}
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
        ) : (
          <div className="bg-zinc-50 px-3 py-2 border-b border-zinc-200 flex flex-col gap-2 flex-1 min-h-0">
            {isFetchingFiles ? (
              <div className="flex flex-1 flex-col items-center justify-center h-full min-h-[200px]">
                <span className="text-zinc-400 text-sm">Loading files...</span>
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center h-full min-h-[200px]">
                <label className="flex flex-col items-center gap-2 cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleUploadFile}
                    disabled={isUploadingFile}
                    accept="image/*"
                  />
                  <span className={`px-4 py-2 rounded text-base bg-blue-500 text-white flex items-center gap-2 shadow-md ${isUploadingFile ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-600"}`}>
                    <UploadIcon size={20} /> {isUploadingFile ? "Uploading..." : "Upload file"}
                  </span>
                  <span className="text-zinc-400 text-xs mt-2">No files found. Upload a file to get started.</span>
                </label>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-zinc-700 text-sm">Files</span>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleUploadFile}
                      disabled={isUploadingFile}
                      accept="image/*"
                    />
                    <span className={`px-2 py-1 rounded text-xs bg-blue-500 text-white flex items-center gap-1 ${isUploadingFile ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-600"}`}>
                      <UploadIcon size={14} /> {isUploadingFile ? "Uploading..." : "Upload file"}
                    </span>
                  </label>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto" style={{ maxHeight: '100%' }}>
                  <ul className="divide-y divide-zinc-200">
                    {files.map((file: string) => {
                      const fileUrl = domain ? `https://${domain}/${file}` : undefined;
                      const isDeleting = deletingFile === file;
                      return (
                        <li key={file} className={`flex items-center justify-between py-2 transition-opacity ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
                          <div className="flex items-center gap-2">
                            <FileIcon size={14} className="text-zinc-400" />
                            {fileUrl ? (
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-zinc-700 hover:underline text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {file}
                              </a>
                            ) : (
                              <span className="text-zinc-400 text-xs cursor-not-allowed">{file}</span>
                            )}
                          </div>
                          <button
                            className="px-2 py-0.5 rounded text-xs bg-red-500 text-white hover:bg-red-600 flex items-center gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFile(file);
                            }}
                            disabled={isDeleting}
                          >
                            {isDeleting ? (<><Trash2Icon size={12} /> Deleting...</>) : (<><Trash2Icon size={12} /> Delete</>)}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HtmlViewer;
