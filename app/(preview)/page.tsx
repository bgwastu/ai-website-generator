"use client";

import { Message } from "@/components/message";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import { Message as MessageType, useChat } from "@ai-sdk/react"; // Removed AssistantMessagePart import
// Removed ToolInvocation import
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react"; // Add useCallback
// Removed UsageView and Hub imports
import HtmlViewer from "@/components/html-viewer"; // Import the new viewer
import { toast } from "sonner"; // Import toast for error messages

export default function Home() {
  // State to hold the latest generated HTML
  const [currentHtml, setCurrentHtml] = useState<string | undefined>(undefined);
  
  // State for R2 upload functionality
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string; url?: string } | null>(null);

  // State to track loading status
  const [isLoading, setIsLoading] = useState(false);

  // Upload handler function
  const handleUpload = useCallback(async () => {
    if (!currentHtml) {
      toast.error("No website content to upload");
      return;
    }

    try {
      setIsUploading(true);
      setUploadResult(null);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          htmlContent: currentHtml,
          projectId: projectId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update projectId state with the received ID
        setProjectId(data.projectId);
        
        // Set upload result state
        setUploadResult({
          success: true,
          message: 'Website uploaded successfully!',
          url: data.publicUrl,
        });
        
        // Show success toast with the public URL
        toast.success(
          <div>
            <p>Website uploaded successfully!</p>
            <p className="text-xs mt-1 break-all">
              <a href={data.publicUrl} target="_blank" rel="noopener noreferrer" className="underline">
                {data.publicUrl}
              </a>
            </p>
          </div>
        );
      } else {
        // Handle error response
        setUploadResult({
          success: false,
          message: data.message || 'Upload failed',
        });
        
        toast.error(data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      // Set error result state
      setUploadResult({
        success: false,
        message: error instanceof Error ? error.message : 'Upload failed',
      });
      
      // Show error toast
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [currentHtml, projectId]);

  // Log the current HTML state before making requests
  useEffect(() => {
    console.log("[Frontend] Current HTML state:", currentHtml ? `${currentHtml.substring(0, 100)}...` : 'undefined');
  }, [currentHtml]);

  const { messages, input, setInput, handleSubmit, append, reload, stop } = useChat({
   api: "/api/chat",
   // Send the current HTML state along with messages
   body: {
     currentHtml: currentHtml, // Pass current HTML state
   },
   // Set loading false when the stream finishes or errors
   onFinish: () => {
     setIsLoading(false);
   },
   onError: (error) => {
     console.error("Chat error:", error); // Log the error for debugging
     toast.error(`An error occurred: ${error.message}`); // Show user-friendly toast
     setIsLoading(false); // Also stop loading on error
   },
  });

  // Effect to update currentHtml when a successful tool call result appears in messages
  useEffect(() => {
    console.log("[Frontend] Messages updated, checking for HTML updates...");
    console.log("[Frontend] Current messages count:", messages.length);
    
    // Find the last assistant message
    const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
    
    if (!lastAssistantMessage) {
      console.log("[Frontend] No assistant messages found");
      return;
    }
    
    console.log("[Frontend] Last assistant message parts:", lastAssistantMessage.parts?.length || 0);
    
    // Debug: Log all parts to see their structure
    lastAssistantMessage.parts?.forEach((part, index) => {
      console.log(`[Frontend] Part ${index} type:`, part.type);
      if (part.type === 'tool-invocation') {
        console.log(`[Frontend] Tool invocation details:`, {
          toolName: part.toolInvocation.toolName,
          state: part.toolInvocation.state,
          hasResult: part.toolInvocation.state === 'result' && !!part.toolInvocation.result
        });
      }
    });

    // Iterate through parts of the last assistant message
    lastAssistantMessage?.parts.forEach(part => {
      // Check if the part is a completed tool invocation for 'websiteGenerator'
      if (part.type === 'tool-invocation' && part.toolInvocation.toolName === 'websiteGenerator' && part.toolInvocation.state === 'result') {
        // Ensure result is correctly typed before accessing htmlContent
        // Access result only when state is 'result'
        const resultData = part.toolInvocation.result as { htmlContent?: string };
        const newHtml = resultData?.htmlContent;

        console.log("[Frontend] Found websiteGenerator result:", {
          hasHtmlContent: !!resultData?.htmlContent,
          htmlLength: resultData?.htmlContent?.length || 0,
          preview: resultData?.htmlContent ? `${resultData.htmlContent.substring(0, 100)}...` : 'none'
        });

        // Update state only if the new HTML is valid and different from the current one
        if (typeof newHtml === 'string' && newHtml !== currentHtml) {
          console.log("[Frontend] Updating currentHtml state with new HTML");
          setCurrentHtml(newHtml);
        } else {
          console.log("[Frontend] Not updating HTML:", {
            isString: typeof newHtml === 'string',
            isDifferent: newHtml !== currentHtml
          });
        }
      }
    });
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
                {/* Iterate through message parts to find tool calls */}
                {m.parts?.map((part, index: number) => { // Removed explicit type annotation
                  // Render loading indicator for 'websiteGenerator' tool invocations *without* a result yet
                  // Render loading indicator if state is not 'result' (e.g., 'partial-call', 'calling')
                  if (part.type === 'tool-invocation' && part.toolInvocation.toolName === 'websiteGenerator' && part.toolInvocation.state !== 'result') {
                    return (
                      // Use nested toolCallId for the key
                      <div key={part.toolInvocation.toolCallId || `tool-invocation-${index}`} className="flex flex-row items-center gap-2 w-full text-sm text-zinc-500 my-2 pl-[34px]"> {/* Removed dark class, Adjusted padding */}
                        {/* Simple Spinner */}
                        <svg className="animate-spin h-4 w-4 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> {/* Adjusted spinner color */}
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Generating website...</span> {/* Consistent text with other loaders */}
                      </div>
                    );
                  }
                  // Ignore other part types or completed tool invocations for the loading indicator
                  return null;
                })}

                {/* Render the HTML viewer *inline* only on mobile screens if this assistant message generated HTML */}
                {/* Check if any part is a tool-result from websiteGenerator */}
                {/* Check if any part is a completed tool invocation result from websiteGenerator */}
                {m.role === 'assistant' && typeof currentHtml === 'string' && m.parts?.some(part => part.type === 'tool-invocation' && part.toolInvocation.toolName === 'websiteGenerator' && part.toolInvocation.state === 'result') && (
                  <div className="w-full max-w-[500px] mx-auto md:hidden mt-2"> {/* Show only on mobile, add margin */}
                    <HtmlViewer
                      htmlContent={currentHtml}
                      projectId={projectId}
                      isUploading={isUploading}
                      onUpload={handleUpload}
                      uploadResult={uploadResult}
                      isPreviewLoading={isLoading} // Pass loading state
                    />
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
                     setIsLoading(true); // Set loading true before sending
                     await append({
                       role: 'user',
                       content: action.action,
                     });
                     // No need to set loading false here, onFinish handles it
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
           onSubmit={(e) => {
             e.preventDefault(); // Prevent default form submission
             setIsLoading(true); // Set loading true before sending
             handleSubmit(e); // Call the original handler
             // No need to set loading false here, onFinish handles it
           }}
          >
            <div className="relative w-full md:max-w-[500px]">
              <input
                ref={inputRef}
                className="bg-zinc-100 rounded-md px-2 py-1.5 w-full outline-none text-zinc-800 max-w-[calc(100dvw-32px)] mx-auto disabled:opacity-50 pr-10" // Added padding-right for the spinner
                placeholder="Send a message..." // Removed conditional placeholder
                value={input}
                onChange={(event) => setInput(event.target.value)}
                disabled={isLoading} // Disable input when loading
              />
              
              {/* Loading spinner that appears when isLoading is true */}
              {isLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <svg className="animate-spin h-4 w-4 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Column 2: HTML Viewer (Sticky on md+) */}
      <div className="hidden md:flex md:flex-col md:sticky md:top-0 md:h-screen overflow-y-auto p-4 border-l border-zinc-200"> {/* Added flex-col, removed dark border */}
         {typeof currentHtml === 'string' ? ( // Check if currentHtml is a string before rendering
           <div className="flex-grow h-full"> {/* Wrapper to make viewer take full height */}
             <HtmlViewer
               htmlContent={currentHtml}
               projectId={projectId}
               isUploading={isUploading}
               onUpload={handleUpload}
               uploadResult={uploadResult}
               isPreviewLoading={isLoading} // Pass loading state
             />
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
