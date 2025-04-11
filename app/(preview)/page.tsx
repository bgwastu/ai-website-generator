"use client";

import { VercelIcon } from "@/components/icons";
import { Message } from "@/components/message";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import { Message as MessageType, useChat } from "@ai-sdk/react";
import { ToolInvocation } from "ai"; // Import ToolInvocation from 'ai'
import { motion } from "framer-motion";
import { useRef } from "react";
// Removed UsageView and Hub imports
import HtmlViewer from "@/components/html-viewer"; // Import the new viewer
import Link from "next/link";
import { toast } from "sonner"; // Import toast for error messages

export default function Home() {
  const { messages, input, setInput, handleSubmit, append } = useChat({
    api: "/api/chat",
    // Add client-side error handling
    onError: (error) => {
      console.error("Chat error:", error); // Log the error for debugging
      toast.error(`An error occurred: ${error.message}`); // Show user-friendly toast
    },
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  // Update suggested actions for website generation
  const suggestedActions = [
    { title: "Create a", label: "portfolio website", action: "Create a portfolio website for a photographer" },
    { title: "Build a", label: "landing page for my app", action: "Build a landing page for a new mobile app called 'TaskMaster'" },
    { title: "Generate a", label: "simple blog layout", action: "Generate a simple blog layout with a header, main content area, and sidebar" },
    { title: "Design a", label: "contact page", action: "Design a contact page with a form (name, email, message)" },
  ];

  return (
    <div className="flex flex-row justify-center pb-20 h-dvh bg-white dark:bg-zinc-900">
      <div className="flex flex-col justify-between gap-4">
        <div
          ref={messagesContainerRef}
          className="flex flex-col gap-3 h-full w-dvw items-center overflow-y-scroll"
        >
          {messages.length === 0 && (
            <motion.div className="h-[350px] px-4 w-full md:w-[500px] md:px-0 pt-20">
              {/* Update placeholder content */}
              <div className="border rounded-lg p-6 flex flex-col gap-4 text-zinc-500 text-sm dark:text-zinc-400 dark:border-zinc-700">
                 <p className="flex flex-row justify-center gap-4 items-center text-zinc-900 dark:text-zinc-50">
                   {/* Replace icons if desired */}
                   <VercelIcon size={16} />
                   <span>AI Website Generator</span>
                 </p>
                 <p>
                   Start by describing the website you want to build, or try one of the suggestions below.
                 </p>
                 <p>
                   The AI will ask clarifying questions to gather requirements before generating the HTML.
                 </p>
                 <p>
                   Powered by <Link className="text-blue-500 dark:text-blue-400" href="https://sdk.vercel.ai/" target="_blank">Vercel AI SDK</Link> and Google Gemini.
                 </p>
              </div>
            </motion.div>
          )}
          {messages
            .filter((m) => m.role === 'user' || m.role === 'assistant') // Filter for displayable roles
            .map((m: MessageType) => (
              <div key={m.id} className="flex flex-col items-center w-full"> {/* Wrapper for message + tool results */}
                {/* Render the main message content */}
                <Message role={m.role as 'user' | 'assistant'} content={m.content} />

                {/* Render tool invocation results - specifically the HTML viewer */}
                {m.toolInvocations?.map((toolInvocation: ToolInvocation) => {
                  const { toolName, toolCallId, state } = toolInvocation;

                  // Optional: Render loading state for the tool
                  if (state !== 'result' && toolName === 'displayWebsite') {
                     return (
                       <div key={toolCallId} className="flex flex-row gap-4 px-4 w-full md:w-[500px] md:px-0 text-sm text-zinc-500 dark:text-zinc-400">
                         <div className="size-[24px] flex-shrink-0"></div> {/* Spacer */}
                         <div>Generating website preview...</div>
                       </div>
                     );
                  }

                  // Render the HTML viewer when the tool result is available
                  if (state === 'result' && toolName === 'displayWebsite') {
                    const { result } = toolInvocation;
                    const htmlContent = (result as { htmlContent: string }).htmlContent;
                    return (
                      <HtmlViewer key={toolCallId} htmlContent={htmlContent} />
                    );
                  }
                  return null; // Ignore results from other potential tools or states
                })}
              </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="grid sm:grid-cols-2 gap-2 w-full px-4 md:px-0 mx-auto md:max-w-[500px] mb-4">
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
                    await append({
                      role: 'user',
                      content: action.action,
                    });
                  }}
                  className="w-full text-left border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 rounded-lg p-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex flex-col"
                >
                  <span className="font-medium">{action.title}</span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {action.label}
                  </span>
                </button>
              </motion.div>
            ))}
        </div>

        <form
          className="flex flex-col gap-2 relative items-center"
          onSubmit={handleSubmit}
        >
          <input
            ref={inputRef}
            className="bg-zinc-100 rounded-md px-2 py-1.5 w-full outline-none dark:bg-zinc-700 text-zinc-800 dark:text-zinc-300 md:max-w-[500px] max-w-[calc(100dvw-32px)]"
            placeholder="Send a message..."
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
            }}
          />
        </form>
      </div>
    </div>
  );
}
