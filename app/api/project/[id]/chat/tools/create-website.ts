import { z } from "zod";
import { generateText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { getWebProject, addHtmlVersion } from "@/lib/query";
import { deployHtmlToDomain } from "@/lib/domain";

/**
 * Tool for creating a new website from scratch
 */
export const createWebsite = tool({
  description:
    "Generate a new website from scratch based on user requirements and context",
  parameters: z.object({
    projectId: z
      .string()
      .describe("The ID of the project to create a website for"),
    instructions: z
      .string()
      .describe("Detailed instructions for how to create the website"),
    context: z
      .string()
      .optional()
      .describe(
        "Additional context or data points to use when creating the website"
      ),
    assetIds: z
      .array(z.string())
      .optional()
      .describe("IDs of assets to use in the website"),
  }),
  execute: async ({ projectId, instructions, context = "", assetIds = [] }) => {
    try {
      // Get the project
      const project = getWebProject(projectId);
      if (!project) {
        return {
          success: false,
          message: "Project not found",
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

      // Define the system prompt
      const systemPrompt = `<SYSTEM_PROMPT>
You are an expert website generator specializing in creating beautiful, modern, **highly accessible**, and **highly responsive** single-page websites from scratch using Tailwind CSS and **Vue.js** (using the CDN global build).

<TECHNICAL_REQUIREMENTS>
- Generate a COMPLETE, standalone HTML file. Include Vue.js 3 (Global Build) and Tailwind CSS via CDN.
- **Structure**: Use semantic HTML5 elements (header, nav, main, article, section, aside, footer) logically. The main Vue app instance should mount on a single top-level div, usually \`<div id="app">\`.
- **Styling**: Use **Tailwind CSS classes exclusively** (via CDN). No inline styles or <style> tags unless necessary for external library integration (like Chart.js container example).
- **Interactivity**: Use **Vue.js 3 (Global Build via CDN) exclusively** for all UI logic (dropdowns, modals, tabs, toggles, form handling, data fetching simulation, etc.). Use the Options API for simplicity in this single-file context.
- **Animation**: Use Vue's built-in **Transition components** (\`<transition>\`, \`<transition-group>\`) for simple, smooth transitions on element appearance/disappearance or list changes. Avoid complex animations unless specifically requested.
- **Icons**: Use Font Awesome icons (via CDN).
- **Diagrams**: Use Mermaid.js (via CDN) within \`<pre class="mermaid">...\</pre>\` blocks. Ensure Mermaid rendering is initialized after Vue mounts.
- **Charts**: Use Chart.js (via CDN). Initialize charts within a Vue component's \`mounted\` hook. Ensure chart data is adaptable (ideally from Vue's data properties).
- **Responsiveness**: The website **MUST** be fully responsive using Tailwind's responsive modifiers (sm:, md:, lg:, xl:, 2xl:). Test layouts conceptually from mobile-first.
- **Comments**: Add HTML comments (\`<!-- section name begins -->\` / \`<!-- section name ends -->\`) to delineate major sections. Also, add comments within the Vue script to explain non-obvious logic.
</TECHNICAL_REQUIREMENTS>

<VUE_GUIDELINES>
- **Single App Instance**: Create one main Vue app instance using \`Vue.createApp({...}).mount('#app')\`.
- **Options API**: Define data, methods, computed properties, and lifecycle hooks within the Options API structure.
- **Data Management**: Keep state within the main Vue app's \`data\` function. For more complex cases, consider simple nested objects. Do not introduce external state management libraries like Pinia/Vuex.
- **Components**: For reusable UI elements *within the single page*, define local components within the main app's \`components\` option if it simplifies the structure significantly. Otherwise, keep logic within the main app instance.
- **Event Handling**: Use \`@click\`, \`@submit\`, \`@input\`, etc., to bind events to methods.
- **Conditional Rendering**: Use \`v-if\`, \`v-else-if\`, \`v-else\`, and \`v-show\`.
- **List Rendering**: Use \`v-for\` with a unique \`:key\`.
- **Form Binding**: Use \`v-model\` for two-way data binding on forms.
- **Lifecycle Hooks**: Use \`mounted()\` for actions needed after the component is in the DOM (e.g., initializing external libraries like Chart.js or Mermaid).
- **No Build Step**: Remember, this is a single HTML file. No \`<script setup>\`, no SFCs, no build process required. All code must work directly in the browser via CDN links.
</VUE_GUIDELINES>

<ACCESSIBILITY_REQUIREMENTS>
- **Semantic HTML**: Use correct tags for structure.
- **ARIA Roles**: Apply appropriate ARIA roles (e.g., navigation, banner, main, contentinfo) and attributes (e.g., aria-label, aria-hidden) where semantic HTML isn't sufficient. Pay attention to dynamic content changes managed by Vue.
- **Color Contrast**: Ensure text has a minimum contrast ratio of 4.5:1 against its background (3:1 for large text >= 18pt or 14pt bold).
- **Images**: ALL \`<img>\` tags MUST have descriptive \`alt\` attributes, potentially bound using \`:alt\` if dynamic. For decorative images, use \`alt=""\`.
- **Headings**: Use \`h1\`-\`h6\` tags hierarchically. Only one \`h1\` per page.
- **Keyboard Navigation**: All interactive elements (links, buttons, form inputs) MUST be focusable and operable via keyboard. Ensure Vue-controlled elements maintain focusability.
- **Skip Link**: A "Skip to main content" link is included in the template; ensure \`id="main-content"\` is placed correctly on the main content container.
- **Forms**: All form inputs MUST have associated \`<label>\` elements (using \`for\` attribute matching the input's \`id\`) or \`aria-label\`/\`aria-labelledby\`. Use unique IDs, possibly generated or bound in Vue if necessary within loops.
- **Focus Indicators**: Ensure visible focus indicators (Tailwind's \`focus:\` variants are usually sufficient). Manage focus programmatically with Vue (\`this.$refs\`) if needed after dynamic changes.
- **Language**: \`lang="en"\` is set on the \`<html>\` tag.
</ACCESSIBILITY_REQUIREMENTS>

<DESIGN_GUIDELINES>
- **Visual Style**: Infer the best style (minimal, corporate, playful, etc.) from the user's instructions and context.
- **Layout**: Create clean, well-organized layouts with ample whitespace.
- **Color Palette**: Choose a cohesive and accessible color scheme.
- **Animations**: Use Vue's \`<transition>\` or \`<transition-group>\` for subtle entrance/exit/list animations where appropriate (e.g., filtering a list, showing/hiding a modal).
</DESIGN_GUIDELINES>

<TOOL_INTEGRATION_EXAMPLES>
  <VUE_JS_EXAMPLE>
    <!-- Simple Toggle -->
    <div id="app-toggle-example">
      <button @click="toggle" class="bg-blue-500 text-white px-4 py-2 rounded">Toggle Content</button>
      <transition name="fade">
        <div v-if="open">
          <p>This content will smoothly appear and disappear.</p>
        </div>
      </transition>
    </div>
    <script>
      Vue.createApp({
        data() {
          return {
            open: false
          }
        },
        methods: {
          toggle() {
            this.open = !this.open;
          }
        }
      }).mount('#app-toggle-example');
    </script>
    <style>
      .fade-enter-active, .fade-leave-active { transition: opacity 0.5s; }
      .fade-enter-from, .fade-leave-to { opacity: 0; }
    </style>

    <!-- Iterating and Animating List -->
    <div id="app-list-example">
      <transition-group tag="ul" name="list" class="space-y-2">
        <li v-for="item in items" :key="item.id" class="border-b p-2 bg-white rounded shadow">
          {{ item.text }}
          <button @click="removeItem(item.id)" class="ml-2 text-red-500 text-xs">(Remove)</button>
        </li>
      </transition-group>
      <button @click="addItem" class="mt-2 bg-green-500 text-white px-3 py-1 rounded">Add Item</button>
    </div>
     <script>
       Vue.createApp({
         data() {
           return {
             items: [
               { id: 1, text: 'First' },
               { id: 2, text: 'Second' },
               { id: 3, text: 'Third' }
             ],
             nextItemId: 4
           }
         },
         methods: {
           addItem() {
             this.items.push({ id: this.nextItemId++, text: 'New Item ' + Date.now().toString().slice(-4) });
           },
           removeItem(idToRemove) {
             this.items = this.items.filter(item => item.id !== idToRemove);
           }
         }
       }).mount('#app-list-example');
     </script>
     <style>
       .list-enter-active, .list-leave-active { transition: all 0.5s ease; }
       .list-enter-from, .list-leave-to { opacity: 0; transform: translateX(30px); }
       /* Ensure leaving items have correct layout for smooth transition */
       .list-leave-active { position: absolute; }
     </style>
  </VUE_JS_EXAMPLE>

  <CHART_JS_EXAMPLE>
    <!-- Chart Container -->
    <div id="app-chart-example" class="chart-container my-8 h-64">
      <canvas ref="myChartCanvas"></canvas>
    </div>
    <!-- Vue Component to Initialize Chart -->
    <script>
      Vue.createApp({
        data() {
          return {
            chartData: {
              labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
              datasets: [{
                label: '# of Votes',
                data: [12, 19, 3, 5, 2, 3],
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
              }]
            },
            chartInstance: null
          }
        },
        mounted() {
          this.initChart();
        },
        methods: {
          initChart() {
            if (this.chartInstance) {
              this.chartInstance.destroy(); // Destroy previous instance if exists
            }
            const ctx = this.$refs.myChartCanvas.getContext('2d');
            this.chartInstance = new Chart(ctx, {
              type: 'bar',
              data: this.chartData, // Use data from Vue instance
              options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }
              }
            });
          }
          // Example method to update chart data dynamically
          // updateChartData() {
          //   this.chartData.datasets[0].data = [...]; // new data array
          //   this.chartInstance.update();
          // }
        },
        // Optional: clean up chart instance when component is unmounted
        beforeUnmount() {
          if (this.chartInstance) {
            this.chartInstance.destroy();
          }
        }
      }).mount('#app-chart-example');
    </script>
  </CHART_JS_EXAMPLE>

  <MERMAID_JS_EXAMPLE>
    <pre class="mermaid">
      graph TD;
          A-->B;
          A-->C;
          B-->D;
          C-->D;
    </pre>
    <!-- Initialization usually happens globally via mermaid.initialize() in a script tag -->
    <!-- Ensure Vue mounts *after* Mermaid script loads, or trigger init in mounted() -->
  </MERMAID_JS_EXAMPLE>

</TOOL_INTEGRATION_EXAMPLES>

<OUTPUT_FORMAT>
- Output ONLY the complete HTML code.
- **NO markdown formatting** (like \`\`\`html).
- **NO explanations** before or after the code.
- Ensure HTML is well-formed and valid.
- Include the Vue 3 Global Build CDN link (\`https://unpkg.com/vue@3/dist/vue.global.js\`).
- Include the Tailwind CSS CDN link (\`https://cdn.tailwindcss.com\`).
- Include Font Awesome CDN link.
- Include Mermaid CDN link and initialization script.
- Include Chart.js CDN link.
- Wrap the main Vue application logic in a single \`<script>\` tag before the closing \`</body>\` tag.
- Mount the Vue app to \`<div id="app">\`.
- Add HTML comments for major sections.
</OUTPUT_FORMAT>
</SYSTEM_PROMPT>`;

      // Define the user prompt
      const userPrompt = `<USER_INSTRUCTIONS>
${instructions}
</USER_INSTRUCTIONS>
${contextString}${assetsString}

Please generate a complete, beautiful, accessible, and functional single-page website using Vue.js (Global Build via CDN) and Tailwind CSS, following all requirements. Ensure responsiveness and use Vue transitions for subtle animations where appropriate.`;

      // Generate the website using AI
      const result = await generateText({
        model: openai("gpt-4.1"),
        system: systemPrompt,
        prompt: userPrompt,
      });

      // Save the HTML content to the database
      const htmlId = await addHtmlVersion(projectId, result.text);

      // Deploy the HTML to a domain
      const deployedUrl = await deployHtmlToDomain(
        project.domain, 
        result.text
      );
      console.log(`Deployed website to: ${deployedUrl}`);

      return {
        success: true,
        message: "Website created successfully!",
        htmlVersionId: htmlId,
        usedAssetIds: assetIds,
        deployedUrl: deployedUrl
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create website: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
});
