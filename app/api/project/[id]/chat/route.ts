import { openai } from "@ai-sdk/openai";
import { Message } from "ai";
import { streamText, appendResponseMessages } from "ai";
import { websiteGenerator } from "./tools/website-generator";
import {
  getWebProject,
  updateWebProject,
  WebProject,
} from "@/lib/query";
import { deployHtmlToDomain } from '@/lib/domain';

function extractHtml(message: Message): string | undefined {
  if (message.parts) {
    for (const part of message.parts) {
      if (
        part.type === "tool-invocation" &&
        part.toolInvocation.toolName === "websiteGenerator" &&
        part.toolInvocation.state === "result" &&
        part.toolInvocation.result &&
        typeof part.toolInvocation.result.htmlContent === "string"
      ) {
        return part.toolInvocation.result.htmlContent;
      }
    }
  }
  return undefined;
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });
    }
    const requestBody = await req.json();
    const { messages }: { messages: Message[] } = requestBody;
    const project = getWebProject(id);
    if (!project) {
      return new Response(JSON.stringify({ error: "WebProject not found" }), { status: 404 });
    }
    const result = streamText({
      model: openai("gpt-4.1"),
      system: `You are an expert website creation assistant that helps non-technical users build beautiful single-page websites. Follow these guidelines:

1. Website Generation Process:
   - Always use the 'websiteGenerator' tool for HTML creation/modification
   - Never generate HTML directly
   - Only create single-page HTML files - no backend code or multiple pages

2. Communication Style:
   - Use simple, non-technical language
   - Avoid jargon and complex explanations
   - Be clear, concise, and friendly

3. User Interaction Protocol:
   - Always clarify requirements before generating websites
   - Confirm understanding of user requests
   - Share your proposed changes before implementation
   - After generation, provide a clear summary of changes made

4. Technical Requirements:
   - Always pass the latest HTML state to 'websiteGenerator' as 'currentHtml'
   - Use null for new websites
   - Maintain HTML state consistency across generations

5. Change Management:
   - Break complex requests into logical steps
   - Validate each step with the user
   - Document all changes clearly
   - Never include raw HTML in explanations

6. Quality Assurance:
   - Double-check user requirements
   - Ensure generated websites meet expectations
   - Provide creative, user-friendly explanations
   - Maintain a professional yet approachable tone

Remember: Your goal is to create beautiful websites while making the process simple and understandable for non-technical users.`,
      messages,
      maxSteps: 5,
      tools: {
        websiteGenerator,
      },
      onError: (error) => {
        console.error("Error during main streamText:", error);
      },
      async onFinish({ response }) {
        const updatedMessages = appendResponseMessages({
          messages,
          responseMessages: response.messages,
        });
        // Only check the latest message for new HTML
        const latestMessage = updatedMessages[updatedMessages.length - 1];
        const htmlContent = extractHtml(latestMessage);
        let htmlVersions = project.htmlVersions || [];
        let currentHtmlIndex = project.currentHtmlIndex ?? null;
        if (htmlContent) {
          // Add new version
          const newVersion = {
            id: crypto.randomUUID(),
            htmlContent,
            createdAt: new Date().toISOString(),
          };
          htmlVersions = [...htmlVersions, newVersion];
          currentHtmlIndex = htmlVersions.length - 1;

          // Upload to S3 using shared deploy function
          const domain = project.domain || `test-${project.id}.laman.ai`;
          await deployHtmlToDomain(domain, htmlContent);
        }
        updateWebProject(id, {
          messages: updatedMessages,
          htmlVersions,
          currentHtmlIndex,
        });
      },
    });
    return result.toDataStreamResponse();
  } catch (error) {
    console.error("ERROR in POST /api/project/[id]/chat:", error);
    if (error instanceof Error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
      });
    } else {
      return new Response(
        JSON.stringify({ error: "An unknown error occurred" }),
        { status: 500 }
      );
    }
  }
} 