"use client";

import { Chat } from "@/components/chat";
import PreviewPane from "@/components/preview-pane";
import { Message as MessageType } from "@ai-sdk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useQueryState } from "nuqs";
import { useRef, useState } from "react";
import { toast } from "sonner";


export default function Home() {
  const [projectId, setProjectId] = useQueryState("id");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [initialMessage, setInitialMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
  const handleLandingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // Create new project
      const projectRes = await fetch("/api/project", { method: "POST" });
      const { id } = await projectRes.json();
      setProjectId(id);
      setInitialMessage(input);
      setInput("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Landing page if no projectId
  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <form
          onSubmit={handleLandingSubmit}
          className="flex flex-col gap-4 w-full max-w-md"
        >
          <input
            type="text"
            className="border rounded px-4 py-2"
            placeholder="Describe your website idea..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            ref={inputRef}
          />
          <button
            type="submit"
            className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
            disabled={loading || !input.trim()}
          >
            {loading ? "Creating..." : "Create Website Project"}
          </button>
          {error && <div className="text-red-600">{error}</div>}
        </form>
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
      <motion.div
        layout
        className="flex flex-col md:flex-row h-screen gap-2 pb-4"
      >
        <Chat
          projectId={projectId}
          initialMessage={initialMessage}
          onPreviewLoadingChange={setIsPreviewLoading}
          initialMessages={project?.messages || []}
          onChatFinished={() =>
            queryClient.invalidateQueries({ queryKey: ["project", projectId] })
          }
        />
        <div className="hidden md:flex md:flex-[1.4] flex-col w-[420px] max-w-[40vw] h-full flex-1">
          <motion.div
            className="h-full flex-1 flex flex-col"
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
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
