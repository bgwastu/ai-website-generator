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
      const project = getWebProject(projectId);
      if (!project) {
        return {
          success: false,
          message: "Project not found"
        };
      }

      const htmlVersion = project.htmlVersions?.find(v => v.id === versionId);
      if (!htmlVersion) {
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
      return {
        success: false,
        message: `Failed to retrieve HTML version: ${
          error instanceof Error ? error.message : String(error)
        }`
      };
    }
  }
}); 