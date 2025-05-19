// lib/s3-utils.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export type ImageCategory = 
  | 'detailers'
  | 'partners'
  | 'team'
  | 'icon'
  | 'avatars'
  | 'features';

export type MediaCategory = ImageCategory | 'videos';

export async function uploadImage(
  file: Buffer,
  category: ImageCategory,
  fileName: string
) {
  try {
    const isSvg = fileName.endsWith('.svg');
    let uploadBuffer = file;
    let contentType = 'image/jpeg';
    if (isSvg) {
      contentType = 'image/svg+xml';
    } else {
      // Optimize image based on category
      uploadBuffer = await sharp(file)
        .resize(getResizeDimensions(category))
        .jpeg({ quality: getQualitySettings(category) })
        .toBuffer();
    }

    const key = `${category}/${fileName}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: uploadBuffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000',
      })
    );

    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
}

export async function uploadVideo(
  file: Buffer,
  category: MediaCategory,
  fileName: string,
  contentType: string
) {
  try {
    const key = `${category}/${fileName}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000',
      })
    );

    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  } catch (error) {
    console.error('Error uploading video to S3:', error);
    throw error;
  }
}

export async function deleteImageFromS3(key: string) {
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: key,
      })
    );
    return true;
  } catch (error) {
    console.error('Error deleting from S3:', error);
    throw error;
  }
}

function getResizeDimensions(category: ImageCategory) {
  switch (category) {
    case 'detailers':
      return { width: 1200, height: 800, fit: 'inside' as const };
    case 'avatars':
      return { width: 200, height: 200, fit: 'cover' as const };
    case 'icons':
      return { width: 64, height: 64, fit: 'contain' as const };
    default:
      return { width: 1000, height: 1000, fit: 'inside' as const };
  }
}

function getQualitySettings(category: ImageCategory) {
  // Implement quality settings based on category
  return 80;
}

function getContentType(fileName: string) {
  // Implement content type based on file name
  return 'image/jpeg';
}