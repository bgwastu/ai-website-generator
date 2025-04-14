import { streamText, tool, generateText, ToolResult, ToolInvocation } from 'ai'; // Added ToolResult and ToolInvocation
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { Message as AIMessage } from '@ai-sdk/react'; // Import Message type


// --- Main Website Generator Tool Schema ---
const websiteGeneratorSchema = z.object({
  currentHtml: z.string().nullable().optional().describe('The current HTML content of the website, if it exists. Can be null if starting fresh.'),
  updateInstructions: z.string().describe('Specific instructions based on the latest user input for how to update the website (e.g., "Update the overview section with this summary", "Change the main title to \'Project Dashboard\'").'),
});

// --- System Prompt for Full HTML Generation ---
const websiteGenerationSystemPrompt = `You are an AI assistant responsible for generating or updating a complete HTML document based on user instructions.
Analyze the 'Update Instructions' and the 'Current HTML' (if provided). If 'Current HTML' is null or empty, generate the initial HTML based *only* on the 'Update Instructions'.
Generate the *complete, updated HTML content* that incorporates the requested changes or creates the initial structure.
Output ONLY the raw, complete, updated HTML string. Do not include any explanations, markdown formatting, or anything other than the HTML code itself. Ensure the output is a valid HTML document starting with <!DOCTYPE html>.

**IMPORTANT RESTRICTIONS:**
*   Do NOT invent dynamic data (prices, stats, news, etc.) unless explicitly provided. Use placeholders like "[Current Price]", "[Market Cap]", "[News Headline 1]" or descriptive text like "Chart loading...". Focus on HTML structure.
*   Do NOT use local image paths (e.g., '/img/...') or invent image URLs. Only use external URLs if relevant and certain they exist, otherwise omit images or use placeholders.
*   When adding JavaScript (\`<script>\` tags), do NOT use \`import\`. Assume libraries (like Chart.js) are globally available via CDN (e.g., \`new Chart(...)\`).`;


