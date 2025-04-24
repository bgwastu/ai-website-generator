"use client";

import { Asset } from "@/lib/query";
import { cn } from "@/lib/utils";
import { Image as ImageIcon, MonitorSmartphone } from "lucide-react";
import React, { useState } from "react";
import ImageUpload from "./image-upload";
import WebsitePreview from "./website-preview";

export interface PreviewPaneProps {
  htmlVersions: string[];
  deployedVersionIndex: number | null;
  onDeploy: (html: string, versionIndex: number) => void;
  isUploading: boolean;
  domain: string | null;
  isPreviewLoading: boolean;
  projectId: string;
  deployedUrl: string | null;
  assets: Asset[];
  className?: string;
}

const PreviewPane: React.FC<PreviewPaneProps> = ({
  htmlVersions,
  deployedVersionIndex,
  onDeploy,
  isUploading,
  isPreviewLoading,
  projectId,
  deployedUrl,
  assets,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<"version" | "files">("version");

  return (
    <div className={cn("h-full flex flex-col mt-4 mr-4 mb-4 ml-2 rounded-lg border border-zinc-200 bg-white", className)}>
      {/* Main Tabs - App Level */}
      <div className="bg-zinc-50 border-b border-zinc-200 rounded-t-lg">
        <div className="flex h-9 items-center px-2">
          <div className="flex">
            <button
              onClick={() => setActiveTab("version")}
              className={cn(
                "flex h-9 items-center px-3 text-sm font-medium transition-colors border-b-2",
                activeTab === "version"
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-600 hover:text-zinc-900 hover:border-zinc-300"
              )}
              aria-current={activeTab === "version" ? "page" : undefined}
            >
              <MonitorSmartphone size={16} className="mr-1.5" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setActiveTab("files")}
              className={cn(
                "flex h-9 items-center px-3 text-sm font-medium transition-colors border-b-2",
                activeTab === "files"
                  ? "border-zinc-900 text-zinc-900" 
                  : "border-transparent text-zinc-600 hover:text-zinc-900 hover:border-zinc-300"
              )}
              aria-current={activeTab === "files" ? "page" : undefined}
            >
              <ImageIcon size={16} className="mr-1.5"/>
              <span>Your Images</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-auto rounded-b-lg">
        {activeTab === "version" ? (
          <WebsitePreview
            htmlVersions={htmlVersions}
            deployedVersionIndex={deployedVersionIndex}
            onDeploy={onDeploy}
            deployedUrl={deployedUrl}
            isUploading={isUploading}
            isPreviewLoading={isPreviewLoading}
          />
        ) : (
          <ImageUpload
            projectId={projectId}
            deployedUrl={deployedUrl}
            assets={assets}
          />
        )}
      </div>
    </div>
  );
};

export default PreviewPane;
