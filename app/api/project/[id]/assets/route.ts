import { Asset, getWebProject, updateWebProject } from '@/lib/query';
import { deleteObject, putObject } from '@/lib/s3';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { generateId } from '@/lib/utils';

function getAspectRatioAndOrientation(width: number, height: number) {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  
  if (!width || !height) return { aspectRatioStr: '', orientation: '' };
  
  const divisor = gcd(width, height);
  const ratioW = width / divisor;
  const ratioH = height / divisor;
  const aspectRatioStr = `${ratioW}:${ratioH}`;
  
  let orientation = 'square';
  if (width > height) orientation = 'landscape';
  else if (width < height) orientation = 'portrait';
  
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
      return NextResponse.json({ 
        success: false, 
        message: 'Only PNG, JPEG, GIF, and WebP images are allowed' 
      }, { status: 400 });
    }

    let uploadBuffer = Buffer.from(arrayBuffer);
    let uploadContentType = contentType;
    let uploadFilename = filename;
    
    let metadata;
    try {
      metadata = await sharp(uploadBuffer).metadata();
    } catch (err) {
      console.error('Failed to read image metadata:', err);
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to read image metadata' 
      }, { status: 500 });
    }

    const { width = 0, height = 0 } = metadata;
    const { aspectRatioStr, orientation } = getAspectRatioAndOrientation(width, height);

    let aiCaption;
    try {
      const result = await generateText({
        model: openai('gpt-4.1-nano'),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `For the following image, provide a very detailed English description for use as metadata. Your response must include:
- A concise, descriptive caption of the image.
- A detailed assessment of the image quality (sharpness, clarity, noise, compression artifacts, etc.).
- A very detailed description of the color palette, including dominant colors, secondary colors, and any notable color gradients or contrasts.
Format your response as follows:
Caption: [your caption]
Quality: [your quality assessment]
Color Palette: [your detailed color palette description]
Color Palette in hex: [your detailed color palette description in hex]
Respond in English only. Do not include any other information or commentary.`,
              },
              { type: 'image', image: uploadBuffer, mimeType: contentType },
            ],
          },
        ],
      });
      aiCaption = result.text;
    } catch (err) {
      console.error('Failed to generate image caption:', err);
      aiCaption = 'No caption available';
    }

    const combinedCaption = `${aiCaption}\nAspect Ratio: ${aspectRatioStr} (${orientation})`;
    
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
      console.error('Failed to process image:', err);
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to process image or embed metadata' 
      }, { status: 500 });
    }

    if (!project.domain) {
      return NextResponse.json({ 
        success: false, 
        message: 'Project does not have a domain' 
      }, { status: 400 });
    }

    const key = `website-generator/${project.domain}/assets/${uploadFilename}`;
    try {
      await putObject(key, uploadBuffer, uploadContentType);
    } catch (err) {
      console.error('Failed to upload image to S3:', err);
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to upload image' 
      }, { status: 500 });
    }

    const url = `https://${project.domain}/assets/${uploadFilename}`;
    const asset: Asset = {
      id: generateId(),
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
    console.error('Error in asset upload:', error);
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
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

    if (!project.domain) {
      return NextResponse.json({ success: false, message: 'Project does not have a domain' }, { status: 400 });
    }

    const key = `website-generator/${project.domain}/assets/${asset.filename}`;
    try {
      await deleteObject(key);
    } catch (err) {
      console.error('Failed to delete asset from S3:', err);
      return NextResponse.json({ success: false, message: 'Failed to delete file from storage' }, { status: 500 });
    }

    const updatedAssets = (project.assets || []).filter((a) => a.id !== assetId);
    updateWebProject(id, { assets: updatedAssets });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in asset deletion:', error);
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 