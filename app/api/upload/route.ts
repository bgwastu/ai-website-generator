import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// Initialize S3 client with R2 configuration
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    const bucketName = process.env.R2_BUCKET_NAME;
    const publicUrlBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

    if (!bucketName || !publicUrlBase) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Server configuration error: Missing R2 bucket name or public URL base' 
        },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { htmlContent, projectId } = body;

    // Validate request body
    if (!htmlContent) {
      return NextResponse.json(
        { success: false, message: 'Missing HTML content' },
        { status: 400 }
      );
    }

    // Determine final project ID (use provided or generate new one)
    const finalProjectId = projectId || randomUUID();

    // Construct S3 key and public URL
    const key = `website-generator/${finalProjectId}/index.html`;
    const publicUrl = `${publicUrlBase}/${key}`;

    // Upload to R2
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: htmlContent,
      ContentType: 'text/html',
    });

    await s3Client.send(putCommand);

    // Return success response
    return NextResponse.json({
      success: true,
      publicUrl,
      projectId: finalProjectId,
    });
  } catch (error) {
    console.error('R2 upload error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred during upload' 
      },
      { status: 500 }
    );
  }
}