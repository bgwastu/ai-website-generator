"use client";

import { Chat } from "@/components/chat";
import { AttachmentPreview } from "@/components/input";
import LandingPage from "@/components/landing-page";
import PreviewPane from "@/components/preview-pane";
import { Message as MessageType, useChat } from "@ai-sdk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, GlobeIcon, XIcon } from "lucide-react";
import { useQueryState } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function isPreviewLoadingFromMessages(messages: MessageType[]): boolean {
  if (!messages || messages.length === 0) return false;

  // Check if ANY assistant message has an active 'createWebsite' or 'updateWebsite' tool call
  return messages.some((m) => {
    if (m.role !== "assistant" || !m.parts) return false;

    return m.parts.some((part: any) => {
      return (
        part.type === "tool-invocation" &&
        (part.toolInvocation.toolName === "createWebsite" ||
          part.toolInvocation.toolName === "updateWebsite") &&
        part.toolInvocation.state !== "result"
      );
    });
  });
}

export default function Home() {
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useQueryState("id", {
    history: "push",
  });
  const [landingInput, setLandingInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State to store the pending message when projectId is not available yet
  const [pendingMessage, setPendingMessage] = useState<{
    content: string;
    attachments: AttachmentPreview[];
  } | null>(null);

  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const res = await fetch(`/api/project/${projectId}`);
      if (!res.ok)
        throw new Error((await res.json()).error || "Failed to fetch project");
      return res.json();
    },
    enabled: !!projectId,
    refetchOnWindowFocus: false,
  });

  const htmlVersions = project?.htmlVersions || [];
  const deployedUrl = project?.domain ? `https://${project.domain}` : null;

  const deployMutation = useMutation({
    mutationFn: async ({ versionIndex }: { versionIndex: number }) => {
      if (!projectId) throw new Error("No projectId");
      const res = await fetch(`/api/project/${projectId}/deploy`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionIndex }),
      });
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.message || "Failed to deploy");
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        <div className="flex flex-col gap-1 items-start">
          <span>Website deployed successfully!</span>
          {data.url && (
            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm underline break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {data.url}
            </a>
          )}
        </div>
      );
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to deploy website");
    },
  });

  const {
    messages,
    input: chatInput,
    setInput: setChatInput,
    handleSubmit,
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

      // Save the message to send after projectId is set and useChat is initialized
      setPendingMessage({
        content: value,
        attachments: attachments,
      });

      // Set projectId, which will trigger useChat initialization
      setProjectId(id);
      setLandingInput(""); // Clear landing input after saving the pending message
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [showPreviewPane, setShowPreviewPane] = useState(false);

  // Set initial messages if available
  useEffect(() => {
    if (
      project?.messages &&
      project.messages.length > 0 &&
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
        {
          role: "user",
          content: pendingMessage.content,
        },
        {
          experimental_attachments: pendingMessage.attachments,
        }
      );
      setPendingMessage(null);
    }
  }, [projectId, pendingMessage, append]);

  const isPreviewLoading = useMemo(
    () => isPreviewLoadingFromMessages(messages),
    [messages]
  );
  // Landing page if no projectId
  if (!projectId) {
    return (
      <LandingPage
        input={landingInput}
        setInput={setLandingInput}
        onSend={handleLandingSend}
        loading={loading}
        error={error}
      />
    );
  }

  if (projectLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-lg text-gray-700">Loading project...</div>
      </div>
    );
  }
  if (projectError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-lg text-red-600">{projectError.message}</div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      {/* Floating toggle button for mobile */}
      {!showPreviewPane && (
        <button
          className="fixed z-40 top-4 right-6 lg:hidden bg-white text-blue-700 border border-blue-700 rounded-md px-3 py-1 flex items-center gap-1 shadow focus:outline-none text-sm"
          onClick={() => setShowPreviewPane(true)}
          aria-label="Show Preview Pane"
        >
          <ChevronLeft size={18} />
          <span>Preview</span>
        </button>
      )}
      {/* Mobile Preview Pane Drawer */}
      {showPreviewPane && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowPreviewPane(false)}
          />
          <div className="relative ml-auto w-full max-w-md h-full bg-white shadow-xl flex flex-col">
            {/* Header moved here */}
            <div className="flex items-center gap-2 px-4 pt-4 pb-2 bg-white border-b border-zinc-100">
              <GlobeIcon size={18} className="text-blue-500" />
              <span className="text-sm font-medium text-zinc-700">
                Website Builder
              </span>
              <button
                className="ml-auto bg-zinc-100 hover:bg-zinc-200 rounded-md p-1"
                onClick={() => setShowPreviewPane(false)}
                aria-label="Close Preview Pane"
              >
                <XIcon className="w-5 h-5 text-zinc-800" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <PreviewPane
                htmlVersions={htmlVersions.map(
                  (v: { htmlContent: string }) => v.htmlContent
                )}
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
      )}
      <div className="flex flex-col lg:flex-row h-screen">
        <div className="flex-1 w-full h-full lg:max-w-[600px] flex flex-col">
          <Chat
            messages={messages}
            handleSend={(value, attachments) =>
              append(
                {
                  role: "user",
                  content: value,
                },
                {
                  experimental_attachments: attachments,
                }
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
              htmlVersions={htmlVersions.map(
                (v: { htmlContent: string }) => v.htmlContent
              )}
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
