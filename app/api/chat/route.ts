import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic"; // Import Anthropic for PDF support
import { Message as AIMessage } from "@ai-sdk/react"; // Import Message type
import { streamText } from "ai"; // Removed ToolInvocation import
import { websiteGenerator } from "./tools";

export async function POST(req: Request) {
  console.log("Entering POST /api/chat");
  try {
    // Parse the request body once
    const requestBody = await req.json();
    const {
      messages,
    }: {
      messages: AIMessage[];
    } = requestBody;

    // Check if messages contain PDF attachments
    const hasPdfAttachments = messages.some(message => 
      message.experimental_attachments?.some(
        attachment => attachment.contentType === 'application/pdf'
      )
    );

    // Choose the appropriate model based on attachments
    // OpenAI's GPT-4o can handle images but not PDFs
    // Anthropic's Claude can handle both images and PDFs
    const result = streamText({
      model: hasPdfAttachments
        ? anthropic('claude-3-5-sonnet-20240620')  // Use Claude for PDF support
        : openai('gpt-4o', {
            downloadImages: false, // We're already providing base64 data URLs
          }),
      system: `You are a helpful AI assistant.`,
      messages: messages,
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
