import { openai } from "@ai-sdk/openai";
import { Message as AIMessage } from "@ai-sdk/react";
import { streamText } from "ai";
import { websiteGenerator } from "./tools/website-generator";

export async function POST(req: Request) {
  try {
    const requestBody = await req.json();
    const {
      messages,
    }: {
      messages: AIMessage[];
    } = requestBody;

    const result = streamText({
      model: openai("gpt-4.1-mini"),
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
      messages: messages,
      maxSteps: 5,
      tools: {
        websiteGenerator,
      },
      onError: (error) => {
        console.error("Error during main streamText:", error);
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("ERROR in POST /api/chat:", error);
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
