"use client";

import { Message } from "@/components/message";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import { Message as MessageType, useChat } from "@ai-sdk/react";
import { ToolInvocation } from "ai"; // Import ToolInvocation from 'ai'
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react"; // Add useEffect
// Removed UsageView and Hub imports
import HtmlViewer from "@/components/html-viewer"; // Import the new viewer
import Link from "next/link";
import { toast } from "sonner"; // Import toast for error messages

export default function Home() {
  // State to hold the latest generated HTML
  const [currentHtml, setCurrentHtml] = useState<string | undefined>(undefined);

  const { messages, input, setInput, handleSubmit, append } = useChat({
    api: "/api/chat",
    // Send the current HTML state along with messages
    body: {
      currentHtml: currentHtml, // Pass current HTML state
    },
    // Add client-side error handling
    onError: (error) => {
      console.error("Chat error:", error); // Log the error for debugging
      toast.error(`An error occurred: ${error.message}`); // Show user-friendly toast
    },
    // Removed incorrect onToolFinish
  });

  // Effect to update currentHtml when a successful tool call result appears in messages
  useEffect(() => {
    // Find the last assistant message
    const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();

    if (lastAssistantMessage?.toolInvocations) {
      // Find the result of the websiteGenerator tool call in the last message
      const websiteToolResult = lastAssistantMessage.toolInvocations.find(
        (toolInvocation) =>
          toolInvocation.toolName === 'websiteGenerator' && toolInvocation.state === 'result'
      );

      if (websiteToolResult && websiteToolResult.state === 'result') {
         // Ensure result is correctly typed before accessing htmlContent
         const resultData = websiteToolResult.result as { htmlContent?: string };
         const newHtml = resultData?.htmlContent;

         // Update state only if the new HTML is valid and different from the current one
         if (typeof newHtml === 'string' && newHtml !== currentHtml) {
            setCurrentHtml(newHtml);
         }
      }
      // TODO: Optionally handle toolInvocation.state === 'error' here as well
    }
  }, [messages, currentHtml]); // Depend on messages and currentHtml

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
    // Use Grid layout on medium screens and up
    <div className="grid md:grid-cols-2 gap-6 h-dvh bg-white"> {/* Removed dark:bg-zinc-900 */}
      {/* Column 1: Chat Interface */}
      <div className="flex flex-col justify-between gap-4 pb-4 md:h-screen"> {/* Adjusted padding */}
        {/* Messages Container */}
        <div
          ref={messagesContainerRef}
          className="flex flex-col gap-3 flex-grow items-center overflow-y-scroll px-4" // Added padding
        >
          {messages.length === 0 && (
            <motion.div className="h-[350px] w-full md:w-[500px] pt-20">
              {/* Update placeholder content */}
              <div className="border rounded-lg p-6 flex flex-col gap-4 text-zinc-500 text-sm border-zinc-200"> {/* Removed dark classes */}
                 <p className="flex flex-row justify-center gap-4 items-center text-zinc-900"> {/* Removed dark class */}
                   {/* Replace icons if desired */}
                   <span>AI Website Generator</span>
                 </p>
                 <p>
                   Start by describing the website you want to build, or try one of the suggestions below.
                 </p>
              </div>
            </motion.div>
          )}
          {messages
            .filter((m) => m.role === 'user' || m.role === 'assistant') // Filter for displayable roles
            .map((m: MessageType) => (
              <div key={m.id} className="flex flex-col items-center w-full max-w-[500px] mx-auto"> {/* Wrapper for message + tool results */}
                {/* Render the main message content */}
                <Message role={m.role as 'user' | 'assistant'} content={m.content} />

                {/* Render tool invocation loading state */}
                {m.toolInvocations?.map((toolInvocation: ToolInvocation) => {
                  const { toolName, toolCallId, state } = toolInvocation;

                  // Render a more prominent loading state for the websiteGenerator tool
                  if (state !== 'result' && toolName === 'websiteGenerator') {
                    return (
                      <div key={toolCallId} className="flex flex-row items-center gap-2 w-full text-sm text-zinc-500 my-2 pl-[34px]"> {/* Removed dark class, Adjusted padding */}
                        {/* Simple Spinner */}
                        <svg className="animate-spin h-4 w-4 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> {/* Adjusted spinner color */}
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Generating website updates...</span>
                      </div>
                    );
                  }
                  // Errors during tool execution are typically handled by the onError callback
                  // or result in an error message within the assistant's content.
                  return null; // Ignore results from other potential tools or states for the loading indicator
                })}

                {/* Render the HTML viewer *inline* only on mobile screens if this assistant message generated HTML */}
                {m.role === 'assistant' && typeof currentHtml === 'string' && m.toolInvocations?.some(t => t.toolName === 'websiteGenerator' && t.state === 'result') && (
                  <div className="w-full max-w-[500px] mx-auto md:hidden mt-2"> {/* Show only on mobile, add margin */}
                    <HtmlViewer htmlContent={currentHtml} />
                  </div>
                )}
              </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions and Form Container */}
        <div className="px-4"> {/* Add padding */}
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
                      await append({
                        role: 'user',
                        content: action.action,
                      });
                    }}
                    className="w-full text-left border border-zinc-200 text-zinc-800 rounded-lg p-2 text-sm hover:bg-zinc-100 transition-colors flex flex-col" /* Removed dark classes */
                  >
                    <span className="font-medium">{action.title}</span>
                    <span className="text-zinc-500"> {/* Removed dark class */}
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
              className="bg-zinc-100 rounded-md px-2 py-1.5 w-full outline-none text-zinc-800 md:max-w-[500px] max-w-[calc(100dvw-32px)] mx-auto" // Removed dark classes, Centered input
              placeholder="Send a message..."
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
              }}
            />
          </form>
        </div>
      </div>

      {/* Column 2: HTML Viewer (Sticky on md+) */}
      <div className="hidden md:flex md:flex-col md:sticky md:top-0 md:h-screen overflow-y-auto p-4 border-l border-zinc-200"> {/* Added flex-col, removed dark border */}
         {typeof currentHtml === 'string' ? ( // Check if currentHtml is a string before rendering
           <div className="flex-grow h-full"> {/* Wrapper to make viewer take full height */}
             <HtmlViewer htmlContent={currentHtml} />
           </div>
         ) : (
           <div className="flex items-center justify-center h-full text-zinc-500 border rounded-md border-zinc-200 bg-zinc-50"> {/* Removed dark classes */}
             Website preview will appear here...
           </div>
         )}
      </div>
    </div>
  );
}
