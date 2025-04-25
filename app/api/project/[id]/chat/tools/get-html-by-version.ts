import { z } from "zod";
import { tool } from "ai";
import { getWebProject } from "@/lib/query";

/**
 * Tool for retrieving HTML content by version ID
 */
export const getHtmlByVersion = tool({
  description: "Retrieve HTML content of a specific version for reference",
  parameters: z.object({
    projectId: z
      .string()
      .describe("The ID of the project"),
    versionId: z
      .string()
      .describe("The ID of the HTML version to retrieve")
  }),
  execute: async ({ projectId, versionId }) => {
    try {
      // Validate project exists
      const project = getWebProject(projectId);
      if (!project) {
        console.error(`Project not found: ${projectId}`);
        return {
          success: false,
          message: "Project not found"
        };
      }

      // Validate HTML version exists
      if (!project.htmlVersions?.length) {
        console.error(`No HTML versions found for project: ${projectId}`);
        return {
          success: false,
          message: "No HTML versions found for this project"
        };
      }

      // Find the requested version
      const htmlVersion = project.htmlVersions.find(v => v.id === versionId);
      if (!htmlVersion) {
        console.error(`HTML version with ID ${versionId} not found in project ${projectId}`);
        return {
          success: false,
          message: `HTML version with ID ${versionId} not found`
        };
      }

      return {
        success: true,
        message: "HTML version retrieved successfully",
        htmlContent: htmlVersion.htmlContent,
        createdAt: htmlVersion.createdAt
      };
    } catch (error) {
      console.error("Error retrieving HTML version:", error);
      return {
        success: false,
        message: `Failed to retrieve HTML version: ${
          error instanceof Error ? error.message : String(error)
        }`
      };
    }
  }
}); 