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
  domain: string | null;
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

export function deleteWebProject(id: string): boolean {
  return store.delete(id);
} 