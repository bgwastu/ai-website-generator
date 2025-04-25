import { Message } from 'ai';
import { randomUUID } from 'crypto';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import path from 'path';

export type HtmlVersion = {
  id: string;
  htmlContent: string;
  createdAt: string;
};

export type Asset = {
  id: string;
  url: string;
  filename: string;
  uploadedAt: string;
  type: string;
  description: string;
};

export type WebProject = {
  id: string;
  createdAt: string;
  messages: Message[];
  domain: string;
  htmlVersions: HtmlVersion[];
  assets: Asset[];
  currentHtmlIndex: number | null;
};

const storePath = path.join(process.cwd(), '.store.lock');

let initialData: [string, WebProject][] = [];
if (existsSync(storePath)) {
  try {
    const fileData = readFileSync(storePath, 'utf-8');
    const obj = JSON.parse(fileData);
    initialData = Object.entries(obj) as [string, WebProject][];
  } catch (e) {
    // If file is corrupted or unreadable, start with empty store
    initialData = [];
  }
}

const store = new Map<string, WebProject>(initialData);

function persistStore() {
  writeFileSync(storePath, JSON.stringify(Object.fromEntries(store), null, 2), 'utf-8');
}

persistStore();

const originalSet = store.set.bind(store);
store.set = (id, project) => {
  const result = originalSet(id, project);
  persistStore();
  return result;
};

const originalDelete = store.delete.bind(store);
store.delete = (id) => {
  const result = originalDelete(id);
  persistStore();
  return result;
};

export function createWebProject(domain: string): WebProject {
  const id = randomUUID();
  const now = new Date().toISOString();
  const project: WebProject = {
    id,
    createdAt: now,
    messages: [],
    domain,
    htmlVersions: [],
    assets: [],
    currentHtmlIndex: null,
  };
  store.set(id, project);
  return project;
}

export function getWebProject(id: string): WebProject | undefined {
  return store.get(id);
}

/**
 * Returns all web projects in the store sorted by creation date (newest first)
 * @returns Array of all WebProject objects sorted by descending creation date
 */
export function getAllWebProjects(): WebProject[] {
  return Array.from(store.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function updateWebProject(id: string, update: Partial<Omit<WebProject, 'id'>>): WebProject | undefined {
  const project = store.get(id);
  if (!project) return undefined;
  let updated = { ...project, ...update };
  // Ensure all messages have createdAt as Date
  if (update.messages) {
    updated.messages = update.messages.map((msg) => ({
      ...msg,
      createdAt: msg.createdAt || new Date(),
    }));
  }
  store.set(id, updated);
  return updated;
}

/**
 * Adds a new HTML version to a project and sets it as the current version
 * @param projectId ID of the project to add the HTML version to
 * @param htmlContent The HTML content to add
 * @returns The ID of the newly created HTML version
 */
export async function addHtmlVersion(projectId: string, htmlContent: string): Promise<string> {
  const project = store.get(projectId);
  if (!project) throw new Error("Project not found");
  
  const newVersion: HtmlVersion = {
    id: randomUUID(),
    htmlContent,
    createdAt: new Date().toISOString(),
  };
  
  // Add new version to the array
  const htmlVersions = [...(project.htmlVersions || []), newVersion];
  const currentHtmlIndex = htmlVersions.length - 1;
  
  // Update the project
  store.set(projectId, {
    ...project,
    htmlVersions,
    currentHtmlIndex
  });
  
  return newVersion.id;
}

export function deleteWebProject(id: string): boolean {
  return store.delete(id);
} 