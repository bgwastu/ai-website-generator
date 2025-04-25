"use client";

import { Chat } from "@/components/chat";
import { AttachmentPreview } from "@/components/input";
import LandingPage from "@/components/landing-page";
import PreviewPane from "@/components/preview-pane";
import { Message as MessageType, useChat } from "@ai-sdk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, GlobeIcon, Loader, XIcon } from "lucide-react";
import { useQueryState } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Check if website generation is in progress from messages
function isPreviewLoadingFromMessages(messages: MessageType[]): boolean {
  if (!messages?.length) return false;

  return messages.some((m) => 
    m.role === "assistant" && 
    m.parts?.some((part: any) => 
      part.type === "tool-invocation" && 
      ["createWebsite", "updateWebsite"].includes(part.toolInvocation.toolName) && 
      part.toolInvocation.state !== "result"
    )
  );
}

type PendingMessage = {
  content: string;
  attachments: AttachmentPreview[];
} | null;

export default function Home() {
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useQueryState("id", { history: "push" });
  const [landingInput, setLandingInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreviewPane, setShowPreviewPane] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<PendingMessage>(null);
  
  // Fetch project data
  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const res = await fetch(`/api/project/${projectId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch project");
      }
      return res.json();
    },
    enabled: !!projectId,
    refetchOnWindowFocus: false,
  });

  const htmlVersions = project?.htmlVersions || [];
  const deployedUrl = project?.domain ? `https://${project.domain}` : null;

  // Handle website deployment
  const deployMutation = useMutation({
    mutationFn: async ({ versionIndex }: { versionIndex: number }) => {
      if (!projectId) throw new Error("No projectId");
      const res = await fetch(`/api/project/${projectId}/deploy`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionIndex }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to deploy");
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Website deployed successfully!");
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
    onError: (error: any) => {
      console.error("Deploy error:", error);
      toast.error(error.message || "Failed to deploy website");
    },
  });

  // Chat setup
  const {
    messages,
    append,
    status,
    error: chatError,
    reload,
    setMessages,
  } = useChat({
    api: projectId ? `/api/project/${projectId}/chat` : undefined,
    onError: (error) => {
      console.error("Chat error:", error);
      toast.error(`An error occurred: ${error.message}`);
    },
    onFinish: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });

  // Handler to pass to PreviewPane
  const handleDeploy = (_html: string, versionIndex: number) => {
    deployMutation.mutate({ versionIndex });
  };

  // Handle landing page submit
  const handleLandingSend = async (
    value: string,
    attachments: AttachmentPreview[]
  ) => {
    if (!value.trim() && attachments.length === 0) return;
    setLoading(true);
    setError(null);
    
    try {
      // Create new project
      const projectRes = await fetch("/api/project", { method: "POST" });
      const { id } = await projectRes.json();

      // Save pending message
      setPendingMessage({ content: value, attachments });

      // Set projectId, which will trigger useChat initialization
      setProjectId(id);
      setLandingInput(""); 
    } catch (err: any) {
      console.error("Project creation error:", err);
      setError(err.message || "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  // Set initial messages if available
  useEffect(() => {
    if (
      project?.messages?.length > 0 &&
      status !== "streaming" &&
      status !== "submitted"
    ) {
      setMessages(project.messages);
    }
  }, [project?.messages, messages?.length, setMessages, status]);

  // Handle pending message after projectId is set and useChat is initialized
  useEffect(() => {
    if (projectId && pendingMessage) {
      append(
        { role: "user", content: pendingMessage.content },
        { experimental_attachments: pendingMessage.attachments }
      );
      setPendingMessage(null);
    }
  }, [projectId, pendingMessage, append]);

  const isPreviewLoading = useMemo(
    () => isPreviewLoadingFromMessages(messages),
    [messages]
  );

  // Render landing page if no projectId
  if (!projectId) {
    return (
      <LandingPage
        input={landingInput}
        setInput={setLandingInput}
        onSend={handleLandingSend}
        loading={loading}
        error={error}
        className="container mx-auto max-w-screen-md"
      />
    );
  }

  // Render loading state
  if (projectLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader className="w-8 h-8 text-slate-500 animate-spin mb-4" />
        <div className="text-lg font-medium text-gray-700">Loading your project...</div>
      </div>
    );
  }

  // Render error state
  if (projectError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-red-50">
        <div className="text-lg font-medium text-red-600 max-w-md text-center mx-auto">
          {projectError instanceof Error ? projectError.message : "Failed to load project"}
        </div>
      </div>
    );
  }

  const renderMobilePreviewToggle = () => {
    if (showPreviewPane) return null;
    
    return (
      <button
        className="fixed z-40 top-16 -right-1 lg:hidden bg-slate-800 text-white rounded-l-md px-2 py-2 flex items-center"
        onClick={() => setShowPreviewPane(true)}
        aria-label="Show Preview Pane"
      >
        <ChevronLeft size={18} className="mr-1 transform transition-transform" />
      </button>
    );
  };

  const renderMobilePreviewDrawer = () => {
    if (!showPreviewPane) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex lg:hidden pt-12">
        <div 
          className="absolute inset-0 bg-black/40" 
          onClick={() => setShowPreviewPane(false)} 
        />
        <div className="relative ml-auto w-full max-w-md h-full bg-white flex flex-col">
          <div className="flex items-center gap-2 px-3 py-2">
            <GlobeIcon size={16} className="text-zinc-500" />
            <span className="text-xs font-medium text-zinc-700">Website Preview</span>
            <button
              className="ml-auto bg-zinc-100 hover:bg-zinc-200 rounded-md p-1"
              onClick={() => setShowPreviewPane(false)}
              aria-label="Close Preview Pane"
            >
              <XIcon className="w-4 h-4 text-zinc-800" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <PreviewPane
              className="m-0 rounded-none"
              htmlVersions={htmlVersions.map((v: { htmlContent: string }) => v.htmlContent)}
              deployedVersionIndex={project?.currentHtmlIndex ?? null}
              onDeploy={handleDeploy}
              isUploading={deployMutation.isPending}
              domain={deployedUrl}
              isPreviewLoading={isPreviewLoading}
              projectId={projectId as string}
              deployedUrl={deployedUrl}
              assets={project?.assets || []}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header with domain name and back button */}
      <header className="border-b border-zinc-200 bg-white h-12 flex items-center px-4">
        <Button 
          asChild
          variant="ghost" 
          size="sm" 
          className="mr-2 h-8 w-8 p-0"
        >
          <Link href="/">
            <ArrowLeft size={18} />
          </Link>
        </Button>
        <div className="flex items-center gap-1.5">
          <GlobeIcon size={16} className="text-zinc-600" />
          <span className="text-sm font-medium text-zinc-800">
            {project?.domain || `Project ${projectId?.substring(0, 8)}`}
          </span>
        </div>
      </header>

      {renderMobilePreviewToggle()}
      {renderMobilePreviewDrawer()}

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Chat section */}
        <div className="flex-1 w-full h-full lg:max-w-[600px] flex flex-col">
          <Chat
            messages={messages}
            handleSend={(value, attachments) =>
              append(
                { role: "user", content: value },
                { experimental_attachments: attachments }
              )
            }
            status={status}
            error={chatError ?? null}
            reload={reload}
          />
        </div>

        {/* Desktop Preview Pane */}
        <div className="hidden lg:flex flex-1 flex-col h-full">
          <div className="h-full flex-1 flex flex-col">
            <PreviewPane
              htmlVersions={htmlVersions.map((v: { htmlContent: string }) => v.htmlContent)}
              deployedVersionIndex={project?.currentHtmlIndex ?? null}
              onDeploy={handleDeploy}
              isUploading={deployMutation.isPending}
              domain={deployedUrl}
              isPreviewLoading={isPreviewLoading}
              projectId={projectId as string}
              deployedUrl={deployedUrl}
              assets={project?.assets || []}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
