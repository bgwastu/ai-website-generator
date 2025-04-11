import { streamText } from 'ai';
import { google } from '@ai-sdk/google'; // Import Google provider
import { CoreMessage } from 'ai';
import { z } from 'zod';
// Removed generateId import

// Removed Hub interface, state, and old tool schemas

// Define schema for the new website generation tool
const displayWebsiteSchema = z.object({
  htmlContent: z.string().describe('The complete HTML content for the single-page website, including Tailwind and Alpine.js via CDN.'),
});


// Removed incorrect Response import from 'next/server'

export async function POST(req: Request) {
  try {
    const { messages }: { messages: CoreMessage[] } = await req.json();
  const result = streamText({
    // Use Google Gemini model - API key should be automatically picked up from process.env.GOOGLE_GENERATIVE_AI_API_KEY
    model: google("gemini-2.0-flash-001"),
    system: `\
You are an expert web developer AI assistant. Your goal is to help users create single-page websites that are complex and have a lot of interactivity.
Engage in a conversation to understand the user's requirements for the website. Ask clarifying questions until you have enough details. If you can use another data source on public API, use it. Add buttons, links, and other interactive elements to the website.
Once you have sufficient information, generate the complete HTML for a single 'index.html' file.
This HTML file MUST include:
- Font Awesome via CDN (<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" />).
- Tailwind CSS via CDN (<script src="https://cdn.tailwindcss.com"></script>).
- Alpine.js via CDN (<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>).
- Animation library via CDN (<script src="https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js"></script>).
- All necessary HTML structure, content based on the user's requirements, and inline CSS/JS (using Alpine.js for interactivity where appropriate).
When the HTML is ready, call the 'displayWebsite' tool with the complete HTML content. **Do not include the HTML code itself in your text response to the user.** Simply confirm that you are displaying the website.
Start with simple landing pages and gradually increase complexity based on the conversation.
Be conversational and helpful throughout the process.
    `,
    messages,
    tools: {
      displayWebsite: {
        description:
          "Displays the generated single-page website HTML to the user.",
        parameters: displayWebsiteSchema,
        execute: async ({ htmlContent }) => {
          // The tool's purpose is to signal the UI to render the HTML.
          // We just return the content for the client to handle.
          return { htmlContent };
        },
      },
    },
    // onFinish callback for saving chat (implement DB logic here)
    // onFinish: async ({ text, toolCalls, toolResults, finishReason, usage, response }) => {
    //   console.log('Chat finished:', { text, toolCalls, toolResults, finishReason, usage });
    //   // Example: Save final messages to DB
    //   // const finalMessages = [...messages, ...response.messages];
    //   // await saveChatToDb(chatId, finalMessages);
    // },
    // Add onError for server-side logging of stream errors
    onError: (error) => {
      console.error("Error during streamText:", error);
      // Note: We cannot change the response status code here as headers are already sent.
      // The primary purpose here is server-side logging.
    },
  });

  return result.toDataStreamResponse();

  } catch (error) {
    console.error("Error in /api/chat:", error); // Log the error server-side

    // Return a generic error response
    // Note: This won't stream, but helps identify server-side exceptions
    if (error instanceof Error) {
       return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    } else {
       return new Response(JSON.stringify({ error: 'An unknown error occurred' }), { status: 500 });
    }
  }
}