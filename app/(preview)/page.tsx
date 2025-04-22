"use client";

import { Chat } from "@/components/chat";
import Input from "@/components/input";
import PreviewPane from "@/components/preview-pane";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronLeft, GlobeIcon, XIcon } from "lucide-react";
import { useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";

export default function Home() {
  const [projectId, setProjectId] = useQueryState("id", {
    history: "push",
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [initialMessage, setInitialMessage] = useState<string | null>(null);

  const queryClient = useQueryClient();

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

  // Handler to pass to PreviewPane
  const handleDeploy = (_html: string, versionIndex: number) => {
    deployMutation.mutate({ versionIndex });
  };

  // Handle landing page submit
  const handleLandingSend = async (value: string) => {
    if (!value.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // Create new project
      const projectRes = await fetch("/api/project", { method: "POST" });
      const { id } = await projectRes.json();
      setProjectId(id);
      setInitialMessage(value);
      setInput("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [showPreviewPane, setShowPreviewPane] = useState(false);

  // Landing page if no projectId
  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen container mx-auto max-w-screen-xl px-4">
        {/* AI Website Generator card at the top */}
        <div className="border rounded-lg p-6 flex flex-col gap-4 text-zinc-500 text-sm border-zinc-200 w-full max-w-xl bg-white shadow-sm mb-4">
          <div className="flex flex-col justify-center gap-4 items-center text-zinc-900">
            <p className="text-lg font-bold">AI Website Generator</p>
            <p className="text-center">
              Start by describing the website you want to build, or try one of
              the suggestions below.
            </p>
          </div>
        </div>
        <div className="w-full flex flex-col items-center">
          <div className="w-full max-w-xl">
            <Input
              value={input}
              onChange={setInput}
              onSend={handleLandingSend}
              loading={loading}
              disabled={loading}
              className="mb-4"
              disableAttachments
            />
          </div>
          {/* Predefined template suggestion buttons */}
          <div className="grid sm:grid-cols-2 gap-2 w-full max-w-xl">
            {[
              {
                title: "Create a",
                label: "portfolio website",
                action: "Create a portfolio website for a photographer",
              },
              {
                title: "Build a",
                label: "landing page for my app",
                action:
                  "Build a landing page for a new mobile app called 'TaskMaster'",
              },
              {
                title: "Generate a",
                label: "simple blog layout",
                action:
                  "Generate a simple blog layout with a header, main content area, and sidebar",
              },
              {
                title: "Design a",
                label: "contact page",
                action:
                  "Design a contact page with a form (name, email, message)",
              },
            ].map((action, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  handleLandingSend(action.action);
                }}
                className="w-full text-left border border-zinc-200 text-zinc-800 rounded-lg p-2 text-sm hover:bg-zinc-100 transition-colors flex flex-col"
                disabled={loading}
              >
                <span className="font-medium">{action.title}</span>
                <span className="text-zinc-500">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
        {error && <div className="text-red-600">{error}</div>}
      </div>
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
          className="fixed z-40 top-4 right-6 md:hidden bg-white text-blue-700 border border-blue-200 rounded-full px-3 py-1 flex items-center gap-1 shadow focus:outline-none text-sm"
          onClick={() => setShowPreviewPane(true)}
          aria-label="Show Preview Pane"
        >
          <ChevronLeft size={18} />
          <span>Preview</span>
        </button>
      )}
      {/* Mobile Preview Pane Drawer */}
      {showPreviewPane && (
        <div className="fixed inset-0 z-50 flex md:hidden">
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
                className="ml-auto bg-zinc-100 hover:bg-zinc-200 rounded-full p-2"
                onClick={() => setShowPreviewPane(false)}
                aria-label="Close Preview Pane"
              >
                <XIcon size={20} />
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
      <motion.div
        layout
        className="flex flex-col md:flex-row h-screen gap-2 pb-4"
      >
        <div className="flex-1 w-full max-w-[600px] mx-auto">
          <Chat
            projectId={projectId}
            initialMessage={initialMessage}
            onPreviewLoadingChange={setIsPreviewLoading}
            initialMessages={project?.messages || []}
            onChatFinished={() =>
              queryClient.invalidateQueries({ queryKey: ["project", projectId] })
            }
          />
        </div>
        {/* Desktop Preview Pane */}
        <div className="hidden md:flex flex-1 flex-col h-full">
          <motion.div
            className="h-full flex-1 flex flex-col"
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* Header for desktop */}
            <div className="flex items-center gap-2 px-4 pt-4 pb-2 bg-white border-b border-zinc-100">
              <GlobeIcon size={18} className="text-blue-500" />
              <span className="text-sm font-medium text-zinc-700">
                Website Builder
              </span>
            </div>
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
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
