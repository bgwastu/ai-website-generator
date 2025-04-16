"use client";

import { Message } from "@/components/message";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import { Message as MessageType, useChat } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import HtmlViewer from "@/components/html-viewer";
import Image from "next/image";
import { PaperclipIcon, XCircle, RotateCcw, AlertTriangle } from "lucide-react";

// Define the Attachment type
type Attachment = {
  name: string;
  url: string;
  contentType: string;
};

export default function Home() {
  // Add state for the current HTML preview
  const [currentHtml, setCurrentHtml] = useState<string>("");

  // Add state for image attachments
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<
    { id: number; url: string; contentType: string }[]
  >([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Add state for website deployment
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    url?: string;
    projectId?: string;
  } | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  const {
    messages,
    input,
    setInput,
    handleSubmit,
    append,
    status,
    error,
    reload,
  } = useChat({
    api: "/api/chat",
    onError: (error) => {
      console.error("Chat error:", error);
      toast.error(`An error occurred: ${error.message}`);
    },
    // Listen for new assistant messages to update the HTML preview
    onFinish: (message) => {
      // Find HTML in the message (if any)
      let newHtmlContent: string | null = null; // Variable to hold newly found HTML
      if (message.parts) {
        for (const part of message.parts) {
          if (
            part.type === "tool-invocation" &&
            part.toolInvocation.toolName === "websiteGenerator" &&
            part.toolInvocation.state === "result" &&
            part.toolInvocation.result &&
            typeof part.toolInvocation.result.htmlContent === "string"
          ) {
            newHtmlContent = part.toolInvocation.result.htmlContent; // Store the new HTML
            break; // Assuming only one HTML part per message
          }
        }
      }

      // After processing parts, check if we found new HTML
      if (newHtmlContent !== null) {
        // Update state only if new HTML was found
        setCurrentHtml(newHtmlContent);

        // AND check if a project already exists for auto-redeploy
        if (projectId) {
          console.log(
            "New HTML found and project exists, triggering automatic re-deploy..."
          );
          // Call deployWebsite directly, passing the new HTML
          deployWebsite(newHtmlContent);
          // Show a specific toast for automatic updates
          toast.info("Website automatically updated with latest changes.");
        }
      }
    },
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  // Function to deploy the website
  const deployWebsite = async (htmlToDeploy?: string) => {
    // Use provided HTML or fall back to state. Validate that we have content.
    const content = htmlToDeploy || currentHtml;

    // --- DEBUG LOGGING START ---
    console.log("--- Deploy Website Called ---");
    console.log("Value of htmlToDeploy:", htmlToDeploy);
    console.log("Value of currentHtml (state):", currentHtml);
    console.log("Type of currentHtml (state):", typeof currentHtml);
    console.log("Calculated content value:", content);
    console.log("Type of calculated content:", typeof content);
    // --- DEBUG LOGGING END ---

    // Explicit type check before using .trim()
    if (typeof content !== "string") {
      console.error(
        "Deployment error: Content is not a string. Value:",
        content
      );
      toast.error("Cannot deploy: Invalid website content.");
      return;
    }

    // Now we know content is a string, proceed with the trim check
    if (!content || content.trim() === "") {
      toast.error("No website content to deploy");
      return;
    }

    // If called manually (no argument passed), show standard "Deploying..." toast
    if (!htmlToDeploy) {
      toast.info("Deploying website...");
    }
    // For automatic deploys (argument passed), a toast is shown in onFinish

    setIsUploading(true);
    setUploadResult(null); // Clear previous result

    try {
      // Use the new /api/deploy endpoint with POST method
      const response = await fetch("/api/deploy", {
        // Updated endpoint
        method: "POST", // Explicitly POST
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          htmlContent: content, // Use the determined content
          projectId: projectId, // Pass existing projectId if we have one
        }),
      });

      const result = await response.json();
      setUploadResult(result); // Store the entire result object

      if (result.success) {
        // Update projectId if it was newly generated
        if (result.projectId) {
          setProjectId(result.projectId);
        }

        // Define a simple component for the success toast content
        const DeploySuccessToast = ({
          message,
          url,
        }: {
          message: string;
          url?: string;
        }) => (
          <div className="flex flex-col gap-1 items-start">
            <span>{message}</span>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm underline break-all"
                onClick={(e) => e.stopPropagation()} // Prevent toast from closing on link click
              >
                {url}
              </a>
            )}
          </div>
        );

        // Use the component in the toast
        const baseMessage = result.message?.includes("successfully")
          ? result.message.split("URL")[0].trim() // Try to extract base message if URL was part of it
          : "Website deployed successfully!"; // Default base message

        toast.success(
          <DeploySuccessToast message={baseMessage} url={result.url} />
        );
      } else {
        toast.error(result.message || "Failed to deploy website");
      }
    } catch (error) {
      console.error("Deployment error:", error);
      const message =
        error instanceof Error ? error.message : "Error deploying website";
      setUploadResult({ success: false, message }); // Set error result
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  // Function to delete the website
  const deleteWebsite = async (idToDelete: string) => {
    // Basic check
    if (!idToDelete) {
      console.error("deleteWebsite called without a projectId");
      return { success: false, message: "Project ID is missing" };
    }

    // We don't need a separate 'isDeleting' state here as HtmlViewer handles it
    // We just perform the API call and return the result.
    console.log(`Attempting to delete project ID from frontend: ${idToDelete}`);
    try {
      // Use the new /api/deploy endpoint with DELETE method
      const response = await fetch("/api/deploy", {
        // Updated endpoint
        method: "DELETE", // Explicitly DELETE
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId: idToDelete }), // Send projectId in the body
      });

      const result = await response.json();
      console.log("Delete API response:", result);

      if (result.success) {
        // Let the caller handle UI updates (like calling handleDeleteSuccess)
        console.log("Deletion successful according to API");
        // Optionally, clear local state related to the deleted project immediately
        // setProjectId(null);
        // setUploadResult(null);
        // toast.success(result.message || "Website deleted."); // Toast handled by caller
      } else {
        console.error("Deletion failed according to API:", result.message);
        toast.error(result.message || "Failed to delete website");
      }
      return result; // Return the full result object
    } catch (error) {
      console.error("Deletion fetch error:", error);
      const message =
        error instanceof Error ? error.message : "Error deleting website";
      toast.error(message);
      return { success: false, message }; // Return error result
    }
  };

  // Function to handle successful deletion
  const handleDeleteSuccess = () => {
    setProjectId(null);
    setUploadResult(null);
    toast.success("Website deleted successfully");
  };

  // Function to handle file validation
  const validateAndAddFiles = useCallback(
    (files: FileList | File[]) => {
      const validFiles: File[] = [];
      const maxFiles = 5;
      const maxSize = 10 * 1024 * 1024; // 10MB
      const validTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf", // Add PDF support
      ];

      // Check if adding these files would exceed the maximum
      if (attachments.length + files.length > maxFiles) {
        toast.error(`You can only attach up to ${maxFiles} files at once.`);
        return;
      }

      // Validate each file
      Array.from(files).forEach((file) => {
        if (!validTypes.includes(file.type)) {
          toast.error(
            `Invalid file type: ${file.name}. Only images and PDFs are allowed.`
          );
          return;
        }

        if (file.size > maxSize) {
          toast.error(`File too large: ${file.name}. Maximum size is 10MB.`);
          return;
        }

        validFiles.push(file);
      });

      if (validFiles.length > 0) {
        setAttachments((prev) => [...prev, ...validFiles]);

        // Start loading state
        setIsLoadingAttachments(true);

        // Track loading progress
        let loadedCount = 0;
        const totalFiles = validFiles.length;

        // Generate previews for the valid files
        validFiles.forEach((file) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result;
            if (result) {
              setAttachmentPreviews((prev) => [
                ...prev,
                {
                  id: Date.now() + Math.random(), // Unique ID for this preview
                  url: result as string,
                  contentType: file.type,
                },
              ]);
            }

            // Check if all files are loaded
            loadedCount++;
            if (loadedCount === totalFiles) {
              setIsLoadingAttachments(false);
            }
          };

          reader.onerror = () => {
            toast.error(`Failed to read file: ${file.name}`);
            loadedCount++;
            if (loadedCount === totalFiles) {
              setIsLoadingAttachments(false);
            }
          };

          reader.readAsDataURL(file);
        });
      }
    },
    [attachments]
  );

  // Handle paste events
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        e.preventDefault();
        validateAndAddFiles(e.clipboardData.files);
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [validateAndAddFiles]);

  // Handle drag and drop
  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add("drag-over");
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove("drag-over");
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove("drag-over");

      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        validateAndAddFiles(e.dataTransfer.files);
      }
    };

    dropZone.addEventListener("dragover", handleDragOver);
    dropZone.addEventListener("dragleave", handleDragLeave);
    dropZone.addEventListener("drop", handleDrop);

    return () => {
      dropZone.removeEventListener("dragover", handleDragOver);
      dropZone.removeEventListener("dragleave", handleDragLeave);
      dropZone.removeEventListener("drop", handleDrop);
    };
  }, [validateAndAddFiles]);

  // Remove an attachment by index
  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setAttachmentPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Suggestions for quick actions
  const suggestedActions = [
    {
      title: "Create a",
      label: "portfolio website",
      action: "Create a portfolio website for a photographer",
    },
    {
      title: "Build a",
      label: "landing page for my app",
      action: "Build a landing page for a new mobile app called 'TaskMaster'",
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
      action: "Design a contact page with a form (name, email, message)",
    },
  ];

  return (
    <div className="h-screen" ref={dropZoneRef}>
      {/* Responsive layout: stack on mobile, side-by-side on desktop */}
      <div className="flex flex-col md:flex-row h-screen gap-4 pb-4">
        {/* Main chat area */}
        <div className="flex flex-col justify-between flex-1">
          <div
            ref={messagesContainerRef}
            className="flex flex-col flex-grow items-center overflow-y-scroll px-4"
          >
            {messages.length === 0 && (
              <motion.div className="h-[350px] w-full md:w-[600px] pt-20">
                <div className="border rounded-lg p-6 flex flex-col gap-4 text-zinc-500 text-sm border-zinc-200">
                  <p className="flex flex-row justify-center gap-4 items-center text-zinc-900">
                    <span>AI Website Generator</span>
                  </p>
                  <p>
                    Start by describing the website you want to build, or try
                    one of the suggestions below.
                  </p>
                </div>
              </motion.div>
            )}
            {messages
              .filter(
                (m) =>
                  m.role === "user" ||
                  m.role === "assistant" ||
                  m.role === "system"
              )
              .map((m: MessageType, idx, arr) => {
                const isAssistant = m.role === "assistant";
                const isLastAssistant = isAssistant && idx === arr.length - 1;
                const isLoading =
                  isLastAssistant &&
                  (status === "streaming" || status === "submitted");
                let userMessage = undefined;
                if (isLastAssistant) {
                  for (let i = idx - 1; i >= 0; i--) {
                    if (arr[i].role === "user") {
                      userMessage = arr[i].content;
                      break;
                    }
                  }
                }
                // If this is a system error message, render as alert
                if (
                  m.role === "system" &&
                  m.content?.includes("Something went wrong")
                ) {
                  return (
                    <div
                      key={m.id}
                      className="w-full max-w-[500px] mx-auto my-2"
                    >
                      <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-xs flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <span>{m.content}</span>
                        </div>
                        <button
                          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-blue-600 px-2 py-1 rounded transition-colors border border-zinc-200 bg-white dark:bg-zinc-900"
                          onClick={() => reload()}
                          title="Retry"
                        >
                          <RotateCcw className="w-3 h-3" /> Retry
                        </button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div
                    key={m.id}
                    className="flex flex-col items-center w-full max-w-[500px] mx-auto"
                  >
                    {m.content.trim() !== "" && (
                      <Message message={m} isLoading={isLoading} />
                    )}
                  </div>
                );
              })}
            <div ref={messagesEndRef} />
          </div>
          {/* Suggestions and Form Container */}
          <div className="px-4">
            <div className="grid sm:grid-cols-2 gap-2 w-full mx-auto md:max-w-[500px] mb-4">
              {messages.length === 0 &&
                suggestedActions.map((action, index) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.01 * index }}
                    key={index}
                    className={index > 1 ? "hidden sm:block" : "block"}
                  >
                    <button
                      onClick={async () => {
                        // Don't process if we're still loading attachments
                        if (isLoadingAttachments) {
                          toast.error(
                            "Please wait for attachments to finish loading"
                          );
                          return;
                        }

                        append({
                          role: "user",
                          content: action.action,
                        });
                      }}
                      className="w-full text-left border border-zinc-200 text-zinc-800 rounded-lg p-2 text-sm hover:bg-zinc-100 transition-colors flex flex-col"
                      disabled={
                        isLoadingAttachments ||
                        status === "streaming" ||
                        status === "submitted"
                      }
                    >
                      <span className="font-medium">{action.title}</span>
                      <span className="text-zinc-500">{action.label}</span>
                    </button>
                  </motion.div>
                ))}
            </div>
            {/* Responsive HTML preview: show above input on mobile, right on desktop */}
            <div className="block md:hidden mb-4">
              {currentHtml && (
                <HtmlViewer
                  htmlContent={currentHtml}
                  projectId={projectId}
                  isUploading={isUploading}
                  onDeploy={deployWebsite}
                  uploadResult={uploadResult}
                  onDelete={deleteWebsite}
                  onDeleteSuccess={handleDeleteSuccess}
                />
              )}
            </div>

            {/* File attachments preview */}
            {(attachmentPreviews.length > 0 || isLoadingAttachments) && (
              <div className="flex flex-wrap gap-2 mb-2 w-full md:max-w-[500px] mx-auto">
                {/* Loading indicator */}
                {isLoadingAttachments && (
                  <div className="h-16 w-16 rounded-md overflow-hidden border border-zinc-200 flex items-center justify-center bg-zinc-50">
                    <div className="animate-pulse flex flex-col items-center">
                      <svg
                        className="animate-spin h-5 w-5 text-zinc-400"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span className="text-xs mt-1 text-zinc-500">
                        Loading
                      </span>
                    </div>
                  </div>
                )}

                {/* Attachment previews */}
                {attachmentPreviews.map((preview, index) => (
                  <div key={preview.id} className="relative">
                    <div className="h-16 w-16 rounded-md overflow-hidden border border-zinc-200">
                      {preview.contentType.startsWith("image/") ? (
                        <Image
                          src={preview.url}
                          alt={`Attachment ${index + 1}`}
                          width={64}
                          height={64}
                          className="h-full w-full object-cover"
                        />
                      ) : preview.contentType === "application/pdf" ? (
                        <div className="h-full w-full bg-blue-50 flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-600">
                            PDF
                          </span>
                        </div>
                      ) : (
                        <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-500">
                            File
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="absolute -top-2 -right-2 bg-white rounded-full text-red-500"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Before the input form, show error alert and retry button if error is present */}
            {error && (
              <div className="w-full md:max-w-[500px] mx-auto mb-2 flex flex-col items-center">
                <div className="w-full bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span>Something went wrong. Please try again.</span>
                  </div>
                  <button
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-blue-600 px-2 py-1 rounded transition-colors border border-zinc-200 bg-white dark:bg-zinc-900"
                    onClick={() => reload()}
                    title="Retry"
                  >
                    <RotateCcw className="w-4 h-4" /> Retry
                  </button>
                </div>
              </div>
            )}

            <form
              className="flex flex-col gap-2 relative items-center"
              onSubmit={async (e) => {
                e.preventDefault();

                // Don't submit if we're still loading attachments
                if (isLoadingAttachments) {
                  toast.error("Please wait for attachments to finish loading");
                  return;
                }

                if (currentHtml && currentHtml.trim().length > 0) {
                  // If we have HTML context, add it to the input content
                  const contentWithContext =
                    input +
                    `\n\n<context>\n\u0060\u0060\u0060html\n${currentHtml}\n\u0060\u0060\u0060\n</context>`;
                  setInput(contentWithContext);

                  // Use handleSubmit with the context and attachments
                  handleSubmit(e, {
                    experimental_attachments: attachmentPreviews
                      .map((preview, index) => {
                        const file = attachments[index];
                        if (!file) return null;

                        return {
                          name: file.name,
                          url: preview.url,
                          contentType: file.type,
                        };
                      })
                      .filter(
                        (attachment): attachment is Attachment =>
                          attachment !== null
                      ),
                  });

                  // Reset the input to its original value without context
                  setInput("");
                } else {
                  // Normal submission with just attachments
                  handleSubmit(e, {
                    experimental_attachments: attachmentPreviews
                      .map((preview, index) => {
                        const file = attachments[index];
                        if (!file) return null;

                        return {
                          name: file.name,
                          url: preview.url,
                          contentType: file.type,
                        };
                      })
                      .filter(
                        (attachment): attachment is Attachment =>
                          attachment !== null
                      ),
                  });
                }

                // Clear attachments and previews
                setAttachments([]);
                setAttachmentPreviews([]);
              }}
            >
              <div className="relative w-full md:max-w-[500px] flex flex-col items-center gap-2">
                <input
                  ref={inputRef}
                  className="bg-zinc-100 rounded-md px-2 py-1.5 w-full outline-none text-zinc-800 max-w-[calc(100dvw-32px)] mx-auto disabled:opacity-50 pr-10"
                  placeholder={
                    status === "streaming" ||
                    status === "submitted" ||
                    isLoadingAttachments
                      ? isLoadingAttachments
                        ? "Loading attachments..."
                        : "Loading..."
                      : "Send a message..."
                  }
                  disabled={
                    status === "streaming" ||
                    status === "submitted" ||
                    isLoadingAttachments
                  }
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                />
                {/* Loading spinner in input when loading */}
                {(status === "streaming" || status === "submitted") && !isLoadingAttachments && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <svg className="animate-spin h-4 w-4 text-zinc-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
                {/* Attach image button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 ${
                    isLoadingAttachments
                      ? "text-zinc-300 cursor-not-allowed"
                      : "text-zinc-500 hover:text-zinc-700"
                  } ${status === "streaming" || status === "submitted" ? 'right-8' : ''}`}
                  disabled={isLoadingAttachments}
                >
                  <PaperclipIcon className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Drop zone instructions - only visible when dragging */}
            <div className="text-center text-xs text-zinc-500 mt-1 md:max-w-[500px] mx-auto">
              Drag & drop images or PDFs, paste from clipboard, or click the
              paperclip to attach
            </div>
          </div>
        </div>
        {/* Desktop HTML preview area */}
        <div className="hidden md:flex md:flex-[1.4] flex-col w-[420px] max-w-[40vw] h-full mt-4">
          {currentHtml && (
            <HtmlViewer
              htmlContent={currentHtml}
              projectId={projectId}
              isUploading={isUploading}
              onDeploy={deployWebsite}
              uploadResult={uploadResult}
              onDelete={deleteWebsite}
              onDeleteSuccess={handleDeleteSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
}
