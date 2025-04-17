import { z } from "zod";

import { openai } from "@ai-sdk/openai";
import { generateText, tool } from "ai";

const htmlTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Laman.ai - [ADD THE WEBSITE NAME HERE]</title>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script> <!-- Tailwind CSS -->
  <script src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.1/dist/cdn.min.js" defer></script> <!-- Alpine.js -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"> <!-- FontAwesome -->
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script> <!-- Mermaid.js -->
</head>
<body>
  <!-- [YOUR CODE HERE] -->

  <script>
    if (window.mermaid) {
      mermaid.initialize({ startOnLoad: true });
    }
  </script>
</body>
</html>`;

export const websiteGenerator = tool({
  description: `Generates or updates the website HTML based on user input and conversation context. Use this tool for all website modifications.
    
Note:
- ALWAYS ASK FOR THE USER DETAILS BEFORE USING THE 'websiteGenerator' tool.
- You cannot create backend code, only one single page html file.
- When asked to create or modify a website, first assess if the request is clear and detailed enough.
- Share what you want to build with the user BEFORE using the 'websiteGenerator' tool.
- When using the websiteGenerator tool, ALWAYS pass the most recent HTML state as the 'currentHtml' parameter. If no previous HTML exists, pass 'null'. The tool's execute function will handle finding the latest state.
- When you use the websiteGenerator tool to update or generate website HTML, you must always explain and summarize the changes you made to the user, immediately after the HTML is generated. Your explanation should be clear, creative, and conversational, and should help the user understand exactly what was changed or added. Do not skip this step, even if the change seems minor. Do not include raw HTML in your summary.
- This tool uses a multi-step reasoning process: it breaks down complex requests into logical steps, reasons through each, and only then generates the final HTML.`,
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
    status: z
      .enum(["initial", "update"])
      .describe(
        "The status of the website. If you need to start from scratch, set this to 'initial'. If you need to update the website, set this to 'update'."
      ).default("initial"),
    context: z
      .string()
      .describe(
        "Raw content to be displayed on the website, such as extracted text or data from PDFs, documents, or any other source. This content will be used to generate or update the website's sections as needed. MAKE SURE TO INCLUDE ALL THE RAW CONTENT IN THE CONTEXT."
      ).default(""),
  }),
  execute: async ({ currentHtml, updateInstructions, context, status }) => {
    try {
      let result = await generateText({
        model: openai("gpt-4.1-mini"),
        system: `IMPORTANT: You are an expert website generator tool. You must follow these requirements EXACTLY:

- The website you generate MUST be a single-page app (SPA) in ONE complete HTML file. DO NOT split into multiple files. The HTML must be as complete as possible.
- The website must be beautiful, modern, and visually appealing. Use Tailwind CSS for all styling and layouts.
- Use Alpine.js for all interactivity and modals.
- If the website contains data or needs charts, ALWAYS use Chart.js (via CDN) for all charts.
- Use FontAwesome for icons.
- For any diagrams, ALWAYS use Mermaid.js via CDN. DO NOT use any other diagram libraries. Make sure you generate best mermaid code without any errors.
- When adding Mermaid diagrams, ALWAYS use <pre class="mermaid">...</pre> blocks. DO NOT use <script type="module"> or ESM imports for Mermaid. Mermaid is already included and initialized via CDN; you only need to output the correct <pre class="mermaid">...</pre> blocks.
- All Mermaid diagrams MUST be strictly compatible with Mermaid.js version 11.6.0. Double-check for syntax errors and do not use any features not supported in this version.
- DO NOT use SVG for any purpose. SVG is completely banned and must not appear in the HTML, for diagrams, icons, or any other use.
- DO NOT use external images, image URLs, or local image paths. DO NOT use <img> tags or any images.
- DO NOT invent or make up content. Only use what is provided in the context and instructions.
- PRESERVE the existing HTML structure unless a full rebuild is requested.
- If the user asks for changing a section, only change that section.
- DO NOT return with \`\`\`html or \`\`\` in the output.
- When adding JavaScript (<script> tags), do NOT use import. Assume libraries are globally available via CDN.
- The output MUST BE ONLY THE HTML CODE.

You are responsible for generating a complete, beautiful, and functional single-page website in one HTML file, following all the above requirements.

If you cannot proceed due to missing context, return an error message in the <SUMMARY> tag and leave <CODE> empty.`,
        prompt: `${currentHtml ? `Current HTML:\n${currentHtml}` : htmlTemplate}

Here is the update instructions from User:
${updateInstructions}

Here is the context from User:
${context}`,
      });

      if (status === "update") {
        result = await generateText({
          model: openai("gpt-4.1-neno"),
          system: `IMPORTANT: You are an expert website patching tool. You must follow these requirements EXACTLY:

- You are given the current HTML of a single-page website and a user request to update or modify it.
- Your job is to update ONLY the relevant parts of the HTML as requested, preserving all other content, structure, and code from previous HTML
- DO NOT remove or alter unrelated sections.
- Make sure to not remove any existing code, only update the relevant parts based on the instructions.
- The output MUST be FULL HTML code in HTML format without any \`\`\`html or \`\`\` tags.`,
          prompt: `Current HTML:\n${currentHtml}\n\nUpdated HTML:\n${updateInstructions}\n\nUser Instructions:\n${updateInstructions}`,
        });
      }

      return {
        success: true,
        message: "Website updated successfully.",
        htmlContent: result.text,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to generate HTML: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
});
