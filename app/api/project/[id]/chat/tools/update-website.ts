import { z } from "zod";
import { generateText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { getWebProject, addHtmlVersion } from "@/lib/query";
import { deployHtmlToDomain } from "@/lib/domain";
import { generateId } from "@/lib/utils";

// Define types for asset objects
interface Asset {
  id: string;
  description: string;
  url: string;
  type: string;
}

/**
 * Helper function to format selected assets for the prompt
 */
function formatAssetsString(selectedAssets: Asset[]): string {
  if (selectedAssets.length === 0) {
    return "";
  }

  return `<ASSETS_TO_USE>
${selectedAssets
  .map(
    (asset: Asset, index: number) =>
      `Asset ${index + 1}:
Description: ${asset.description}
URL: ${asset.url}
Type: ${asset.type}`
  )
  .join("\n")}
</ASSETS_TO_USE>
`;
}

/**
 * Helper function to format context for the prompt
 */
function formatContextString(context: string | undefined): string {
  if (!context) {
    return "";
  }

  return `<ADDITIONAL_CONTEXT>
${context}
</ADDITIONAL_CONTEXT>
`;
}

/**
 * Helper function to clean HTML output by removing markdown formatting
 */
function cleanHtmlOutput(html: string): string {
  let cleanedHtml = html;
  // Remove triple backticks if present
  if (cleanedHtml.startsWith("```") || cleanedHtml.startsWith("```html")) {
    cleanedHtml = cleanedHtml.replace(/^```(html)?\n/, "").replace(/```$/, "");
  }
  return cleanedHtml;
}

/**
 * System prompt for section updates
 */
function getSectionUpdateSystemPrompt(targetSection: string): string {
  return `<SYSTEM_PROMPT>
Update a specific section of a website built with HTML, Tailwind CSS, and vanilla JavaScript.

<SECTION_UPDATE_REQUIREMENTS>
- Generate ONLY the HTML for the requested '${targetSection}' section
- Use Tailwind CSS exclusively for styling
- Use vanilla JavaScript for interactivity - NO frameworks like Vue or React
- IMPORTANT: For placeholder images, ALWAYS use https://fakeimg.pl/{width}x{height} with specific dimensions (e.g., https://fakeimg.pl/600x400)
- IMPORTANT: For styled text in tables (like colored percentages), apply Tailwind classes directly to table cells (<td>) instead of using nested span elements
- Add smooth transitions using CSS transition classes where appropriate
- Begin output with <!-- ${targetSection} begin --> and end with <!-- ${targetSection} end -->
- Do not include <script> tags unless absolutely necessary for the section
- DO NOT create custom canvas or SVG elements unless they're from external modules
</SECTION_UPDATE_REQUIREMENTS>

<DESIGN_CONSISTENCY>
- Match existing styling patterns (colors, typography, spacing)
- Use semantic HTML elements with proper ARIA attributes
- Ensure responsive design with Tailwind breakpoint modifiers
</DESIGN_CONSISTENCY>

<MODULE_USAGE>
- Tailwind CSS: 
  - Use utilities directly in HTML classes
  - Follow existing color palette and design system
  - For any new UI elements, maintain consistency with existing components

- Vanilla JavaScript:
  - Use DOM manipulation methods like getElementById(), querySelector()
  - Add event listeners with addEventListener()
  - Update content with element.innerHTML or element.textContent
  - For displaying data, generate HTML strings or create elements programmatically

- Font Awesome icons:
  - Use existing icon style (fas, far, fab) for consistency
  - Match existing size classes (fa-sm, fa-lg, etc.)

- ApexCharts (for data visualizations):
  - Use standard initialization with new ApexCharts(element, options)
  - Match existing chart styles and configurations
  - Use appropriate chart types for the data
  - Initialize charts inside JavaScript blocks at the end of the section

- Grid.js (only for larger tables):
  - Add a container div for the table
  - Initialize with new gridjs.Grid() and appropriate options
  - Add search, pagination, and sorting as needed
</MODULE_USAGE>

<DATA_DRIVEN_SECTIONS>
If this section is part of a data-driven dashboard:
- Add appropriate filtering/search controls with vanilla JS event handlers
- Ensure interactivity with proper DOM event listeners
- Include loading/empty states for data-dependent elements
- Add clear data display with proper headings and structure
- IMPORTANT: Do NOT make up data. Use placeholders or generic examples when needed.
- IMPORTANT: NEVER invent URLs, API endpoints, or asset paths. Only use assets or URLs that are specifically provided in the context.
</DATA_DRIVEN_SECTIONS>

Output ONLY the section HTML (with begin/end comments) and NO explanations.
</SYSTEM_PROMPT>`;
}

/**
 * System prompt for stitching updated section into full HTML
 */
function getStitchSystemPrompt(targetSection: string): string {
  return `<SYSTEM_PROMPT>
Precisely update an HTML document by replacing a specific section.

<RULES>
1. Find section marked by: <!-- ${targetSection} begin --> and <!-- ${targetSection} end -->
2. Replace everything between these comments (inclusive) with the new section content
3. If markers don't exist, find logical place for ${targetSection} based on semantic structure
4. Do NOT modify any other parts of the HTML document
5. Preserve all existing <script> tags unless explicitly instructed otherwise
</RULES>

Output ONLY the complete updated HTML document without explanations.
</SYSTEM_PROMPT>`;
}

/**
 * System prompt for full website updates
 */
function getFullWebsiteUpdateSystemPrompt(): string {
  return `<SYSTEM_PROMPT>
Create a complete website in HTML, Tailwind CSS, and vanilla JavaScript based on the user's instructions.

<UPDATE_REQUIREMENTS>
- Use the existing HTML structure as a foundation
- Maintain design consistency while implementing the requested changes
- Keep all existing CDNs, adding any necessary new ones in proper order:
  - Tailwind CSS: \`<script src="https://cdn.tailwindcss.com"></script>\`
  - Font Awesome: \`<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">\`
  - Grid.js (for tables): \`<script src="https://unpkg.com/gridjs/dist/gridjs.umd.js"></script>\` and \`<link href="https://unpkg.com/gridjs/dist/theme/mermaid.min.css" rel="stylesheet">\`
  - ApexCharts: \`<script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>\`
- IMPORTANT: For placeholder images, ALWAYS use https://fakeimg.pl/{width}x{height} with specific dimensions (e.g., https://fakeimg.pl/600x400)
- IMPORTANT: For styled text in tables (like colored percentages), apply Tailwind classes directly to table cells (<td>) instead of using nested span elements
- Modify the JavaScript code to support new features
- Ensure all animations are smooth using CSS transitions
- Preserve existing content unless explicitly instructed to change it
- DO NOT create custom canvas or SVG elements unless they're from external modules
- Only use Grid.js for tables with moderate to large datasets
- IMPORTANT: NEVER make up URLs, API endpoints, or asset paths. Only use assets or URLs that are specifically provided in the context.
- IMPORTANT: Do NOT use SVG icons or create any SVG elements. For all icons, use only Font Awesome icons or emojis. Do not generate or embed any SVG code, and do not use inline SVG. If an icon is needed, use a Font Awesome icon (with <i> tag) or a relevant emoji instead.
</UPDATE_REQUIREMENTS>

<TABLE_GENERATION_GUIDELINES>
- For simple tables (less than 20 rows), use standard HTML tables with Tailwind styling:
  \`\`\`html
  <div class="overflow-x-auto">
    <table class="min-w-full bg-white">
      <thead class="bg-gray-100">
        <tr>
          <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
          <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200">
        <tr>
          <td class="px-6 py-4 whitespace-nowrap">John Doe</td>
          <td class="px-6 py-4 whitespace-nowrap">Developer</td>
        </tr>
      </tbody>
    </table>
  </div>
  \`\`\`

- For percentage values or colored text in tables, apply styling directly to the table cells:
  \`\`\`html
  <!-- DO NOT use: <span class="text-red-600 font-medium">5%</span> -->
  
  <!-- INSTEAD use Tailwind classes directly on the table cell: -->
  <td class="px-6 py-4 whitespace-nowrap text-red-600 font-medium">5%</td>
  
  <!-- For dynamic values in JavaScript-populated tables: -->
  <script>
    // Apply classes to the cell directly
    row.insertCell(0).className = "px-6 py-4 whitespace-nowrap text-red-600 font-medium";
    row.cells[0].textContent = "5%";
  </script>
  \`\`\`

- For larger datasets or interactive tables, use Grid.js:
  \`\`\`html
  <div id="table-container"></div>
  <script>
    new gridjs.Grid({
      columns: ['Name', 'Title', 'Email'],
      data: [
        ['John', 'Developer', 'john@example.com'],
        ['Jane', 'Designer', 'jane@example.com']
      ],
      search: true,
      pagination: {
        limit: 10
      },
      sort: true
    }).render(document.getElementById('table-container'));
  </script>
  \`\`\`

- For Grid.js tables with colored text or percentages, use the formatter option:
  \`\`\`html
  <script>
    new gridjs.Grid({
      columns: [
        'Metric',
        { 
          name: 'Percent Loss',
          formatter: (cell) => {
            // Create a div element with the appropriate classes
            return gridjs.h('div', {
              className: cell > 20 ? 'text-red-600 font-medium' : 'text-orange-500',
              style: { whiteSpace: 'nowrap' }
            }, cell + '%');
          }
        }
      ],
      data: [
        ['Revenue', 5],
        ['Profit', 10],
        ['Growth', 15]
      ]
    }).render(document.getElementById('table-container'));
  </script>
  \`\`\`

- For searchable/filterable tables, add simple filter functionality:
  \`\`\`html
  <input type="text" id="tableSearch" class="px-4 py-2 border rounded mb-4" placeholder="Search table...">
  <table id="dataTable"><!-- table contents --></table>
  <script>
    document.getElementById('tableSearch').addEventListener('keyup', function() {
      const searchText = this.value.toLowerCase();
      const table = document.getElementById('dataTable');
      const rows = table.getElementsByTagName('tr');
      
      for (let i = 1; i < rows.length; i++) {
        const cells = rows[i].getElementsByTagName('td');
        let matchFound = false;
        
        for (let j = 0; j < cells.length; j++) {
          if (cells[j].textContent.toLowerCase().includes(searchText)) {
            matchFound = true;
            break;
          }
        }
        
        rows[i].style.display = matchFound ? '' : 'none';
      }
    });
  </script>
  \`\`\`

- Always use <th scope="col"> for table headers and include appropriate accessibility attributes
- Include empty state handling: "No data available" message when table is empty
</TABLE_GENERATION_GUIDELINES>

<MODULE_USAGE>
- Tailwind CSS: 
  - Use utilities directly in HTML classes
  - If modifying color scheme, update the tailwind.config section:
    \`<script>tailwind.config = {theme: {extend: {colors: {primary: {...}}}}}</script>\`
  - Reference color palette: https://tailwindcss.com/docs/colors
  - Customize colors based on the design aesthetic, not fixed to blue

- Placeholder Images:
  - ALWAYS use fakeimg.pl with specific dimensions
  - Example: \`<img src="https://fakeimg.pl/600x400" alt="Placeholder image" class="w-full h-auto rounded-lg">\`
  - Adjust dimensions based on usage context: hero (1200x600), card (400x300), avatar (150x150), etc.
  - Include descriptive alt text for accessibility
  - Apply appropriate Tailwind classes for responsive behavior
  - Examples:
    \`\`\`html
    <!-- Hero image -->
    <img src="https://fakeimg.pl/1200x600" alt="Hero image" class="w-full h-auto rounded-lg">
    
    <!-- Card image -->
    <img src="https://fakeimg.pl/400x300" alt="Card image" class="w-full h-auto rounded-lg">
    
    <!-- Avatar/profile image -->
    <img src="https://fakeimg.pl/150x150" alt="Profile avatar" class="w-16 h-16 rounded-full">
    
    <!-- Gallery thumbnail -->
    <img src="https://fakeimg.pl/300x200" alt="Gallery item" class="w-full h-auto rounded hover:opacity-90 transition-opacity">
    \`\`\`

- Vanilla JavaScript:
  - Use modern JavaScript (ES6+) features for DOM manipulation
  - For dynamic content, use:
    \`\`\`javascript
    document.getElementById('element').innerHTML = '<p>New content</p>';
    \`\`\`
  - For event handling:
    \`\`\`javascript
    document.getElementById('button').addEventListener('click', function() {
      // Action to perform when clicked
    });
    \`\`\`
  - For fetching data:
    \`\`\`javascript
    fetch('url/to/data')
      .then(response => response.json())
      .then(data => {
        // Process data
      })
      .catch(error => console.error('Error:', error));
    \`\`\`
    
  - For accessing public APIs with CORS issues, use the provided CORS proxy:
    \`\`\`javascript
    // Use this format: https://cors.notesnook.com/[target-url]
    fetch('https://cors.notesnook.com/https://api.example.com/data')
      .then(response => response.json())
      .then(data => {
        // Process data
      })
      .catch(error => console.error('Error:', error));
    \`\`\`

- Font Awesome:
  - Use with \`<i class="fas fa-icon-name"></i>\` for solid style icons
  - Use with \`<i class="far fa-icon-name"></i>\` for regular style icons
  - For larger icons: \`fa-lg\`, \`fa-2x\`, etc.

- ApexCharts:
  - Create a container element:
    \`<div id="chart"></div>\`
  - Initialize the chart:
    \`\`\`javascript
    const chart = new ApexCharts(document.querySelector("#chart"), {
      chart: {
        type: 'line',
        height: 350
      },
      series: [{
        name: 'Data Name',
        data: [30, 40, 50, 60, 70]
      }],
      xaxis: {
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May']
      }
    });
    chart.render();
    \`\`\`
  - Update chart data dynamically:
    \`\`\`javascript
    chart.updateSeries([{
      data: newData
    }]);
    \`\`\`
  - Support for multiple chart types: line, area, bar, column, pie, donut, radar

- Grid.js for data tables:
  - Create a container: \`<div id="table"></div>\`
  - Initialize with configuration:
    \`\`\`javascript
    new gridjs.Grid({
      columns: ['Name', 'Email', 'Phone'],
      data: [
        ['John', 'john@example.com', '(123) 456-7890'],
        ['Jane', 'jane@example.com', '(123) 456-7890']
      ],
      search: true,
      sort: true,
      pagination: {
        limit: 10
      }
    }).render(document.getElementById('table'));
    \`\`\`
  - For server-side data:
    \`\`\`javascript
    new gridjs.Grid({
      columns: ['Name', 'Email'],
      server: {
        url: 'https://api.example.com/data',
        then: data => data.map(user => [user.name, user.email])
      }
    }).render(document.getElementById('table'));
    \`\`\`
</MODULE_USAGE>

<DESIGN_SYSTEM>
- Colors: Match the site's aesthetic, not fixed to blue
  (primary: chosen to match design, success: green-500, warning: amber-500, error: red-500)
- Typography: Maintain hierarchy with proper font sizes/weights 
  (h1: text-3xl/4xl font-bold, h2: text-2xl font-semibold, body: text-base text-gray-700)
- Components: Use consistent styling for UI elements
  (buttons: px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md)
- Spacing: Apply consistent rhythm (sections: my-12, components: my-6, elements: my-3)
- Data: For tables/charts, ensure consistent styling and responsive behavior
</DESIGN_SYSTEM>

<DATA_DRIVEN_DASHBOARD>
For data-driven applications, enhance with these features:
- Simple data filtering with vanilla JavaScript functions
- Dynamic sorting for tables using Grid.js or custom sort functions
- Clear loading states with spinners or skeleton loaders
- Responsive dashboard layouts (grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4)
- Basic data export functionality (CSV generation)
- Summary metrics with visual indicators for trends
- User preferences with localStorage:
  \`\`\`javascript
  // Save settings
  localStorage.setItem('dashboardSettings', JSON.stringify(settings));
  
  // Load settings
  const settings = JSON.parse(localStorage.getItem('dashboardSettings')) || defaultSettings;
  \`\`\`

IMPORTANT: Do NOT make up data. If sample data is needed, use placeholder data that is clearly indicated as such, or create generic examples that don't imply real statistics/patterns.
IMPORTANT: NEVER invent URLs, API endpoints, or asset paths. Only use assets or URLs that are specifically provided in the context. For images and other assets, strictly use the URLs from the ASSETS_TO_USE section when available.
</DATA_DRIVEN_DASHBOARD>

<COMMON_ISSUES>
- If JavaScript isn't working: Check for console errors and ensure script order
- If transitions don't work: Verify CSS transition properties are correctly set
- If ApexCharts isn't working: Check that the container element exists before initialization
- If data tables aren't working: Verify Grid.js is properly loaded and initialized
- If colors need updating: Adjust tailwind.config theme settings
</COMMON_ISSUES>

<OUTPUT_FORMAT>
IMPORTANT: DO NOT wrap your HTML output with triple backticks (\`\`\`). Return ONLY the raw HTML document starting with <!DOCTYPE html>
</OUTPUT_FORMAT>

Output ONLY the complete updated HTML with NO explanations or markdown formatting.
</SYSTEM_PROMPT>`;
}

/**
 * Schema for the updateWebsite tool parameters
 */
export const updateWebsiteSchema = z.object({
  projectId: z.string(),
  instructions: z.string(),
  assets: z
    .array(
      z.object({
        id: z.string(),
        description: z.string(),
        url: z.string(),
        type: z.string(),
      })
    )
    .optional()
    .default([]),
  section: z.string().optional(),
  context: z.string().optional(),
  deploy: z.boolean().optional().default(true),
});

/**
 * Tool for updating an existing website
 */
export const updateWebsite = tool({
  description:
    "Update an existing website based on user requirements and context",
  parameters: updateWebsiteSchema,
  execute: async ({
    projectId,
    instructions,
    assets = [],
    section,
    context,
    deploy = true,
  }: z.infer<typeof updateWebsiteSchema>) => {
    try {
      // Get the current project to retrieve the latest HTML
      const project = getWebProject(projectId);
      if (!project) {
        console.error(`Project not found: ${projectId}`);
        return {
          success: false,
          message: "Project not found",
        };
      }

      // Get the HTML content based on current version
      let currentHtml: string | null = null;
      if (
        project.htmlVersions &&
        project.htmlVersions.length > 0 &&
        project.currentHtmlIndex !== null
      ) {
        currentHtml =
          project.htmlVersions[project.currentHtmlIndex].htmlContent;
      } else {
        console.error(`No HTML versions found for project ${projectId}`);
        return {
          success: false,
          message:
            "No existing website found to update. Please use createWebsite instead.",
        };
      }

      // Get the assets
      const selectedAssets = assets || [];

      // Format assets and context for the prompt
      const assetsString = formatAssetsString(selectedAssets);
      const contextString = formatContextString(context);

      let updatedHtml: string;

      // If a specific section is targeted, update just that section
      if (section) {
        // Step 1: Generate the updated section
        const sectionUserPrompt = `<CURRENT_HTML_REFERENCE_ONLY>
${currentHtml}
</CURRENT_HTML_REFERENCE_ONLY>

<UPDATE_INSTRUCTIONS>
${instructions}
</UPDATE_INSTRUCTIONS>
${contextString}
<TARGET_SECTION>${section}</TARGET_SECTION>${assetsString}

Please generate the updated HTML for just the \`${section}\` section, using vanilla JavaScript for interactivity and CSS transitions, ensuring strong accessibility.`;

        const sectionResult = await generateText({
          model: openai("gpt-4.1"),
          system: getSectionUpdateSystemPrompt(section),
          prompt: sectionUserPrompt,
        });

        // Step 2: Stitch the updated section into the full HTML
        const stitchUserPrompt = `<CURRENT_HTML>
${currentHtml}
</CURRENT_HTML>

<NEW_SECTION_CONTENT section="${section}">
${sectionResult.text}
</NEW_SECTION_CONTENT>

Please integrate the new section content into the current HTML, replacing the existing \`${section}\` section marked by comments. Do not modify other parts of the document, especially existing \`<script>\` tags unless absolutely necessary and instructed.`;

        const stitchResult = await generateText({
          model: openai("gpt-4.1"),
          system: getStitchSystemPrompt(section),
          prompt: stitchUserPrompt,
        });

        updatedHtml = cleanHtmlOutput(stitchResult.text);
      } else {
        // Update the entire website
        const fullUpdateUserPrompt = `<CURRENT_HTML>
${currentHtml}
</CURRENT_HTML>

<UPDATE_INSTRUCTIONS>
${instructions}
</UPDATE_INSTRUCTIONS>
${contextString}${assetsString}

Please update the website (HTML structure and JavaScript code) according to these instructions. Maintain the overall structure/design and ensure strong accessibility. Use CSS transitions for subtle animations where appropriate. For data-driven applications, enhance filtering, sorting, and search capabilities without making up data. Choose a primary color palette that fits the design aesthetic. Use ApexCharts for data visualization with vanilla JavaScript and Grid.js for interactive tables.`;

        const result = await generateText({
          model: openai("gpt-4.1"),
          system: getFullWebsiteUpdateSystemPrompt(),
          prompt: fullUpdateUserPrompt,
        });

        updatedHtml = cleanHtmlOutput(result.text);
      }

      // Save the updated HTML to the database
      const htmlId = await addHtmlVersion(projectId, updatedHtml);

      // Check if project has a domain before deployment
      if (!project.domain || !deploy) {
        console.error(
          `Project ${projectId} has no domain to deploy to or deploy flag is false`
        );
        return {
          success: true,
          message: `Website updated successfully but not deployed`,
          htmlVersionId: htmlId,
          usedAssets: selectedAssets,
        };
      }

      // Deploy the HTML to the domain
      try {
        await deployHtmlToDomain(project.domain, updatedHtml);
        console.log(
          `Deployed updated website successfully to ${project.domain}`
        );
      } catch (deployError) {
        console.error(
          `Failed to deploy to domain ${project.domain}:`,
          deployError
        );
        return {
          success: true,
          message: `Website updated but deployment failed: ${
            deployError instanceof Error
              ? deployError.message
              : String(deployError)
          }`,
          htmlVersionId: htmlId,
          usedAssets: selectedAssets,
        };
      }

      return {
        success: true,
        message: section
          ? `Website section '${section}' updated successfully!`
          : "Website updated successfully!",
        htmlVersionId: htmlId,
        usedAssets: selectedAssets,
      };
    } catch (error) {
      console.error("Error updating website:", error);
      return {
        success: false,
        message: `Failed to update website: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
});
