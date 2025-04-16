import { z } from "zod";

import { openai } from "@ai-sdk/openai";
import { generateText, tool } from "ai";

export const websiteGenerator = tool({
  description: `Generates or updates the website HTML based on user input and conversation context. Use this tool for all website modifications.
    
Note:
- ALWAYS ASK FOR THE USER DETAILS BEFORE USING THE 'websiteGenerator' tool.
- When asked to create or modify a website, first assess if the request is clear and detailed enough.
- Share what you want to build with the user BEFORE using the 'websiteGenerator' tool.
- When using the websiteGenerator tool, ALWAYS pass the most recent HTML state as the 'currentHtml' parameter. If no previous HTML exists, pass 'null'. The tool's execute function will handle finding the latest state.
- When you use the websiteGenerator tool to update or generate website HTML, you must always explain and summarize the changes you made to the user, immediately after the HTML is generated. Your explanation should be clear, creative, and conversational, and should help the user understand exactly what was changed or added. Do not skip this step, even if the change seems minor. Do not include raw HTML in your summary.`,
  parameters: z.object({
    currentHtml: z
      .string()
      .nullable()
      .optional()
      .describe(
        "The current HTML content of the website, if it exists. Can be null if starting fresh."
      ),
    updateInstructions: z
      .string()
      .describe(
        'Specific instructions based on the latest user input for how to update the website (e.g., "Update the overview section with this summary", "Change the main title to \'Project Dashboard\'").'
      ),
    context: z
      .string()
      .describe(
        "Context about the website, including the user's requirements and any relevant information."
      ),
  }),
  execute: async ({ currentHtml, updateInstructions, context }) => {
    console.log("[websiteGenerator] Entering execute");

    try {
      const { text } = await generateText({
        model: openai("gpt-4.1-mini"),
        system: `You are an AI assistant responsible for generating or updating a complete HTML document based on user instructions.

If 'Current HTML' is null or empty, generate the initial HTML based *only* on the 'Update Instructions'.
Generate the *complete, updated HTML content* that incorporates the requested changes or creates the initial structure.


Here is the template for the HTML:
\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Laman.ai - [ADD THE WEBSITE NAME HERE]</title>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script> <!-- Tailwind CSS -->
  <script src="//unpkg.com/alpinejs" defer></script> <!-- Alpine.js -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"> <!-- FontAwesome -->
</head>
<body>
</body>
</html>
\`\`\`

CDN You can use:
- "<script src="path/to/chartjs/dist/chart.umd.js"></script>" for Chart.js

IMPORTANT RESTRICTIONS:
- ALWAYS USE TAILWIND CSS
- ALWAYS USE ALPINE.JS FOR INTERACTIVE ELEMENTS AND MODALS
- ALWAYS USE FONTAWESOME FOR ICONS
- PRESERVE THE EXISTING HTML STRUCTURE unless the user asks for a complete rebuild.
- If the user asks for changing the section, only change the section requested. Do not change other sections or even remove them.
- IF the website containing data, do NOT create your own charts, use Chart.js.
- Do NOT invent dynamic data (prices, stats, news, etc.) unless explicitly provided.
- Do NOT use local image paths (e.g., '/img/...') or invent image URLs. DO NOT USE IMAGES.
- DO NOT RETURN WITH \`\`\`html\`\`\` and \`\`\`\` in the beginning and end of the HTML.
- When adding JavaScript (\`<script>\` tags), do NOT use \`import\`. Assume libraries (like Chart.js) are globally available via CDN (e.g., \`new Chart(...)\`).`,
        prompt: `Current HTML:
${
  currentHtml
    ? `\`\`\`html\n${currentHtml}\n\`\`\``
    : "null (Generate initial HTML based on instructions)"
}

Update Instructions: ${updateInstructions}

Context: ${context}`,
      });

      // Remove code block markers if present (e.g., ```html ... ```)
      let cleanedText = text.trim();
      // Regex to remove leading/trailing ```html or ```
      cleanedText = cleanedText
        .replace(/^```html\s*|^```\s*|\s*```$/gim, "")
        .trim();

      // If the AI did not return valid HTML, return the previous HTML and an error.
      if (
        !cleanedText ||
        typeof cleanedText !== "string" ||
        cleanedText.trim() === ""
      ) {
        console.warn(
          "[websiteGenerator] AI did not return valid HTML content. Returning previous HTML."
        );
        return {
          htmlContent: currentHtml,
          error: "AI failed to generate valid HTML content.",
        };
      }

      // Now generate the summary of changes
      const { text: summaryText } = await generateText({
        model: openai("gpt-4.1-mini"),
        system: `You are an AI assistant that summarizes website changes for the user. Given the previous HTML, the new HTML, and the update instructions, write a clear, concise, and creative summary of what was changed. Do not include raw HTML in your summary.`,
        prompt: `Previous HTML:\n${
          currentHtml ? currentHtml : "(none)"
        }\n\nNew HTML:\n${cleanedText}\n\nUpdate Instructions: ${updateInstructions}`,
      });

      console.log("[websiteGenerator] Returning generated HTML");
      return { htmlContent: cleanedText, summary: summaryText.trim() };
    } catch (error) {
      console.error("[websiteGenerator] Error during direct AI call:", error);
      return {
        htmlContent: currentHtml,
        error: `Failed to generate HTML: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
});
