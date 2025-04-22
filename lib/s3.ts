import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const bucketName = process.env.R2_BUCKET_NAME!;

export { s3Client, bucketName };

export async function listObjects(prefix: string) {
  const listCommand = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: prefix,
  });
  return s3Client.send(listCommand);
}

export async function getObject(key: string) {
  const getCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  return s3Client.send(getCommand);
}

export async function putObject(key: string, body: any, contentType: string) {
  const putCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  return s3Client.send(putCommand);
}

export async function deleteObject(key: string) {
  const deleteCommand = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  return s3Client.send(deleteCommand);
} 