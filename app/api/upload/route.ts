import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// API key for laman.ai
const LAMAN_API_KEY = process.env.LAMAN_API_KEY || 'REMOVED_API_KEY<<';

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
  console.log('Upload API called');
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

    console.log(`Uploading to R2 with key: ${key}`);
    await s3Client.send(putCommand);
    console.log('Upload to R2 successful');

    // Now we need to create a custom domain URL in the format {projectid}.laman.ai
    console.log('----------------------------------------');
    console.log('CUSTOM DOMAIN CREATION PROCESS STARTING');
    console.log(`Creating custom domain for project ID: ${finalProjectId}`);
    
    // Create custom domain URL
    const customDomain = `${finalProjectId}.laman.ai`;
    
    console.log(`Custom domain URL: ${customDomain}`);
    
    try {
      // Call the laman.ai API to add the domain
      console.log(`Calling laman.ai API to add domain: ${customDomain}`);
      const response = await fetch('https://laman.ai/add-domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': LAMAN_API_KEY
        },
        body: JSON.stringify({
          domain: customDomain
        })
      });
      
      const data = await response.json();
      console.log('Custom domain API response:', JSON.stringify(data, null, 2));
      
      if (!response.ok) {
        console.error('Failed to create custom domain:', JSON.stringify(data, null, 2));
        // Continue with the original response even if custom domain creation fails
      }
      
      // Return success response with both URLs
      console.log(`Returning success response with custom URL: ${customDomain}`);
      console.log('CUSTOM DOMAIN CREATION PROCESS COMPLETED');
      console.log('----------------------------------------');
      return NextResponse.json({
        success: true,
        url: `https://${customDomain}`,
        projectId: finalProjectId,
      });
    } catch (error) {
      console.error('Custom domain creation error:', error instanceof Error ? error.message : error);
      console.log('CUSTOM DOMAIN CREATION PROCESS FAILED');
      console.log('----------------------------------------');
      // Return success response with the R2 URL as fallback if custom domain creation fails
      return NextResponse.json({
        success: true,
        url: publicUrl,
        projectId: finalProjectId,
      });
    }
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