"use client";

import { Asset } from "@/lib/query";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Code, Image as ImageIcon, MonitorSmartphone } from "lucide-react";
import { useQueryState } from "nuqs";
import React, { useCallback, useState } from "react";
import { toast } from "sonner";
import EditCode from "./edit-code";
import ImageUpload from "./image-upload";
import WebsitePreview from "./website-preview";

type TabType = "version" | "files" | "code";

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
  const queryClient = useQueryClient();
  // Use query state for tab since it needs to be preserved in URL
  const [activeTab, setActiveTab] = useQueryState("tab", { defaultValue: "version" as TabType });
  
  // Local state for the current version, shared between preview and editor
  const [currentVersionIndex, setCurrentVersionIndex] = useState(
    htmlVersions.length > 0 ? htmlVersions.length - 1 : 0
  );
  
  // Local state for saving status (just for this component, not for URL)
  const [isSaving, setIsSaving] = useState(false);
  
  // Local state for HTML content (to avoid unnecessary re-renders when using real API)
  const [localHtmlVersions, setLocalHtmlVersions] = useState<string[]>(htmlVersions);

  // Update local HTML versions when prop changes
  React.useEffect(() => {
    setLocalHtmlVersions(htmlVersions);
  }, [htmlVersions]);

  const renderTabButton = useCallback((tab: TabType, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={cn(
        "flex h-9 items-center px-3 text-sm font-medium transition-colors border-b-2",
        activeTab === tab
          ? "border-zinc-900 text-zinc-900"
          : "border-transparent text-zinc-600 hover:text-zinc-900 hover:border-zinc-300"
      )}
      aria-current={activeTab === tab ? "page" : undefined}
    >
      {icon}
      <span>{label}</span>
    </button>
  ), [activeTab, setActiveTab]);

  const handleSaveCode = useCallback(async (html: string, versionIndex: number): Promise<boolean> => {
    if (!projectId) return false;
    try {
      setIsSaving(true);
      const response = await fetch(`/api/project/${projectId}/html`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html,
          versionIndex,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save HTML');
      }
      // Update local version of htmlVersions so the preview will show changes
      const updatedVersions = [...localHtmlVersions];
      updatedVersions[versionIndex] = html;
      setLocalHtmlVersions(updatedVersions);
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      // If the saved version is the deployed version, also call deploy API
      if (deployedVersionIndex === versionIndex) {
        const deployRes = await fetch(`/api/project/${projectId}/deploy`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ versionIndex }),
        });
        const deployData = await deployRes.json();
        if (!deployRes.ok || !deployData.success) {
          toast.error(deployData.message || 'Failed to deploy updated HTML');
          return false;
        }
        toast.success('Code saved and deployed successfully');
      } else {
        toast.success('Code saved successfully');
      }
      return true;
    } catch (error) {
      console.error('Error saving code:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save code');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [projectId, localHtmlVersions, deployedVersionIndex, queryClient]);

  const handleDeploy = useCallback(async (html: string, versionIndex: number) => {
    // First make sure the HTML is saved
    if (versionIndex !== currentVersionIndex || html !== localHtmlVersions[versionIndex]) {
      const saveSuccess = await handleSaveCode(html, versionIndex);
      if (!saveSuccess) {
        toast.error('Failed to save before deploying');
        return;
      }
    }
    
    // Then deploy it using the parent-provided deploy function
    onDeploy(html, versionIndex);
  }, [currentVersionIndex, localHtmlVersions, handleSaveCode, onDeploy]);

  const handleVersionChange = useCallback((index: number) => {
    setCurrentVersionIndex(index);
  }, []);

  return (
    <div className={cn(
      "h-full flex flex-col m-4 ml-2 rounded-lg border border-zinc-200 bg-white", 
      className
    )}>
      <div className="bg-zinc-50 border-b border-zinc-200 rounded-t-lg">
        <div className="flex h-9 items-center px-2">
          <div className="flex">
            {renderTabButton(
              "version", 
              <MonitorSmartphone size={16} className="mr-1.5" />, 
              "Preview"
            )}
            {renderTabButton(
              "code", 
              <Code size={16} className="mr-1.5" />, 
              "Code"
            )}
            {renderTabButton(
              "files", 
              <ImageIcon size={16} className="mr-1.5" />, 
              "Your Images"
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto rounded-b-lg">
        {activeTab === "version" ? (
          <WebsitePreview
            htmlVersions={localHtmlVersions}
            deployedVersionIndex={deployedVersionIndex}
            onDeploy={handleDeploy}
            deployedUrl={deployedUrl}
            isUploading={isUploading}
            isPreviewLoading={isPreviewLoading}
            currentVersionIndex={currentVersionIndex}
            onVersionChange={handleVersionChange}
            onViewCode={() => setActiveTab("code")}
          />
        ) : activeTab === "code" ? (
          <EditCode
            htmlVersions={localHtmlVersions}
            deployedVersionIndex={deployedVersionIndex}
            onSave={handleSaveCode}
            isUploading={isSaving}
            deployedUrl={deployedUrl}
            currentVersionIndex={currentVersionIndex}
            onVersionChange={handleVersionChange}
            onDeploy={handleDeploy}
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
