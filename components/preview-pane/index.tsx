"use client";

import { Asset } from "@/lib/query";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Code, Image as ImageIcon, MonitorSmartphone } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
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
  const [activeTab, setActiveTab] = useState<TabType>("version");
  const [versionIndex, setVersionIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [localHtmlVersions, setLocalHtmlVersions] = useState<string[]>(htmlVersions);
  useEffect(() => {
    setLocalHtmlVersions(htmlVersions);
    if (versionIndex !== null && htmlVersions.length > localHtmlVersions.length) {
      setVersionIndex(htmlVersions.length - 1);
    }
  }, [htmlVersions, localHtmlVersions.length, versionIndex]);
  
  useEffect(() => {
    if (versionIndex === null || versionIndex === undefined) {
      const defaultVersion =
        deployedVersionIndex !== null
          ? deployedVersionIndex
          : htmlVersions.length > 0
          ? htmlVersions.length - 1
          : 0;
      
      setVersionIndex(defaultVersion);
    } else if (htmlVersions.length > 0 && versionIndex >= htmlVersions.length) {
      setVersionIndex(htmlVersions.length - 1);
    }
  }, [htmlVersions.length, versionIndex, deployedVersionIndex]);
  
  // Update version when deployedVersionIndex changes (after deployment)
  useEffect(() => {
    if (deployedVersionIndex !== null) {
      setVersionIndex(deployedVersionIndex);
    }
  }, [deployedVersionIndex]);
  
  // Get safe current version for use in all components
  const currentVersion =
    versionIndex !== null && versionIndex !== undefined ? versionIndex : 0;

  const renderTabButton = useCallback(
    (tab: TabType, icon: React.ReactNode, label: string) => (
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
    ),
    [activeTab]
  );

  const handleSaveCode = useCallback(
    async (html: string, versionIndex: number): Promise<boolean> => {
      if (!projectId) return false;
      try {
        setIsSaving(true);
        const response = await fetch(`/api/project/${projectId}/html`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            html,
            versionIndex,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to save HTML");
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
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ versionIndex }),
          });
          const deployData = await deployRes.json();
          if (!deployRes.ok || !deployData.success) {
            toast.error(deployData.message || "Failed to deploy updated HTML");
            return false;
          }
          toast.success("Code saved and deployed successfully");
        } else {
          toast.success("Code saved successfully");
        }
        return true;
      } catch (error) {
        console.error("Error saving code:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to save code"
        );
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [projectId, localHtmlVersions, deployedVersionIndex, queryClient]
  );

  const handleDeploy = useCallback(
    async (html: string, versionIndex: number) => {
      try {
        // Call the parent-provided deploy function
        onDeploy(html, versionIndex);
      } catch (error) {
        console.error("Error deploying:", error);
        toast.error("Failed to deploy website");
      }
    },
    [onDeploy]
  );
  
  // Version navigation handlers that can be passed to child components
  const handleNextVersion = useCallback(() => {
    if (currentVersion < htmlVersions.length - 1) {
      setVersionIndex(currentVersion + 1);
    }
  }, [currentVersion, htmlVersions.length]);
  
  const handlePrevVersion = useCallback(() => {
    if (currentVersion > 0) {
      setVersionIndex(currentVersion - 1);
    }
  }, [currentVersion]);

  return (
    <div
      className={cn(
        "h-full flex flex-col m-4 ml-2 rounded-lg border border-zinc-200 bg-white",
        className
      )}
    >
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
            currentVersion={currentVersion}
            onNextVersion={handleNextVersion}
            onPrevVersion={handlePrevVersion}
          />
        ) : activeTab === "code" ? (
          <EditCode
            htmlVersions={localHtmlVersions}
            deployedVersionIndex={deployedVersionIndex}
            onSave={handleSaveCode}
            isUploading={isSaving}
            deployedUrl={deployedUrl}
            onDeploy={handleDeploy}
            currentVersion={currentVersion}
            onNextVersion={handleNextVersion}
            onPrevVersion={handlePrevVersion}
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
