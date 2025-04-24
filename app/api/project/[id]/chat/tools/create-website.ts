import { deployHtmlToDomain } from "@/lib/domain";
import { addHtmlVersion, getWebProject } from "@/lib/query";
import { openai } from "@ai-sdk/openai";
import { generateText, tool } from "ai";
import { z } from "zod";

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
Create a beautiful, accessible, responsive single-page website using vanilla JavaScript and Tailwind CSS.

<REQUIREMENTS>
- Generate complete HTML with these CDNs:
  - Tailwind CSS: \`<script src="https://cdn.tailwindcss.com"></script>\`
  - Font Awesome: \`<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">\`
  - Grid.js (for tables): \`<script src="https://unpkg.com/gridjs/dist/gridjs.umd.js"></script>\` and \`<link href="https://unpkg.com/gridjs/dist/theme/mermaid.min.css" rel="stylesheet">\`
  - ApexCharts: \`<script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>\`
  
- Use semantic HTML5 with proper ARIA attributes and keyboard accessibility
- Use vanilla JavaScript for all interactive elements - NO frameworks like Vue or React
- Use Tailwind classes exclusively (no inline styles) with color system based on the aesthetic of the design:
  - Choose a primary color palette that matches the overall design aesthetic
  - Secondary/accent colors should complement the primary color
  - Neutral: gray-100 through gray-900 for general text and backgrounds
  - Use consistent typography: h1 (text-3xl/4xl font-bold), h2 (text-2xl font-semibold), body (text-base text-gray-700)
  - Common components: buttons (px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md), 
    cards (bg-white rounded-lg shadow-sm p-6 border border-gray-100)
- IMPORTANT: For styled text in tables (like colored percentages), apply Tailwind classes directly to table cells (<td>) instead of using nested span elements  
- Add smooth animations using CSS transitions:
  - Use transition classes for hover effects and interactive elements
  - Keep animations subtle and purposeful
- For data visualization use ApexCharts with vanilla JS implementation
- Only use Grid.js for tables with moderate to large datasets
- DO NOT create custom canvas or SVG elements unless they're from external modules
- Ensure fully responsive layout using Tailwind's responsive modifiers (sm:, md:, lg:, xl:)
- Add HTML comments for major sections
- IMPORTANT: NEVER make up URLs, API endpoints, or asset paths. Only use assets or URLs that are specifically provided in the context.
</REQUIREMENTS>

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

- For percentage values in tables, apply styling directly rather than using raw HTML span tags:
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
- Tailwind CSS: Use utilities directly in HTML classes, following the design system
  - For color selection, use a cohesive palette that follows the site's aesthetic
  - Configure theme colors via tailwind.config section in script tag
  - Example: \`<script>tailwind.config = {theme: {extend: {colors: {primary: {...}}}}}</script>\`
  - Refer to https://tailwindcss.com/docs/colors for color scales

- Vanilla JavaScript:
  - Use modern JavaScript (ES6+) features for DOM manipulation and event handling
  - For reactivity, add/remove elements or modify content directly with:
    \`document.getElementById('element').innerHTML = content;\`
  - For event listeners, use: 
    \`document.getElementById('button').addEventListener('click', function() { ... });\`
  - For fetch API for data loading:
    \`fetch(url).then(response => response.json()).then(data => { ... });\`
    
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
  - Use with \`<i class="fas fa-icon-name"></i>\` (solid style)
  - Or \`<i class="far fa-icon-name"></i>\` (regular style)
  - For sizing: \`fa-sm\`, \`fa-lg\`, \`fa-2x\`, etc.

- ApexCharts:
  - Create a container: \`<div id="chart"></div>\`
  - Initialize chart: 
    \`\`\`javascript
    const chart = new ApexCharts(document.querySelector("#chart"), {
      chart: {
        type: 'line',
        height: 350
      },
      series: [{
        name: 'Sales',
        data: [30, 40, 35, 50, 49, 60, 70]
      }],
      xaxis: {
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']
      }
    });
    chart.render();
    \`\`\`
  - Use appropriate chart types based on data: line, bar, area, pie, etc.
  - Add interactivity with tooltips and zooming when appropriate
  - Update dynamically with chart.updateSeries([{data: newData}]);
  
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
  - For server-side data, use the server property:
    \`\`\`javascript
    new gridjs.Grid({
      columns: ['Name', 'Email'],
      server: {
        url: 'https://api.example.com/data',
        then: data => data.map(user => [user.name, user.email])
      }
    }).render(element);
    \`\`\`
</MODULE_USAGE>

<DATA_DRIVEN_DASHBOARD>
For data-driven applications, include the following key features:
- Advanced data filtering with simple JavaScript filter functions
- Dynamic sorting options for tables with Grid.js or vanilla JS sort functions
- Clear loading states using skeleton loaders or spinner elements
- Responsive dashboard layout with cards (grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4)
- Data export functionality with simple CSV generation
- Summary metrics with visual indicators for trends
- Simple local storage for saving user preferences:
  \`\`\`javascript
  // Save settings
  localStorage.setItem('dashboardSettings', JSON.stringify(settings));
  
  // Load settings
  const settings = JSON.parse(localStorage.getItem('dashboardSettings')) || defaultSettings;
  \`\`\`

IMPORTANT: Do NOT make up data. If sample data is needed, use placeholder data that is clearly indicated as such, or create generic examples that don't imply real statistics/patterns.
IMPORTANT: NEVER invent URLs, API endpoints, or asset paths. Only use assets or URLs that are specifically provided in the context. For images and other assets, strictly use the URLs from the ASSETS_TO_USE section when available.
</DATA_DRIVEN_DASHBOARD>

<CDN_ORDER>
<head>:
  1. Tailwind CSS
  2. Font Awesome CSS
  3. Grid.js CSS (if using data tables)
  4. ApexCharts
</head>
<body> (at end):
  1. Grid.js (if using data tables)
  2. ApexCharts
  3. Your custom JavaScript
</CDN_ORDER>

<OUTPUT_FORMAT>
IMPORTANT: DO NOT wrap your HTML output with triple backticks (\`\`\`). Return ONLY the raw HTML document starting with <!DOCTYPE html>
</OUTPUT_FORMAT>

Output ONLY the complete HTML code without explanations. Include all necessary CDN links and proper initialization.
</SYSTEM_PROMPT>`;

      // Define the user prompt
      const userPrompt = `<USER_INSTRUCTIONS>
${instructions}
</USER_INSTRUCTIONS>
${contextString}${assetsString}

Please generate a complete, beautiful, accessible, and functional single-page website using vanilla JavaScript and Tailwind CSS, following all requirements. Choose a primary color palette that fits the design aesthetic. Ensure responsiveness and use CSS transitions for subtle animations where appropriate. For data-driven applications, include simple filtering, sorting, and search capabilities without making up data. Use ApexCharts for data visualization with vanilla JavaScript and Grid.js for interactive tables.`;

      // Generate the website using AI
      const result = await generateText({
        model: openai("gpt-4.1"),
        system: systemPrompt,
        prompt: userPrompt,
      });

      // Process the result to remove any markdown formatting if present
      let htmlContent = result.text;
      // Remove triple backticks if the AI accidentally includes them
      if (htmlContent.startsWith("```") || htmlContent.startsWith("```html")) {
        htmlContent = htmlContent.replace(/^```(html)?\n/, "").replace(/```$/, "");
      }

      // Save the HTML content to the database
      const htmlId = await addHtmlVersion(projectId, htmlContent);

      // Deploy the HTML to a domain
      await deployHtmlToDomain(
        project.domain, 
        htmlContent
      );
      console.log(`Deployed website successfully`);

      return {
        success: true,
        message: "Website created successfully!",
        htmlVersionId: htmlId,
        usedAssetIds: assetIds
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
