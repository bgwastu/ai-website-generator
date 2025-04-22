import {
  createWebProject,
  getWebProject,
  updateWebProject,
  deleteWebProject,
  WebProject,
} from "@/lib/query";
import { createDomain, deleteDomain, createRandomDomain } from "@/lib/domain";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });
  }
  const project = getWebProject(id);
  if (!project) {
    return new Response(JSON.stringify({ error: "WebProject not found" }), { status: 404 });
  }
  return new Response(JSON.stringify(project), { status: 200 });
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
  try {
    await deleteDomain(project.domain!);
  } catch (err: any) {
    // Log error but proceed with deletion
    console.error("Failed to delete domain:", err);
  }
  const deleted = deleteWebProject(id);
  if (!deleted) {
    return new Response(JSON.stringify({ error: "WebProject not found" }), { status: 404 });
  }
  return new Response(null, { status: 204 });
} 