"use client";

import { GlobeIcon } from "lucide-react";
import React, { useState } from "react";
import ImageUpload from "./image-upload";
import WebsitePreview from "./website-preview";
import { Asset } from '@/lib/query';

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
}

const PreviewPane: React.FC<PreviewPaneProps> = ({
  htmlVersions,
  deployedVersionIndex,
  onDeploy,
  isUploading,
  domain,
  isPreviewLoading,
  projectId,
  deployedUrl,
  assets,
}) => {
  const [activeTab, setActiveTab] = useState<"version" | "files">("version");

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
          Your Images
        </button>
      </div>
      {/* Tab Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === "version" ? (
          <WebsitePreview
            htmlVersions={htmlVersions}
            deployedVersionIndex={deployedVersionIndex}
            onDeploy={onDeploy}
            isUploading={isUploading}
            isPreviewLoading={isPreviewLoading}
          />
        ) : (
          <ImageUpload projectId={projectId} deployedUrl={deployedUrl} assets={assets} />
        )}
      </div>
    </div>
  );
};

export default PreviewPane;
