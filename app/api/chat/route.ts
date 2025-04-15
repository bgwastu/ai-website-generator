import { openai } from "@ai-sdk/openai";
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

    const result = streamText({
      model: openai("gpt-4o"),
      system: `You are a helpful AI assistant.`,
      messages,
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
