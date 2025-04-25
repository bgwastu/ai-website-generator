"use client";

import React, { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UploadIcon, Trash2Icon, ImageIcon, Loader, FileIcon } from "lucide-react";
import { Asset } from '@/lib/query';
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ImageUploadProps {
  projectId: string;
  deployedUrl: string | null;
  assets: Asset[];
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

const ImageUpload: React.FC<ImageUploadProps> = ({ projectId, deployedUrl, assets }) => {
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{url: string, filename: string} | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    setImageLoaded(false);
  }, [selectedImage?.url]);

  const sortedAssets = [...assets].sort((a, b) => {
    const aTimestamp = a.id.split('-')[0];
    const bTimestamp = b.id.split('-')[0];
    return bTimestamp.localeCompare(aTimestamp);
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/project/${projectId}/assets`, {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to upload file");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("File uploaded successfully");
    },
    onError: (error: any) => {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload file. Please try again.");
    },
    onSettled: () => {
      setIsUploadingFile(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const res = await fetch(`/api/project/${projectId}/assets`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete file");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("File deleted successfully");
    },
    onError: (error: any) => {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete file. Please try again.");
    },
    onSettled: () => {
      setDeletingFile(null);
    },
  });

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsUploadingFile(true);
    uploadMutation.mutate(e.target.files[0]);
  };

  const handleDeleteFile = (assetId: string) => {
    if (!confirm(`Delete file?`)) return;
    setDeletingFile(assetId);
    deleteMutation.mutate(assetId);
  };

  const handleDrag = (e: React.DragEvent, active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(active);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files?.length) {
      setIsUploadingFile(true);
      uploadMutation.mutate(e.dataTransfer.files[0]);
    }
  };

  const isImage = (filename: string) => 
    IMAGE_EXTENSIONS.some(ext => filename.toLowerCase().endsWith(ext));

  const getFileUrl = (asset: Asset) => 
    asset.url || (deployedUrl ? `${deployedUrl}/${asset.filename}` : undefined);

  const renderUploadButton = () => (
    <label className={cn("cursor-pointer", isUploadingFile && "opacity-50 cursor-not-allowed")}>
      <input
        type="file"
        className="hidden"
        onChange={handleUploadFile}
        disabled={isUploadingFile}
        accept="image/*"
      />
      <span className="inline-flex items-center gap-1 h-7 text-xs px-2 rounded border border-zinc-200 bg-white hover:bg-zinc-50 font-medium text-zinc-700">
        {isUploadingFile ? (
          <span>Uploading...</span>
        ) : (
          <>
            <UploadIcon size={14} />
            <span>Upload</span>
          </>
        )}
      </span>
    </label>
  );

  const renderEmptyState = () => (
    <div className="p-4 h-full">
      <div className="flex flex-col items-center justify-center h-full p-6 border-2 border-dashed border-zinc-200 rounded-lg">
        <div className="bg-zinc-100 p-4 rounded-full mb-4">
          <ImageIcon size={32} className="text-zinc-400" />
        </div>
        <h3 className="text-zinc-800 font-medium mb-2">No images uploaded yet</h3>
        <p className="text-zinc-500 text-center text-sm mb-4 max-w-md">
          Upload images to use in your website. Drag and drop an image here or click the upload button.
        </p>
        <label className={cn("cursor-pointer", isUploadingFile && "cursor-not-allowed")}>
          <input
            type="file"
            className="hidden"
            onChange={handleUploadFile}
            disabled={isUploadingFile}
            accept="image/*"
          />
          <span className={cn(
            "inline-flex items-center gap-2 bg-zinc-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors",
            isUploadingFile ? "opacity-50" : "hover:bg-zinc-700"
          )}>
            {isUploadingFile ? (
              <>
                <Loader size={16} className="animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <UploadIcon size={16} />
                <span>Select Image</span>
              </>
            )}
          </span>
        </label>
      </div>
    </div>
  );

  const renderFileList = () => (
    <div className={cn("p-2 h-full", isUploadingFile && "opacity-70 pointer-events-none")}>
      <div className="border rounded-md divide-y divide-zinc-100">
        {isUploadingFile && (
          <div className="py-2 px-3 flex items-center gap-2 bg-zinc-50">
            <Loader size={14} className="animate-spin text-zinc-600" />
            <span className="text-sm text-zinc-700">Uploading image...</span>
          </div>
        )}
        
        {sortedAssets.map((asset) => {
          const fileUrl = getFileUrl(asset);
          const isDeleting = deletingFile === asset.id;
          const imageFile = isImage(asset.filename);
          
          return (
            <div 
              key={asset.id} 
              className={cn(
                "group flex items-center justify-between py-2 px-3 hover:bg-zinc-50 transition-colors",
                isDeleting && "opacity-50 pointer-events-none",
                imageFile && fileUrl && "cursor-pointer"
              )}
              onClick={(e) => {
                if (imageFile && fileUrl && !e.defaultPrevented) {
                  setSelectedImage({
                    url: fileUrl,
                    filename: asset.filename
                  });
                }
              }}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <FileIcon size={20} className="flex-shrink-0 text-zinc-400" />
                <span className="text-sm text-zinc-700 truncate">
                  {asset.filename}
                </span>
              </div>
              
              <button
                className={cn(
                  "p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded ml-2 flex-shrink-0",
                  isDeleting && "opacity-50"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteFile(asset.id);
                }}
                disabled={isDeleting}
                title="Delete file"
              >
                <Trash2Icon size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderImagePreview = () => (
    <Dialog 
      open={!!selectedImage} 
      onOpenChange={(open) => {
        if (!open) {
          setSelectedImage(null);
          setImageLoaded(false);
        }
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="pr-10 text-sm">{selectedImage?.filename}</DialogTitle>
        </DialogHeader>
        {selectedImage && (
          <div className="relative w-full max-h-[70vh] overflow-hidden rounded-md border border-zinc-200">
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-50">
                <Loader size={24} className="animate-spin text-zinc-500" />
              </div>
            )}
            
            <div className={cn(!imageLoaded && "opacity-0")}>
              <Image
                src={selectedImage.url}
                alt={selectedImage.filename}
                className="object-contain w-full h-full"
                width={800}
                height={600}
                onLoad={() => setImageLoaded(true)}
                priority
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      <div className="flex flex-col h-full bg-white" ref={containerRef}>
        <div className="bg-zinc-100 border-b border-zinc-200">
          <div className="flex h-9 items-center justify-between px-2">
            <span className="text-xs font-medium text-zinc-700 px-2">Your Images</span>
            {renderUploadButton()}
          </div>
        </div>

        <div 
          className="flex-1 overflow-auto relative"
          onDragOver={(e) => handleDrag(e, true)}
          onDragLeave={(e) => handleDrag(e, false)}
          onDrop={handleDrop}
        >
          {dragActive && (
            <div className="absolute inset-0 bg-zinc-100/90 border-2 border-dashed border-zinc-400 z-20 flex items-center justify-center">
              <div className="flex items-center gap-2 text-zinc-700">
                <UploadIcon size={18} className="text-zinc-600" />
                <p className="text-sm font-medium">Release to upload</p>
              </div>
            </div>
          )}

          {sortedAssets.length === 0 ? renderEmptyState() : renderFileList()}
        </div>
      </div>

      {renderImagePreview()}
    </>
  );
};

export default ImageUpload;
