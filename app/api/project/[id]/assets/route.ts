import { Asset, getWebProject, updateWebProject } from '@/lib/query';
import { deleteObject, putObject } from '@/lib/s3';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

function getAspectRatioAndOrientation(width: number, height: number) {
  function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
  }
  let aspectRatioStr = '';
  let orientation = '';
  if (width && height) {
    const divisor = gcd(width, height);
    const ratioW = width / divisor;
    const ratioH = height / divisor;
    aspectRatioStr = `${ratioW}:${ratioH}`;
    if (width === height) orientation = 'square';
    else if (width > height) orientation = 'landscape';
    else orientation = 'portrait';
  }
  return { aspectRatioStr, orientation };
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const project = getWebProject(id);
    if (!project) {
      return NextResponse.json({ success: false, message: 'WebProject not found' }, { status: 404 });
    }
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, message: 'No file uploaded' }, { status: 400 });
    }
    const filename = (file as File).name;
    const arrayBuffer = await (file as File).arrayBuffer();
    const contentType = (file as File).type || 'application/octet-stream';
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(contentType)) {
      return NextResponse.json({ success: false, message: 'Only PNG, JPEG, GIF, and WebP images are allowed' }, { status: 400 });
    }
    let uploadBuffer = Buffer.from(arrayBuffer);
    let uploadContentType = contentType;
    let uploadFilename = filename;
    // Get image metadata for aspect ratio
    let width = 0;
    let height = 0;
    try {
      const metadata = await sharp(uploadBuffer).metadata();
      width = metadata.width || 0;
      height = metadata.height || 0;
    } catch (err) {
      return NextResponse.json({ success: false, message: 'Failed to read image metadata' }, { status: 500 });
    }
    const { aspectRatioStr, orientation } = getAspectRatioAndOrientation(width, height);
    // Generate AI caption
    const { text: aiCaption } = await generateText({
      model: openai('gpt-4.1-nano'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `For the following image, provide a very detailed English description for use as metadata. Your response must include:\n- A concise, descriptive caption of the image.\n- A detailed assessment of the image quality (sharpness, clarity, noise, compression artifacts, etc.).\n- A very detailed description of the color palette, including dominant colors, secondary colors, and any notable color gradients or contrasts.\nFormat your response as follows:\nCaption: [your caption]\nQuality: [your quality assessment]\nColor Palette: [your detailed color palette description]\nColor Palette in hex: [your detailed color palette description in hex]\nRespond in English only. Do not include any other information or commentary.`,
            },
            { type: 'image', image: uploadBuffer, mimeType: contentType },
          ],
        },
      ],
    });
    const combinedCaption = `${aiCaption}\nAspect Ratio: ${aspectRatioStr} (${orientation})`;
    // Convert to webp if needed
    const needsWebp = contentType !== 'image/webp';
    try {
      const sharpInstance = sharp(uploadBuffer);
      if (needsWebp) {
        sharpInstance.webp();
        uploadContentType = 'image/webp';
        uploadFilename = filename.replace(/\.[^.]+$/, '.webp');
      }
      uploadBuffer = await sharpInstance
        .withMetadata({ exif: { IFD0: { ImageDescription: combinedCaption || '' } } })
        .toBuffer();
    } catch (err) {
      return NextResponse.json({ success: false, message: 'Failed to process image or embed metadata' }, { status: 500 });
    }
    const domain = project.domain;
    if (!domain) {
      return NextResponse.json({ success: false, message: 'Project does not have a domain' }, { status: 400 });
    }
    const key = `website-generator/${domain}/assets/${uploadFilename}`;
    await putObject(key, uploadBuffer, uploadContentType);
    const url = `https://${domain}/assets/${uploadFilename}`;
    const asset: Asset = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url,
      filename: uploadFilename,
      uploadedAt: new Date().toISOString(),
      type: uploadContentType,
      description: combinedCaption,
    };
    const updatedAssets = [...(project.assets || []), asset];
    updateWebProject(id, { assets: updatedAssets });
    return NextResponse.json({ success: true, asset });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const project = getWebProject(id);
    if (!project) {
      return NextResponse.json({ success: false, message: 'WebProject not found' }, { status: 404 });
    }
    const body = await request.json();
    const { assetId } = body;
    if (!assetId) {
      return NextResponse.json({ success: false, message: 'Missing assetId' }, { status: 400 });
    }
    const asset = (project.assets || []).find((a) => a.id === assetId);
    if (!asset) {
      return NextResponse.json({ success: false, message: 'Asset not found' }, { status: 404 });
    }
    const domain = project.domain;
    if (!domain) {
      return NextResponse.json({ success: false, message: 'Project does not have a domain' }, { status: 400 });
    }
    const key = `website-generator/${domain}/${asset.filename}`;
    await deleteObject(key);
    const updatedAssets = (project.assets || []).filter((a) => a.id !== assetId);
    updateWebProject(id, { assets: updatedAssets });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
} 