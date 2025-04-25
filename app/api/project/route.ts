import { createRandomDomain, deleteDomain } from "@/lib/domain";
import {
  createWebProject,
  deleteWebProject,
  getWebProject,
  getAllWebProjects
} from "@/lib/query";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    // Fetch single project by ID
    if (id) {
      const project = getWebProject(id);
      if (!project) {
        return NextResponse.json({ error: "WebProject not found" }, { status: 404 });
      }
      return NextResponse.json(project);
    }

    // Fetch all projects with pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const sort = searchParams.get("sort") || "desc";
    const offset = (page - 1) * limit;
    
    const allProjects = getAllWebProjects();
    const sortedProjects = sort === "asc" 
      ? [...allProjects].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      : allProjects;

    const totalCount = sortedProjects.length;
    const projects = sortedProjects.slice(offset, offset + limit);
    const totalPages = Math.ceil(totalCount / limit);
    
    return NextResponse.json({
      projects,
      page,
      limit,
      totalCount,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const domain = await createRandomDomain();
    const project = createWebProject(domain);
    return NextResponse.json({ id: project.id }, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create project" }, 
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    
    const project = getWebProject(id);
    if (!project) {
      return NextResponse.json({ error: "WebProject not found" }, { status: 404 });
    }
    
    if (project.domain) {
      try {
        const success = await deleteDomain(project.domain);
        if (!success) {
          console.error("Failed to delete domain or S3 objects for:", project.domain);
        }
      } catch (error) {
        console.error("Error deleting domain resources:", error);
      }
    }
    
    const deleted = deleteWebProject(id);
    if (!deleted) {
      return NextResponse.json({ error: "WebProject not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" }, 
      { status: 500 }
    );
  }
} 