export async function POST(req: Request) {
  console.log("Entering POST /api/chat");
  try {
    // Parse the request body once
    const requestBody = await req.json();
    const { messages, currentHtml: requestHtml }: {
      messages: AIMessage[],
      currentHtml?: string
    } = requestBody;

    // console the latest message
    console.log(`[HTML Finder] Latest message: ${messages[messages.length - 1].content}`);

    // Find the last tool_result for 'websiteGenerator' to get the latest HTML
    let latestHtml: string | null = null;
    
    // First, check if currentHtml is provided in the request body
    if (requestHtml) {
        console.log("[HTML Finder] Found HTML in request body");
        latestHtml = requestHtml;
    }
    // If not found in request body, search in messages
    else {
        console.log("[HTML Finder] Searching for HTML in messages");
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            console.log(`[HTML Finder] Checking message index ${i}, role: ${msg.role}`);
            
            // Check for toolInvocations in assistant messages
            if (msg.role === 'assistant' && msg.toolInvocations && Array.isArray(msg.toolInvocations)) {
                console.log(`[HTML Finder] Found assistant message with toolInvocations at index ${i}`);
                
                // Find websiteGenerator tool result
                const websiteGenResult = msg.toolInvocations.find(
                    (tool: ToolInvocation) => tool.toolName === 'websiteGenerator' && tool.state === 'result'
                );
                
                if (websiteGenResult && websiteGenResult.state === 'result') {
                    console.log(`[HTML Finder] Found websiteGenerator result with state 'result'`);
                    
                    // Type assertion for when state is 'result'
                    type ToolResultInvocation = ToolInvocation & {
                        state: 'result';
                        result: any;
                    };
                    
                    const resultData = (websiteGenResult as ToolResultInvocation).result as { htmlContent?: string };
                    if (resultData && resultData.htmlContent) {
                        latestHtml = resultData.htmlContent;
                        console.log(`[HTML Finder] Successfully extracted htmlContent from tool result at index ${i}`);
                        break;
                    }
                }
            }
            
            // We no longer need to check for legacy 'tool' role messages as they're not part of the AIMessage type
            // The HTML state is now properly extracted from toolInvocations in assistant messages
        }
        
        if (!latestHtml) {
           console.log("[HTML Finder] No previous HTML state found in messages.");
       }
    }

    // Check if the latest message is from the user and we have HTML to update
    const latestMessage = messages[messages.length - 1];
    // Removed redundant updatedMessages declaration
    
   // Removed direct tool call logic. All generation/updates will go through streamText and the websiteGenerator tool.
   const updatedMessages = messages; // Use original messages
    
    console.log(`[HTML State] HTML found: ${latestHtml ? 'Yes' : 'No'}, Size: ${latestHtml ? latestHtml.length : 0} chars`);
    
    // Modify the system prompt to include instructions about the HTML
    const systemPrompt = `You are a helpful AI assistant. You can use tools to perform specific tasks, like generating or updating website content based on the conversation.

When asked to create or modify a website, first assess if the request is clear and detailed enough. If the request is ambiguous or lacks necessary details, ask clarifying questions before proceeding or using the 'websiteGenerator' tool.

Once the requirements are clear, use the 'websiteGenerator' tool to perform the task. Explain the changes you are making via the tool. Do not output raw HTML in your main response.

IMPORTANT: When using the websiteGenerator tool, ALWAYS pass the most recent HTML state (if available from previous steps or the request body) as the 'currentHtml' parameter. If no previous HTML exists, pass 'null'. The tool's execute function will handle finding the latest state.

IMPORTANT: When using the websiteGenerator, ensure the AI does not invent dynamic data (like prices, stats, news). It should use clear placeholders (e.g., [Current Price], [Market Cap]) or descriptive text where real data would go.`;
    
    const result = streamText({
      model: anthropic('claude-3-7-sonnet-20250219'), // Model for main chat interaction
      system: systemPrompt,
      messages: updatedMessages, // Use the updated messages array that includes the direct tool call result
      tools: {
        websiteGenerator: tool({
          description: 'Generates or updates the website HTML based on user input and conversation context. Use this tool for all website modifications.',
          parameters: websiteGeneratorSchema,
          execute: async ({ currentHtml, updateInstructions }) => {
            console.log(`[websiteGenerator] Entering execute`);
            console.log(`[websiteGenerator] Received updateInstructions: ${updateInstructions}`);
            console.log(`[websiteGenerator] currentHtml parameter: ${currentHtml ? 'provided' : 'not provided'}`);
            console.log(`[websiteGenerator] latestHtml from state: ${latestHtml ? 'found' : 'not found'}`);
            
            // Force use of latestHtml if currentHtml is not provided but latestHtml exists
            if (!currentHtml && latestHtml) {
                console.log(`[websiteGenerator] Overriding currentHtml with latestHtml from state`);
                currentHtml = latestHtml;
            }
            
            // Use 'let' so it can be reassigned by the sub-tool execute functions
           // Determine the HTML to use: parameter first, then state, then null
           let workingHtml: string | null = null;
           if (currentHtml) {
               workingHtml = currentHtml;
               console.log(`[websiteGenerator] Using HTML from tool parameter.`);
           } else if (latestHtml) {
               workingHtml = latestHtml;
               console.log(`[websiteGenerator] Using HTML from latestHtml state.`);
           } else {
               console.log(`[websiteGenerator] No existing HTML found. Will generate from scratch.`);
           }
            console.log(`[websiteGenerator] Starting HTML size: ${workingHtml ? workingHtml.length : 0} chars`);
            console.log(`[websiteGenerator] HTML preview: ${workingHtml ? workingHtml.substring(0, 100) + '...' : 'null'}`);

            try {
                console.log('[websiteGenerator] Initiating direct AI call for full HTML generation...');

                // Directly call generateText, expecting the full HTML as output
                const { text: generatedHtml } = await generateText({
                    model: anthropic('claude-3-7-sonnet-20250219'), // Model specifically for HTML generation task
                    system: websiteGenerationSystemPrompt, // Use the specific system prompt for this task
                   prompt: `Current HTML:
${workingHtml ? `\`\`\`html\n${workingHtml}\n\`\`\`` : 'null (Generate initial HTML based on instructions)'}

Update Instructions: ${updateInstructions}`,
                    // No tools needed here, expecting raw HTML output
                });

                console.log('[websiteGenerator] Direct AI call finished.');

                if (!generatedHtml || typeof generatedHtml !== 'string' || generatedHtml.trim() === '') {
                    console.warn('[websiteGenerator] AI did not return valid HTML content. Returning previous HTML.');
                     // Attempt to clean up potential markdown fences if AI mistakenly added them
                    const cleanedHtml = generatedHtml?.replace(/^```html\s*|\s*```$/g, '').trim();
                    if (cleanedHtml) {
                         console.log(`[websiteGenerator] Cleaned potential markdown. Final size: ${cleanedHtml.length} chars.`);
                         return { htmlContent: cleanedHtml };
                    }
                   // Return original HTML (or null if initial generation failed) if generation failed or was empty
                   return {
                       htmlContent: workingHtml, // Return the input HTML on failure
                       error: 'AI failed to generate valid HTML content.'
                   };
                }

                console.log(`[websiteGenerator] Generated HTML size: ${generatedHtml.length} chars.`);
                console.log(`[websiteGenerator] execute finished. Returning generated HTML.`);
                // The result expected by the client
                return {
                  htmlContent: generatedHtml.trim(),
                };
            } catch (error) {
                 console.error('[websiteGenerator] Error during direct AI call:', error);
                 // Return the HTML as it was before the failed call
                 return {
                    htmlContent: workingHtml, // Return the input HTML on failure
                    error: `Failed to generate HTML: ${error instanceof Error ? error.message : String(error)}`
                };
            }
          },
        }),
      },
      maxSteps: 5, // Allow the main AI to call websiteGenerator multiple times if needed
      onError: (error) => {
        console.error("Error during main streamText:", error);
      },
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error("ERROR in POST /api/chat:", error);
    if (error instanceof Error) {
       return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    } else {
       return new Response(JSON.stringify({ error: 'An unknown error occurred' }), { status: 500 });
    }
  }
}

// Placeholder utils removed, now importing from ./html-utils.ts