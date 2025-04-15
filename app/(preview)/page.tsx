"use client";

import { Message } from "@/components/message";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import { Message as MessageType, useChat } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { useRef } from "react";
import { toast } from "sonner";

export default function Home() {
  const { messages, input, setInput, handleSubmit, append } =
    useChat({
      api: "/api/chat",
      onError: (error) => {
        console.error("Chat error:", error);
        toast.error(`An error occurred: ${error.message}`);
      },
    });

  const inputRef = useRef<HTMLInputElement>(null);
  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  // Suggestions for quick actions
  const suggestedActions = [
    { title: "Create a", label: "portfolio website", action: "Create a portfolio website for a photographer" },
    { title: "Build a", label: "landing page for my app", action: "Build a landing page for a new mobile app called 'TaskMaster'" },
    { title: "Generate a", label: "simple blog layout", action: "Generate a simple blog layout with a header, main content area, and sidebar" },
    { title: "Design a", label: "contact page", action: "Design a contact page with a form (name, email, message)" },
  ];

  return (
    <div className="container mx-auto h-screen">
      {/* Chat Interface */}
      <div className="flex flex-col justify-between gap-4 pb-4 h-screen">
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
                  Start by describing the website you want to build, or try one
                  of the suggestions below.
                </p>
              </div>
            </motion.div>
          )}
          {messages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m: MessageType) => (
              <div
                key={m.id}
                className="flex flex-col items-center w-full max-w-[500px] mx-auto"
              >
                {/* Render the message, which now handles its own artifact logic */}
                <Message message={m} />
                {/* Render loading indicator for tool invocations (if any) */}
                {m.parts?.map((part, index: number) => {
                  if (
                    part.type === "tool-invocation" &&
                    part.toolInvocation.toolName === "websiteGenerator" &&
                    part.toolInvocation.state !== "result"
                  ) {
                    return (
                      <div
                        key={part.toolInvocation.toolCallId || `tool-invocation-${index}`}
                        className="flex flex-row items-center gap-2 w-full text-sm text-zinc-500 my-2 pl-[34px]"
                      >
                        <svg
                          className="animate-spin h-4 w-4 text-zinc-500"
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
                        <span>Generating website...</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            ))}
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
                      await append({
                        role: "user",
                        content: action.action,
                      });
                    }}
                    className="w-full text-left border border-zinc-200 text-zinc-800 rounded-lg p-2 text-sm hover:bg-zinc-100 transition-colors flex flex-col"
                  >
                    <span className="font-medium">{action.title}</span>
                    <span className="text-zinc-500">{action.label}</span>
                  </button>
                </motion.div>
              ))}
          </div>
          <form
            className="flex flex-col gap-2 relative items-center"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(e);
            }}
          >
            <div className="relative w-full md:max-w-[500px]">
              <input
                ref={inputRef}
                className="bg-zinc-100 rounded-md px-2 py-1.5 w-full outline-none text-zinc-800 max-w-[calc(100dvw-32px)] mx-auto disabled:opacity-50 pr-10"
                placeholder="Send a message..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
