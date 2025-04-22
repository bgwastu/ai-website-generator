import { getWebProject } from "@/lib/query";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });
  }
  const project = getWebProject(id);
  if (!project) {
    return new Response(JSON.stringify({ error: "WebProject not found" }), { status: 404 });
  }
  return new Response(JSON.stringify(project), { status: 200 });
} 