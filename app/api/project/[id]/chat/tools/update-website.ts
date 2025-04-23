import { z } from "zod";
import { generateText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { getWebProject, addHtmlVersion } from "@/lib/query";
import { deployHtmlToDomain } from "@/lib/domain";

/**
 * Tool for updating an existing website
 */
export const updateWebsite = tool({
  description:
    "Update an existing website based on user requirements and context",
  parameters: z.object({
    projectId: z.string().describe("The ID of the project to update"),
    updateInstructions: z
      .string()
      .describe("Detailed instructions for how to update the website"),
    context: z
      .string()
      .optional()
      .describe(
        "Additional context or data points to use when updating the website"
      ),
    targetSection: z
      .string()
      .optional()
      .describe(
        "Specific section of the website to update (e.g., 'header', 'main content', 'footer')"
      ),
    versionId: z
      .string()
      .optional()
      .describe(
        "Optional specific HTML version to update from, instead of the latest"
      ),
    assetIds: z
      .array(z.string())
      .optional()
      .describe("IDs of assets to use in the update"),
  }),
  execute: async ({
    projectId,
    updateInstructions,
    context = "",
    targetSection,
    versionId,
    assetIds = [],
  }) => {
    try {
      // Get the current project to retrieve the latest HTML
      const project = getWebProject(projectId);
      if (!project) {
        return {
          success: false,
          message: "Project not found",
        };
      }

      // Get the HTML content based on versionId or current version
      let currentHtml = null;
      if (versionId) {
        // Find the specific version
        const targetVersion = project.htmlVersions?.find(
          (v) => v.id === versionId
        );
        if (targetVersion) {
          currentHtml = targetVersion.htmlContent;
        } else {
          return {
            success: false,
            message: `Version with ID ${versionId} not found.`,
          };
        }
      } else if (
        project.htmlVersions &&
        project.htmlVersions.length > 0 &&
        project.currentHtmlIndex !== null
      ) {
        currentHtml =
          project.htmlVersions[project.currentHtmlIndex].htmlContent;
      } else {
        return {
          success: false,
          message:
            "No existing website found to update. Please use createWebsite instead.",
        };
      }

      // Get the assets by ID
      const assets = project.assets || [];
      const selectedAssets =
        assetIds.length > 0
          ? assets.filter((asset) => assetIds.includes(asset.id))
          : [];

      // Format assets for the prompt
      const assetsString =
        selectedAssets.length > 0
          ? `<ASSETS_TO_USE>
${selectedAssets
  .map(
    (asset, index) =>
      `Asset ${index + 1}:
Description: ${asset.description}
URL: ${asset.url}
Type: ${asset.type}`
  )
  .join("\\n")}
</ASSETS_TO_USE>
`
          : "<ASSETS_TO_USE>None</ASSETS_TO_USE>";

      // Format context for the prompt
      const contextString = context
        ? `<ADDITIONAL_CONTEXT>
${context}
</ADDITIONAL_CONTEXT>
`
        : "<ADDITIONAL_CONTEXT>None</ADDITIONAL_CONTEXT>";

      let updatedHtml;

      // If a specific section is targeted, update just that section
      if (targetSection) {
        // Define system prompt for section update
        const sectionSystemPrompt = `<SYSTEM_PROMPT>
You are an expert at updating specific sections of websites using HTML, Tailwind CSS, and **Vue.js** (Global Build via CDN).
Your task is to generate an updated version of the \`${targetSection}\` section based on the provided instructions and context, maintaining accessibility and incorporating Vue transitions for subtle animations.

<TECHNICAL_REQUIREMENTS>
- Generate ONLY the HTML for the specific section requested.
- Use Tailwind CSS for styling.
- Use Vue.js (Options API) for any interactivity within the section. Assume the necessary Vue instance and data/methods exist in the main script.
- Use Vue's \`<transition>\` or \`<transition-group>\` for smooth transitions on dynamic elements *within the section*.
- Output MUST begin with \`<!-- ${targetSection} begin -->\` and end with \`<!-- ${targetSection} end -->\`.
- Do not include any surrounding HTML, \`<script>\` tags, or \`<style>\` tags unless absolutely necessary for the specific element (e.g., a transition style).
</TECHNICAL_REQUIREMENTS>

<VUE_GUIDELINES>
- Write Vue template syntax directly within the HTML.
- Use standard Vue directives like \`v-if\`, \`v-for\`, \`v-bind\` (or shorthand \`:\`), \`v-on\` (or shorthand \`@\`), \`v-model\`.
- Assume data properties and methods referenced (e.g., in \`@click\` or \`v-if\`) are defined in the main Vue instance elsewhere in the full page script.
- Define transition CSS classes if using \`<transition>\` (use a \`<style>\` tag *only* if necessary for the transition itself, placed near the transition element).
</VUE_GUIDELINES>

<ACCESSIBILITY_REQUIREMENTS>
- Ensure all accessibility requirements (semantic HTML, ARIA, alt text, labels, focus management, contrast) are met *within the generated section*.
- Use Vue's binding capabilities (e.g., \`:aria-label\`, \`:alt\`) for dynamic accessibility attributes if needed.
</ACCESSIBILITY_REQUIREMENTS>

<OUTPUT_FORMAT>
- Output only the HTML for the section, including the start/end comments.
- NO markdown formatting or explanations.
- Ensure HTML is valid and complete *for the section*.
</OUTPUT_FORMAT>
</SYSTEM_PROMPT>`;

        // Define user prompt for section update
        const sectionUserPrompt = `<CURRENT_HTML_REFERENCE_ONLY>
${currentHtml}
</CURRENT_HTML_REFERENCE_ONLY>

<UPDATE_INSTRUCTIONS>
${updateInstructions}
</UPDATE_INSTRUCTIONS>
${contextString}
<TARGET_SECTION>${targetSection}</TARGET_SECTION>${assetsString}

Please generate the updated HTML for just the \`${targetSection}\` section, using Vue.js (Options API) for interactivity and transitions, ensuring strong accessibility.`;

        // First, generate the updated section
        const sectionResult = await generateText({
          model: openai("gpt-4.1"),
          system: sectionSystemPrompt,
          prompt: sectionUserPrompt,
        });

        // Define system prompt for stitching
        const stitchSystemPrompt = `<SYSTEM_PROMPT>
You are an expert at precisely updating HTML documents.
Your task is to replace a specific section in the provided HTML document with new HTML content for that section.

<RULES>
1. Find the section marked by HTML comments: \`<!-- ${targetSection} begin -->\` and \`<!-- ${targetSection} end -->\`.
2. Replace **everything** between these comments (inclusive of the comments themselves) with the new section content provided.
3. If the section markers don't exist in the original HTML, try to intelligently find the logical place for the \`${targetSection}\` based on semantic structure (e.g., replace existing \`<header>\`, insert before \`<footer>\`) and insert the new section content (which includes its own markers).
4. **Crucially, do not modify any other part of the HTML document**, especially \`<script>\` tags containing the main Vue.js application logic, unless the update instruction explicitly requires modifying the core Vue app script.
5. Ensure the resulting HTML remains valid.
</RULES>

<OUTPUT_FORMAT>Output ONLY the complete, updated HTML document with no additional explanations or markdown formatting.</OUTPUT_FORMAT>
</SYSTEM_PROMPT>`;

        // Define user prompt for stitching
        const stitchUserPrompt = `<CURRENT_HTML>
${currentHtml}
</CURRENT_HTML>

<NEW_SECTION_CONTENT section="${targetSection}">
${sectionResult.text}
</NEW_SECTION_CONTENT>

Please integrate the new section content into the current HTML, replacing the existing \`${targetSection}\` section marked by comments. Do not modify other parts of the document, especially existing \`<script>\` tags unless absolutely necessary and instructed.`;

        // Now, stitch the updated section into the full HTML using a different model
        const stitchResult = await generateText({
          model: openai("gpt-4.1"),
          system: stitchSystemPrompt,
          prompt: stitchUserPrompt,
        });

        updatedHtml = stitchResult.text;
      } else {
        // If no specific section is targeted, update the entire website
        // Define system prompt for full update
        const fullUpdateSystemPrompt = `<SYSTEM_PROMPT>
You are an expert website updater. You modify existing single-page websites built with HTML, Tailwind CSS, and Vue.js (Global Build via CDN) based on user requirements, ensuring accessibility and incorporating subtle animations with Vue transitions.

<TECHNICAL_REQUIREMENTS>
- Use the existing HTML structure and Vue.js (Options API) application as a base.
- Maintain the overall layout and design language unless instructed otherwise.
- Use Tailwind CSS for styling (already included via CDN).
- Use Vue.js (Options API, Global Build via CDN) for all interactivity modifications.
- Use Vue's \`<transition>\` or \`<transition-group>\` for subtle animations on updated or new dynamic elements.
- **Modify the existing Vue app instance** within the main \`<script>\` tag (data, methods, computed, mounted, etc.) as needed to fulfill the update request. Add new properties/methods or update existing ones.
- Preserve important elements and content unless instructed to change.
- Add/update HTML comments (\`<!-- section name begins -->\` / \`<!-- section name ends -->\`) to mark significantly changed sections.
- Incorporate provided assets appropriately using Vue's data binding if necessary (e.g., \`:src\`).
</TECHNICAL_REQUIREMENTS>

<VUE_GUIDELINES>
- **Modify Existing Instance**: Locate the main \`Vue.createApp({...}).mount('#app')\` call and modify the object passed to \`createApp\`.
- **Options API**: Work within the existing \`data()\`, \`methods\`, \`computed\`, \`mounted()\`, etc., options.
- **Reactivity**: Ensure new or modified data properties are correctly defined within \`data()\` to be reactive.
- **Lifecycle**: Use \`mounted()\` for setup logic (like initializing libraries) related to *new* elements, if needed.
- **Consistency**: Maintain the coding style and structure of the existing Vue script.
- **No Build Step**: Changes must work directly in the browser via CDN.
</VUE_GUIDELINES>

<ACCESSIBILITY_REQUIREMENTS>
- Maintain or **improve** existing accessibility features throughout the update.
- Use semantic HTML, ARIA roles/attributes, sufficient contrast, descriptive alt text (use \`:alt\` for dynamic images), hierarchical headings, keyboard navigation, form labels (use \`:for\` with unique IDs), and visible focus indicators.
- Ensure dynamically updated content remains accessible.
</ACCESSIBILITY_REQUIREMENTS>

<IMPORTANT_GUIDANCE>
- **Respect existing structure and Vue logic.** Only modify what's necessary.
- **Focus on the specific update instructions.** Avoid unnecessary refactoring.
- Maintain consistency with the existing website style and Vue implementation.
</IMPORTANT_GUIDANCE>

<OUTPUT_FORMAT>
- Output ONLY the complete, updated HTML code.
- **NO markdown formatting** or explanations.
- Ensure the output is a single, valid HTML file ready to be viewed.
</OUTPUT_FORMAT>
</SYSTEM_PROMPT>`;

        // Define user prompt for full update
        const fullUpdateUserPrompt = `<CURRENT_HTML>
${currentHtml}
</CURRENT_HTML>

<UPDATE_INSTRUCTIONS>
${updateInstructions}
</UPDATE_INSTRUCTIONS>
${contextString}${assetsString}

Please update the website (HTML structure and the Vue.js script within it) according to these instructions. Maintain the overall structure/design and ensure strong accessibility. Use Vue transitions for subtle animations where appropriate.`;

        const result = await generateText({
          model: openai("gpt-4.1"),
          system: fullUpdateSystemPrompt,
          prompt: fullUpdateUserPrompt,
        });

        updatedHtml = result.text;
      }

      // Save the updated HTML to the database
      const htmlId = await addHtmlVersion(projectId, updatedHtml);

      // Deploy the HTML to a domain
      const deployedUrl = await deployHtmlToDomain(
        project.domain,
        updatedHtml
      );
      console.log(`Deployed updated website to: ${deployedUrl}`);

      return {
        success: true,
        message: targetSection
          ? `Website section '${targetSection}' updated successfully!`
          : "Website updated successfully!",
        htmlVersionId: htmlId,
        usedAssetIds: assetIds,
        deployedUrl: deployedUrl
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update website: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
});
