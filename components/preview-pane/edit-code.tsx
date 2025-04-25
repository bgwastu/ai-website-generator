"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Editor } from "@monaco-editor/react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader,
  RefreshCw,
  Save,
  UploadIcon,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

export interface EditCodeProps {
  htmlVersions: string[];
  deployedVersionIndex: number | null;
  onSave: (html: string, versionIndex: number) => Promise<boolean | void>;
  onViewPreview?: () => void;
  isUploading: boolean;
  deployedUrl: string | null;
  currentVersionIndex?: number;
  onVersionChange?: (versionIndex: number) => void;
  onDeploy?: (html: string, versionIndex: number) => void;
}

const EditCode: React.FC<EditCodeProps> = ({
  htmlVersions,
  deployedVersionIndex,
  onSave,
  onViewPreview,
  isUploading,
  deployedUrl,
  currentVersionIndex: propVersionIndex,
  onVersionChange,
  onDeploy,
}) => {
  const [localVersionIndex, setLocalVersionIndex] = useState(
    propVersionIndex !== undefined
      ? propVersionIndex
      : htmlVersions.length > 0
      ? htmlVersions.length - 1
      : 0
  );
  const [code, setCode] = useState("");
  const [isEdited, setIsEdited] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isCodeLoaded, setIsCodeLoaded] = useState(false);
  const [editorInstance, setEditorInstance] = useState<any>(null);

  // Use either controlled version index from props or local state
  const currentVersionIndex =
    propVersionIndex !== undefined ? propVersionIndex : localVersionIndex;

  // Update version index when prop changes
  useEffect(() => {
    if (propVersionIndex !== undefined) {
      setLocalVersionIndex(propVersionIndex);
    }
  }, [propVersionIndex]);

  // Update code when version changes or htmlVersions changes
  useEffect(() => {
    if (htmlVersions.length > 0 && currentVersionIndex < htmlVersions.length) {
      // Always set code, even if it's an empty string
      const htmlContent = htmlVersions[currentVersionIndex] || "";
      setCode(htmlContent);
      setIsEdited(false);
      setIsCodeLoaded(true);
    } else {
      setIsCodeLoaded(false);
    }
  }, [currentVersionIndex, htmlVersions]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save on Ctrl+S or Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (isEdited && !isUploading) {
          handleSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdited, isUploading, code, currentVersionIndex]);

  const versionNumber = currentVersionIndex + 1;
  const hasPreviousVersion = currentVersionIndex > 0;
  const hasNextVersion = currentVersionIndex < htmlVersions.length - 1;
  const isDeployed = deployedVersionIndex === currentVersionIndex;
  const hasVersions = htmlVersions.length > 0;

  const handleCodeChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
      const currentHtml = htmlVersions[currentVersionIndex] || "";
      setIsEdited(value !== currentHtml);
    }
  };

  const handleSave = async () => {
    const result = await onSave(code, currentVersionIndex);
    if (result !== false) {
      // Update the local copy of the html so isEdited will be false
      const updatedHtmlVersions = [...htmlVersions];
      updatedHtmlVersions[currentVersionIndex] = code;
      setIsEdited(false);
    }
  };

  const handleDeploy = async () => {
    if (!onDeploy) return;

    try {
      setIsDeploying(true);

      // Save first if there are unsaved changes
      if (isEdited) {
        const saveResult = await onSave(code, currentVersionIndex);
        if (saveResult === false) {
          throw new Error("Failed to save before deployment");
        }
        setIsEdited(false);
      }

      // Then deploy
      await onDeploy(code, currentVersionIndex);
    } catch (error) {
      console.error("Error deploying:", error);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleEditorDidMount = (editor: any) => {
    setEditorInstance(editor);
    // Focus the editor when it mounts
    editor.focus();
  };

  const resetChanges = useCallback(() => {
    if (isEdited && !confirm("Discard changes and reload the original code?")) {
      return;
    }
    setCode(htmlVersions[currentVersionIndex] || "");
    setIsEdited(false);
    // Refocus editor after reset
    if (editorInstance) {
      setTimeout(() => editorInstance.focus(), 100);
    }
  }, [isEdited, htmlVersions, currentVersionIndex, editorInstance]);

  const goToPreviousVersion = () => {
    if (
      isEdited &&
      !confirm("You have unsaved changes. Continue without saving?")
    ) {
      return;
    }

    const newIndex =
      currentVersionIndex > 0 ? currentVersionIndex - 1 : currentVersionIndex;

    if (onVersionChange) {
      onVersionChange(newIndex);
    } else {
      setLocalVersionIndex(newIndex);
    }
  };

  const goToNextVersion = () => {
    if (
      isEdited &&
      !confirm("You have unsaved changes. Continue without saving?")
    ) {
      return;
    }

    const newIndex =
      currentVersionIndex < htmlVersions.length - 1
        ? currentVersionIndex + 1
        : currentVersionIndex;

    if (onVersionChange) {
      onVersionChange(newIndex);
    } else {
      setLocalVersionIndex(newIndex);
    }
  };

  const renderIconButton = (
    icon: React.ReactNode,
    onClick: () => void,
    tooltipText: string,
    disabled: boolean = false,
    className: string = ""
  ) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onClick}
            disabled={disabled}
            variant="ghost"
            size="sm"
            className={cn("h-7 w-7 p-0 rounded-sm text-zinc-700", className)}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const renderVersionNavigation = () => (
    <div className="flex items-center">
      <div className="flex items-center">
        {hasVersions &&
          renderIconButton(
            <ChevronLeftIcon size={16} />,
            goToPreviousVersion,
            "Previous version",
            !hasPreviousVersion
          )}

        <div className="flex items-center px-2">
          <span className="text-xs font-medium text-zinc-700">
            {hasVersions
              ? `Version ${versionNumber}${isEdited ? " (Edited)" : ""}`
              : "No versions"}
          </span>
          {isDeployed && !isEdited && (
            <Badge
              variant="outline"
              className="ml-2 h-5 bg-green-50 text-green-700 border-green-200 text-[10px] font-medium"
            >
              Live
            </Badge>
          )}
        </div>

        {hasVersions &&
          renderIconButton(
            <ChevronRightIcon size={16} />,
            goToNextVersion,
            "Next version",
            !hasNextVersion
          )}
      </div>

      {hasVersions && (
        <Button
          onClick={resetChanges}
          disabled={!isEdited}
          variant="outline"
          size="sm"
          className="ml-2 h-7 text-xs py-0 px-2 flex items-center gap-1 border-gray-300"
        >
          <RefreshCw size={14} className="mr-1" />
          Reset
        </Button>
      )}
    </div>
  );

  const renderActionButtons = () => (
    <div className="flex items-center gap-2">
      {isEdited && (
        <Button
          onClick={handleSave}
          disabled={isUploading}
          size="sm"
          className="h-7 text-xs px-2 flex items-center gap-1"
        >
          <Save size={14} className="mr-1" />
          <span>{isUploading ? "Saving..." : "Save"}</span>
          <span className="ml-1 text-xs opacity-60">(⌘S)</span>
        </Button>
      )}

      {!isEdited && !isDeployed && onDeploy && (
        <Button
          onClick={handleDeploy}
          disabled={isDeploying}
          size="sm"
          className="h-7 text-xs px-2 flex items-center gap-1"
        >
          <UploadIcon size={14} className="mr-1" />
          <span>{isDeploying ? "Deploying..." : "Deploy"}</span>
        </Button>
      )}
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] bg-zinc-50 w-full">
      <div className="flex flex-col items-center gap-4 max-w-md p-6 text-center">
        <div className="rounded-full bg-zinc-100 p-4">
          <Loader size={32} className="text-zinc-400" />
        </div>
        <h3 className="text-lg font-medium text-zinc-700">No code available</h3>
        <p className="text-sm text-zinc-500">
          Describe the website you want to build in the chat to generate code.
          Your HTML will appear here once it&apos;s created.
        </p>
      </div>
    </div>
  );

  const renderEditor = () => (
    <div className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage="html"
        language="html"
        value={code}
        onChange={handleCodeChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          wordWrap: "on",
          automaticLayout: true,
        }}
      />
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="bg-zinc-100 border-b border-zinc-200">
        <div className="flex h-9 items-center px-2 justify-between">
          {renderVersionNavigation()}
          {renderActionButtons()}
        </div>
      </div>

      <div className="flex-grow overflow-auto relative min-h-0 bg-white">
        {isCodeLoaded ? renderEditor() : renderEmptyState()}
      </div>
    </div>
  );
};

export default EditCode;
