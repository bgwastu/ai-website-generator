import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';

const LAMAN_API_KEY = process.env.LAMAN_API_KEY;
if (!LAMAN_API_KEY) {
  console.error('LAMAN_API_KEY environment variable is not set');
}

// Initialize S3 client with R2 configuration
// Ensure R2 environment variables are set: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!, // Use non-null assertion if you're sure it's set
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const bucketName = process.env.R2_BUCKET_NAME!;
const publicUrlBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL!; // Base URL for public access


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


// POST Handler for Deploying/Uploading
export async function POST(request: NextRequest) {
  try {
    if (!bucketName || !publicUrlBase || !LAMAN_API_KEY) {
      console.error('Server configuration error: Missing R2/Laman config');
      return NextResponse.json(
        { success: false, message: 'Server configuration error.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { htmlContent, domain } = body;

    if (!htmlContent) {
      return NextResponse.json(
        { success: false, message: 'Missing HTML content' },
        { status: 400 }
      );
    }

    const finalDomain = domain || generateDomain();
    const key = `website-generator/${finalDomain}/index.html`;
    const publicR2Url = `${publicUrlBase}/${key}`;

    // 1. Upload to R2
    console.log(`Uploading to R2 with key: ${key}`);
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: htmlContent,
      ContentType: 'text/html',
    });
    await s3Client.send(putCommand);
    console.log('Upload to R2 successful');

    // 2. Add Custom Domain via Laman.ai API
    console.log(`Calling laman.ai API to add domain: ${finalDomain}`);
    try {
      const response = await fetch('https://laman.ai/add-domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': LAMAN_API_KEY
        },
        body: JSON.stringify({ domain: finalDomain })
      });
      const data = await response.json();
      console.log('Laman.ai add-domain response:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.error('Failed to create custom domain via Laman.ai:', data);
      }

      const finalUrl = response.ok ? `https://${finalDomain}` : publicR2Url;
      console.log(`Deployment successful. URL: ${finalUrl}, Domain: ${finalDomain}`);
      return NextResponse.json({
        success: true,
        url: finalUrl,
        domain: finalDomain,
      });

    } catch (lamanError) {
      console.error('Error calling Laman.ai add-domain API:', lamanError);
      return NextResponse.json({
        success: true,
        url: publicR2Url,
        domain: finalDomain,
        message: 'Deployment to storage successful, but custom domain setup failed.',
      });
    }

  } catch (error) {
    console.error('Deploy (POST) error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Unknown error during deployment' },
      { status: 500 }
    );
  }
}


// DELETE Handler for Deleting a Deployment
export async function DELETE(request: NextRequest) {
  try {
    if (!bucketName || !LAMAN_API_KEY) {
      console.error('Server configuration error: Missing R2/Laman config');
      return NextResponse.json(
        { success: false, message: 'Server configuration error.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { domain } = body;

    if (!domain) {
      return NextResponse.json(
        { success: false, message: 'Missing domain' },
        { status: 400 }
      );
    }

    console.log(`Attempting to delete domain: ${domain}`);
    const key = `website-generator/${domain}/index.html`;

    // 1. Delete from R2
    console.log(`Deleting from R2 with key: ${key}`);
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    try {
      await s3Client.send(deleteCommand);
      console.log('Delete from R2 successful');
    } catch (r2Error) {
      console.error(`Error deleting from R2 (Key: ${key}):`, r2Error);
    }


    // 2. Remove Custom Domain via Laman.ai API
    console.log(`Calling laman.ai API to remove domain: ${domain}`);
    let lamanMessage = 'Attempted to remove custom domain.';
    try {
      const response = await fetch('https://laman.ai/remove-domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': LAMAN_API_KEY
        },
        body: JSON.stringify({ domain })
      });
      const data = await response.json();
      console.log('Laman.ai remove-domain response:', JSON.stringify(data, null, 2));

      if (response.ok) {
        console.log('Custom domain removal successful via Laman.ai');
        lamanMessage = 'Project deleted successfully (including custom domain).';
      } else {
        console.error('Failed to remove custom domain via Laman.ai:', data);
        lamanMessage = 'Project deleted from storage, but failed to remove custom domain.';
      }
    } catch (lamanError) {
      console.error('Error calling Laman.ai remove-domain API:', lamanError);
      lamanMessage = 'Project deleted from storage, but encountered an error removing custom domain.';
    }

    return NextResponse.json({
      success: true, // Consider if this should be false if laman fails
      message: lamanMessage,
    });

  } catch (error) {
    console.error('Delete (DELETE) error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Unknown error during deletion' },
      { status: 500 }
    );
  }
} 