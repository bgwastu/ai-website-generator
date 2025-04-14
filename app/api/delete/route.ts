import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
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

// API key for laman.ai
const LAMAN_API_KEY = process.env.LAMAN_API_KEY || 'REMOVED_API_KEY<<';

export async function POST(request: NextRequest) {
  console.log('Delete API called');
  try {
    // Validate environment variables
    const bucketName = process.env.R2_BUCKET_NAME;

    if (!bucketName) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Server configuration error: Missing R2 bucket name' 
        },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { projectId } = body;

    // Validate request body
    if (!projectId) {
      return NextResponse.json(
        { success: false, message: 'Missing projectId' },
        { status: 400 }
      );
    }

    console.log(`Deleting project with ID: ${projectId}`);

    // Construct S3 key
    const key = `website-generator/${projectId}/index.html`;

    // Delete from R2
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    console.log(`Deleting from R2 with key: ${key}`);
    await s3Client.send(deleteCommand);
    console.log('Delete from R2 successful');
    
    console.log('----------------------------------------');
    console.log('CUSTOM DOMAIN REMOVAL PROCESS STARTING');

    // Now we need to remove the custom domain
    console.log(`Removing custom domain for project ID: ${projectId}`);
    
    // Create custom domain URL
    const customDomain = `${projectId}.laman.ai`;
    console.log(`Custom domain URL: ${customDomain}`);
    
    try {
      // Call the laman.ai API to remove the domain
      console.log(`Calling laman.ai API to remove domain: ${customDomain}`);
      const response = await fetch('https://laman.ai/remove-domain', {
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
      console.log('Custom domain removal API response:', JSON.stringify(data, null, 2));
      
      if (!response.ok) {
        console.error('Failed to remove custom domain:', JSON.stringify(data, null, 2));
        // Continue with the original response even if custom domain removal fails
      }
      
      // Return success response
      console.log('CUSTOM DOMAIN REMOVAL PROCESS COMPLETED');
      console.log('----------------------------------------');
      return NextResponse.json({
        success: true,
        message: 'Project deleted successfully',
      });
    } catch (error) {
      console.error('Custom domain removal error:', error instanceof Error ? error.message : error);
      console.log('CUSTOM DOMAIN REMOVAL PROCESS FAILED');
      console.log('----------------------------------------');
      // Return success response for R2 deletion even if custom domain removal fails
      return NextResponse.json({
        success: true,
        message: 'Project deleted from R2 successfully, but failed to remove custom domain',
        customDomainError: error instanceof Error ? error.message : 'Unknown error occurred during custom domain removal'
      });
    }
  } catch (error) {
    console.error('R2 delete error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred during deletion' 
      },
      { status: 500 }
    );
  }
}