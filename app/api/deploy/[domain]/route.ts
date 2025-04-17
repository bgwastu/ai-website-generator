import { openai } from '@ai-sdk/openai';
import { DeleteObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

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

    const allowedMimeTypes = [
      'image/png', 'image/jpeg', 'image/gif', 'image/webp',
    ];
    if (!allowedMimeTypes.includes(contentType)) {
      return NextResponse.json({ success: false, message: 'Only PNG, JPEG, GIF, and WebP images are allowed' }, { status: 400 });
    }

    let uploadBuffer = Buffer.from(arrayBuffer);
    let uploadContentType = contentType;
    let uploadFilename = filename;

    // Generate AI caption for all images
    const { text: aiCaption } = await generateText({
      model: openai('gpt-4.1-nano'),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Generate a concise, descriptive caption for this image for use as metadata. Respond in English.' },
            { type: 'image', image: uploadBuffer, mimeType: contentType },
          ],
        },
      ],
    });
    // For all images, embed the caption in EXIF and convert to WebP if needed
    const needsWebp = contentType !== 'image/webp';
    try {
      const sharpInstance = sharp(uploadBuffer);
      if (needsWebp) {
        sharpInstance.webp();
        uploadContentType = 'image/webp';
        uploadFilename = filename.replace(/\.[^.]+$/, '.webp');
      }
      uploadBuffer = await sharpInstance
        .withMetadata({ exif: { IFD0: { ImageDescription: aiCaption || '' } } })
        .toBuffer();
    } catch (err) {
      return NextResponse.json({ success: false, message: 'Failed to process image or embed metadata' }, { status: 500 });
    }

    const key = `website-generator/${domain}/${uploadFilename}`;
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: uploadBuffer,
      ContentType: uploadContentType,
    });
    await s3Client.send(putCommand);
    return NextResponse.json({ success: true, message: 'File uploaded', filename: uploadFilename, caption: aiCaption });
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
