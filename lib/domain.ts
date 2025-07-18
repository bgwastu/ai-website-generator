import { putObject } from './s3';

const adjectives = [
  'amazing', 'brave', 'calm', 'daring', 'eager', 'fast', 'gentle', 'happy',
  'incredible', 'jolly', 'kind', 'lively', 'mysterious', 'nice', 'polite',
  'quiet', 'rapid', 'smart', 'talented', 'unique', 'vibrant', 'wonderful',
  'xcellent', 'young', 'zealous', 'clever', 'bright', 'honest', 'pretty',
  'sequential', 'digital', 'cosmic', 'epic', 'stellar', 'dynamic'
];

const nouns = [
  'apple', 'banana', 'cloud', 'diamond', 'eagle', 'forest', 'garden',
  'harbor', 'island', 'jungle', 'kingdom', 'lake', 'mountain', 'nest',
  'ocean', 'planet', 'river', 'star', 'tiger', 'universe', 'valley',
  'waterfall', 'xylophone', 'yacht', 'zebra', 'drive', 'system', 'portal',
  'avenue', 'path', 'journey', 'quest', 'venture', 'mission', 'project'
];

function generateDomain(): string {
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNumber = Math.floor(Math.random() * 9000) + 1000;
  return `test-${randomAdjective}-${randomNoun}-${randomNumber}.laman.ai`;
}

export async function createRandomDomain(): Promise<string> {
  const domain = generateDomain();
  const ok = await createDomain(domain);
  if (!ok) throw new Error("Failed to create domain");
  return domain;
}

export async function createDomain(domain: string): Promise<boolean> {
  const LAMAN_API_KEY = process.env.LAMAN_API_KEY;
  if (!LAMAN_API_KEY) throw new Error('LAMAN_API_KEY not set');
  const res = await fetch('https://laman.ai/add-domain', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': LAMAN_API_KEY,
    },
    body: JSON.stringify({ domain }),
  });
  return res.ok;
}

export async function deleteDomain(domain: string): Promise<boolean> {
  const LAMAN_API_KEY = process.env.LAMAN_API_KEY;
  if (!LAMAN_API_KEY) throw new Error('LAMAN_API_KEY not set');
  
  // Delete domain from Laman.ai
  const domainRes = await fetch('https://laman.ai/remove-domain', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': LAMAN_API_KEY,
    },
    body: JSON.stringify({ domain }),
  });

  // Delete all S3 objects for this domain
  const s3Res = await fetch('https://laman.ai/remove-s3-objects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': LAMAN_API_KEY,
    },
    body: JSON.stringify({ domain }),
  });
  
  return domainRes.ok && s3Res.ok;
}

export async function deployHtmlToDomain(domain: string, html: string): Promise<string> {
  const key = `website-generator/${domain}/index.html`;
  await putObject(key, html, 'text/html');
  return domain;
} 