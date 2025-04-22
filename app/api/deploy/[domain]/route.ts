import { openai } from "@ai-sdk/openai";
import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
const bucketName = process.env.R2_BUCKET_NAME!;

function getAspectRatioAndOrientation(
  width: number,
  height: number
): { aspectRatioStr: string; orientation: string } {
  function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
  }
  let aspectRatioStr = "";
  let orientation = "";
  if (width && height) {
    const divisor = gcd(width, height);
    const ratioW = width / divisor;
    const ratioH = height / divisor;
    aspectRatioStr = `${ratioW}:${ratioH}`;
    if (width === height) {
      orientation = "square";
    } else if (width > height) {
      orientation = "landscape";
    } else {
      orientation = "portrait";
    }
  }
  return { aspectRatioStr, orientation };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { domain: string } }
) {
  try {
    const { domain } = params;
    if (!bucketName || !domain) {
      return NextResponse.json(
        { success: false, message: "Missing bucket or domain" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, message: "No file uploaded" },
        { status: 400 }
      );
    }
    const filename = (file as File).name;
    const arrayBuffer = await (file as File).arrayBuffer();
    const contentType = (file as File).type || "application/octet-stream";

    const allowedMimeTypes = [
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
    ];
    if (!allowedMimeTypes.includes(contentType)) {
      return NextResponse.json(
        {
          success: false,
          message: "Only PNG, JPEG, GIF, and WebP images are allowed",
        },
        { status: 400 }
      );
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
      return NextResponse.json(
        {
          success: false,
          message: "Failed to read image metadata",
        },
        { status: 500 }
      );
    }

    // Use the utility function
    const { aspectRatioStr, orientation } = getAspectRatioAndOrientation(
      width,
      height
    );

    const { text: aiCaption } = await generateText({
      model: openai("gpt-4.1-nano"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
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
            { type: "image", image: uploadBuffer, mimeType: contentType },
          ],
        },
      ],
    });

    // Combine AI caption with aspect ratio and orientation
    const combinedCaption = `${aiCaption}\nAspect Ratio: ${aspectRatioStr} (${orientation})`;

    console.log(combinedCaption);

    // For all images, embed the caption in EXIF and convert to WebP if needed
    const needsWebp = contentType !== "image/webp";
    try {
      const sharpInstance = sharp(uploadBuffer);
      if (needsWebp) {
        sharpInstance.webp();
        uploadContentType = "image/webp";
        uploadFilename = filename.replace(/\.[^.]+$/, ".webp");
      }
      uploadBuffer = await sharpInstance
        .withMetadata({
          exif: { IFD0: { ImageDescription: combinedCaption || "" } },
        })
        .toBuffer();
    } catch (err) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to process image or embed metadata",
        },
        { status: 500 }
      );
    }

    const key = `website-generator/${domain}/${uploadFilename}`;
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: uploadBuffer,
      ContentType: uploadContentType,
    });
    await s3Client.send(putCommand);
    return NextResponse.json({
      success: true,
      message: "File uploaded",
      filename: uploadFilename,
      caption: combinedCaption,
      aspectRatio: aspectRatioStr,
      orientation,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { domain: string } }
) {
  try {
    const { domain } = params;
    if (!bucketName || !domain) {
      return NextResponse.json(
        { success: false, message: "Missing bucket or domain" },
        { status: 400 }
      );
    }
    const body = await request.json();
    const { filename } = body;
    if (!filename) {
      return NextResponse.json(
        { success: false, message: "Missing filename" },
        { status: 400 }
      );
    }
    const key = `website-generator/${domain}/${filename}`;
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    await s3Client.send(deleteCommand);
    return NextResponse.json({
      success: true,
      message: "File deleted",
      filename,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { domain: string } }
) {
  try {
    const { domain } = params;
    if (!bucketName || !domain) {
      return NextResponse.json(
        { success: false, message: "Missing bucket or domain" },
        { status: 400 }
      );
    }
    const prefix = `website-generator/${domain}/`;
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
    });
    const data = await s3Client.send(listCommand);
    const files = (data.Contents || [])
      .map((item) => item.Key?.replace(prefix, ""))
      .filter((name) => name && name !== "index.html");
    return NextResponse.json({ success: true, files });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
