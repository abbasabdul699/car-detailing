// lib/s3.ts
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from './aws-config';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export async function uploadToS3({
  file,
  businessName,
  type = 'gallery'
}: {
  file: Buffer;
  businessName: string;
  type?: 'profile' | 'gallery';
}) {
  try {
    // Optimize image before upload
    const optimizedBuffer = await sharp(file)
      .resize(1200, 800, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    const fileName = `${businessName.replace(/\s+/g, '-')}-${uuidv4()}.jpg`;
    const key = `detailers/${type}/${fileName}`;

    // Upload to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: optimizedBuffer,
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=31536000',
      })
    );

    // Generate URL
    const url = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
      }),
      { expiresIn: 604800 } // URL expires in 7 days
    );

    return {
      url,
      key,
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    throw error;
  }
}

export async function uploadVideoToS3({
  file,
  businessName,
  contentType,
  type = 'gallery'
}: {
  file: Buffer;
  businessName: string;
  contentType: string;
  type?: 'profile' | 'gallery';
}) {
  try {
    const fileExtension = contentType.split('/')[1];
    const fileName = `${businessName.replace(/\s+/g, '-')}-${uuidv4()}.${fileExtension}`;
    const key = `detailers/${type}/${fileName}`;

    // Upload to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000',
      })
    );

    // Generate URL
    const url = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
      }),
      { expiresIn: 604800 } // URL expires in 7 days
    );

    return {
      url,
      key,
    };
  } catch (error) {
    console.error('S3 video upload error:', error);
    throw error;
  }
}