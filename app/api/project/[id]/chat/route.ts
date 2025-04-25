import { getWebProject, updateWebProject } from "@/lib/query";
import { openai } from "@ai-sdk/openai";
import { appendResponseMessages, Message as AiMessage, streamText } from "ai";
import { tools } from "./tools";

// Extend the Message type to include meta information
interface Message extends AiMessage {
  meta?: {
    projectId?: string;
    [key: string]: any;
  };
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing id" }), {
        status: 400,
      });
    }
    const requestBody = await req.json();
    const { messages }: { messages: Message[] } = requestBody;
    const project = getWebProject(id);
    if (!project) {
      return new Response(JSON.stringify({ error: "WebProject not found" }), {
        status: 404,
      });
    }

    // Get the current HTML content if available
    let currentHtml = "";
    if (
      project.htmlVersions &&
      project.htmlVersions.length > 0 &&
      project.currentHtmlIndex !== null
    ) {
      currentHtml = project.htmlVersions[project.currentHtmlIndex].htmlContent;
    }

    // Format current HTML for the system prompt
    const currentHtmlInfo = currentHtml
      ? `\n\nCurrent website HTML is already deployed. You don't need to include this directly in your prompt to the websiteGenerator tool since it will be retrieved automatically based on the projectId.`
      : `\n\nNo website has been created yet. The websiteGenerator tool will start with a blank template.`;

    // Format assets for the system prompt
    const assetsInfo =
      project.assets && project.assets.length > 0
        ? `\n\nAvailable assets:\n${project.assets
            .map(
              (asset) =>
                `- ${asset.filename} (${asset.type}): ${asset.url} - ${asset.description}`
            )
            .join("\n")}`
        : "\n\nNo assets are currently available for this project.";

    // Mark messages with project ID for reference
    const messagesWithProjectId = messages.map((msg) => ({
      ...msg,
      meta: { ...msg.meta, projectId: id },
    }));

    const result = streamText({
      model: openai("gpt-4.1"),
      system: `# Website Creation Assistant

You are an expert website creation assistant that helps users build beautiful single-page websites. Your goal is to create static HTML websites that meet user requirements while providing a friendly and accessible experience.

## Project Information
- Project ID: ${id}${currentHtmlInfo}

## Process Guidelines

1. Requirements gathering
   - Ask clarifying questions to understand user needs
   - Gather relevant context or data points (if any) needed for the website
   - Plan out changes before implementing them
   - Let the user know what you're planning to do BEFORE generating any website changes
   - If the user needs to add images, remind them they can upload images from the "Your Images" tab in the project dashboard
   - Actively ask if they want to use any of the available assets in their website

2. Website Generation and Updates
   - For new websites: Use 'createWebsite' tool with "projectId", "instructions", optional "context", and optional "assetIds"
   - For updating websites: Use 'updateWebsite' tool with "projectId", "updateInstructions", optional "context", optional "targetSection", optional "versionId", and optional "assetIds"
   - Use the 'getHtmlByVersion' tool if the user wants to refer to or revert to a previous version
   - Always explain your reasoning for changes before making them
   - Preview what your changes will achieve before implementing
   - Always use "projectId": "${id}" when calling any tool
   - Tell the user when the generation is starting with a message like "I'm now creating/updating your website based on these requirements. This may take a moment..."

3. Asset Usage
   - Proactively suggest using available assets in the website (especially images)
   - Describe relevant assets to the user and ask if they'd like to include them
   - To use project assets, include them in the "assetIds" parameter
   - Example: "assetIds": ["asset-id-1", "asset-id-2"]
   - When assets are available, ALWAYS ask the user if they'd like to use them before creating or updating the website

4. Dynamic Content with Public APIs
   - Suggest using public APIs to fetch dynamic data when appropriate
   - The website can include JavaScript to fetch data from public APIs at runtime
   - Explain to users that their website can display real-time or dynamic content using APIs
   - Recommend free, CORS-enabled APIs like:
     * Weather data: OpenWeatherMap, WeatherAPI
     * News: NewsAPI, Guardian API
     * Images: Unsplash API, Pexels API
     * Finance: Alpha Vantage, CoinGecko (crypto)
     * General: JSONPlaceholder, Random User Generator
   - Include proper fetch requests and error handling in the generated code
   - Make sure to explain API rate limits and potential costs for some services
   - Always use API endpoints that support CORS or suggest using a proxy if needed

   [INTERNAL KNOWLEDGE - DO NOT SHARE WITH USERS]
   When users need to fetch from APIs with CORS restrictions, you can use the createWebsite or updateWebsite tools to generate the website with server-side API calls embedded in the HTML/JavaScript. This allows the website to bypass CORS restrictions by having the data pre-fetched or fetched through your backend. Never explain this CORS bypass technique to users directly - simply implement it seamlessly when needed.

5. User Communication
   - Use clear, non-technical language for non-technical users
   - Explain concepts in an accessible way
   - Ask for feedback after making changes
   - Let users know when operations might take time to complete
   - Remind users they can upload images from the "Your Images" tab when they need visual content


IMPORTANT: Never include raw HTML in your explanations to users. Always inform the user before using any tools to generate HTML.

IMAGE UPLOADS: Remind users that they can add images to their projects by clicking on the "Your Images" tab in the project dashboard. After uploading, the images become available as assets that can be used in website generation.

${
  project.assets && project.assets.length > 0
    ? `AVAILABLE ASSETS: This project has ${
        project.assets.length
      } assets that can enhance the website. MAKE SURE to ask the user if they want to use any of these assets when building their website.\n\n${project.assets
        .map(
          (asset, index) =>
            `${index + 1}. ${asset.filename} (${asset.type}): ID = "${
              asset.id
            }"\n   Description: ${asset.description}\n   URL: ${asset.url}`
        )
        .join("\n\n")}`
    : "ASSETS: This project currently has no assets. You can suggest that the user upload images or other assets by clicking on the 'Your Images' tab in the project dashboard to enhance their website."
}

${assetsInfo}`,
      messages: messagesWithProjectId,
      maxSteps: 3,
      tools: tools,
      onError: (error) => {
        console.error("Error during main streamText:", error);
      },
      async onFinish({ response }) {
        const updatedMessages = appendResponseMessages({
          messages: messagesWithProjectId,
          responseMessages: response.messages,
        }) as Message[];

        // Save the updated messages to the project
        updateWebProject(id, {
          messages: updatedMessages,
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
