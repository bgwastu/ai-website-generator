"use client";

import React, { useState } from "react";
import WebsitePreview, { WebsitePreviewProps } from "./website-preview";
import ImageUpload from "./image-upload";
import { GlobeIcon } from "lucide-react";

export interface PreviewPaneProps extends WebsitePreviewProps {
  domain: string | null;
}

const PreviewPane: React.FC<PreviewPaneProps> = (props) => {
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
          <WebsitePreview {...props} />
        ) : (
          <ImageUpload domain={props.domain} />
        )}
      </div>
    </div>
  );
};

export default PreviewPane;
