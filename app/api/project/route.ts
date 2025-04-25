import { createRandomDomain, deleteDomain } from "@/lib/domain";
import {
  createWebProject,
  deleteWebProject,
  getWebProject,
  getAllWebProjects
} from "@/lib/query";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  
  // Fetch single project by ID
  if (id) {
    const project = getWebProject(id);
    if (!project) {
      return new Response(JSON.stringify({ error: "WebProject not found" }), { status: 404 });
    }
    return new Response(JSON.stringify(project), { status: 200 });
  }

  // Fetch all projects with pagination
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const sort = searchParams.get("sort") || "desc"; // Default to descending
  const offset = (page - 1) * limit;
  
  const allProjects = getAllWebProjects();
  // Note: getAllWebProjects now returns projects sorted by descending date
  // We don't need to sort again, but we'll respect the sort parameter if it's "asc"
  const sortedProjects = sort === "asc" 
    ? [...allProjects].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : allProjects;

  const totalCount = sortedProjects.length;
  const projects = sortedProjects.slice(offset, offset + limit);
  const totalPages = Math.ceil(totalCount / limit);
  
  return new Response(
    JSON.stringify({
      projects,
      page,
      limit,
      totalCount,
      totalPages,
    }),
    { status: 200 }
  );
}

export async function POST() {
  try {
    const domain = await createRandomDomain();
    const project = createWebProject(domain);
    return new Response(JSON.stringify({ id: project.id }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Failed to create domain" }), { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });
  }
  
  const project = getWebProject(id);
  if (!project) {
    return new Response(JSON.stringify({ error: "WebProject not found" }), { status: 404 });
  }
  
  // Delete the domain and S3 objects if they exist
  if (project.domain) {
    try {
      const success = await deleteDomain(project.domain);
      if (!success) {
        console.error("Warning: Failed to delete domain or S3 objects for:", project.domain);
      }
    } catch (err: any) {
      // Log error but proceed with project deletion
      console.error("Error deleting domain resources:", err.message);
    }
  }
  
  // Delete the project from the store
  const deleted = deleteWebProject(id);
  if (!deleted) {
    return new Response(JSON.stringify({ error: "WebProject not found" }), { status: 404 });
  }
  
  return new Response(JSON.stringify({ success: true }), { status: 200 });
} 