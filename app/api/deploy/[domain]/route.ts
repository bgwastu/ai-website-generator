import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
const bucketName = process.env.R2_BUCKET_NAME!;

export async function POST(request: NextRequest, { params }: { params: { domain: string } }) {
  try {
    const { domain } = params;
    if (!bucketName || !domain) {
      return NextResponse.json({ success: false, message: 'Missing bucket or domain' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, message: 'No file uploaded' }, { status: 400 });
    }
    const filename = (file as File).name;
    const arrayBuffer = await (file as File).arrayBuffer();
    const contentType = (file as File).type || 'application/octet-stream';
    const key = `website-generator/${domain}/${filename}`;

    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: Buffer.from(arrayBuffer),
      ContentType: contentType,
    });
    await s3Client.send(putCommand);
    return NextResponse.json({ success: true, message: 'File uploaded', filename });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { domain: string } }) {
  try {
    const { domain } = params;
    if (!bucketName || !domain) {
      return NextResponse.json({ success: false, message: 'Missing bucket or domain' }, { status: 400 });
    }
    const body = await request.json();
    const { filename } = body;
    if (!filename) {
      return NextResponse.json({ success: false, message: 'Missing filename' }, { status: 400 });
    }
    const key = `website-generator/${domain}/${filename}`;
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    await s3Client.send(deleteCommand);
    return NextResponse.json({ success: true, message: 'File deleted', filename });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: { domain: string } }) {
  try {
    const { domain } = params;
    if (!bucketName || !domain) {
      return NextResponse.json({ success: false, message: 'Missing bucket or domain' }, { status: 400 });
    }
    const prefix = `website-generator/${domain}/`;
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
    });
    const data = await s3Client.send(listCommand);
    const files = (data.Contents || [])
      .map((item) => item.Key?.replace(prefix, ''))
      .filter((name) => name && name !== 'index.html');
    return NextResponse.json({ success: true, files });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
