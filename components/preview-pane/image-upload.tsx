"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { UploadIcon, Trash2Icon, FileIcon } from "lucide-react";

function useFiles(domain: string | null) {
  return useQuery({
    queryKey: ["files", domain],
    queryFn: async () => {
      if (!domain) return [];
      const res = await fetch(`/api/deploy/${domain}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.files)) {
        return data.files;
      }
      return [];
    },
    enabled: !!domain,
  });
}

export interface ImageUploadProps {
  domain: string | null;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ domain }) => {
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const {
    data: files = [],
    isLoading: isFetchingFiles,
    refetch,
  } = useFiles(domain);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !domain) return;
    setIsUploadingFile(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`/api/deploy/${domain}` , {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.message);
      } else {
        await refetch();
      }
    } catch (error) {
      toast.error("Failed to upload file. Please try again.");
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

  return (
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
          <div className="flex-1 min-h-0 overflow-y-auto" style={{ maxHeight: "100%" }}>
            <ul className="divide-y divide-zinc-200">
              {files.map((file: string) => {
                const fileUrl = domain ? `https://${domain}/${file}` : undefined;
                const isDeleting = deletingFile === file;
                return (
                  <li key={file} className={`flex items-center justify-between py-2 transition-opacity ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}>
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
  );
};

export default ImageUpload;
