import { config } from '../config/env';
import crypto from 'crypto';
import path from 'path';
import { minioClient } from '../config/storage';
import { createLogger } from '../utils/logger';
import { PresignedUrlResponse } from 'shared-types';

const BUCKET_NAME = config.storage.bucket;

const logger = createLogger('storage-service');

// Generate unique filename for uploads
export const generateUniqueFilename = (originalName: string): string => {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  return `${timestamp}-${randomString}${ext}`;
};

// Generate presigned URL for direct browser-to-MinIO uploads
export const generatePresignedUrl = async (
  originalFilename: string,
  contentType: string
): Promise<PresignedUrlResponse> => {
  // Generate a unique filename for the object
  const objectName = generateUniqueFilename(originalFilename);

  try {
    // Check if the bucket exists
    const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
    if (!bucketExists) {
      throw new Error('Storage bucket does not exist');
    }
    
    // Generate a presigned URL for uploading the object
    const presignedUrl = await minioClient.presignedPutObject(
      BUCKET_NAME,
      objectName,
      60 * 60 // 1 hour expiry
    );
    
    logger.info(`Generated presigned URL for direct upload`, {
      objectName,
      contentType,
      expirySeconds: 60 * 60
    });
    
    return {
      presignedUrl,
      objectName,
      mediaId: '' // This will be populated by the calling code
    };
  } catch (error) {
    logger.error('Error generating presigned URL', error);
    throw new Error(`Failed to generate presigned URL: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Create Nginx-proxied URL for media access
export const generatePublicUrl = (objectName: string): string => {
  // Generate URL that will be served through Nginx proxy to MinIO
  return `/media-sharing/${objectName}`;
};

// Store object in MinIO (server-side uploads)
export const storeObject = async (objectName: string, buffer: Buffer, contentType: string): Promise<void> => {
  try {
    await minioClient.putObject(BUCKET_NAME, objectName, buffer, {
      'Content-Type': contentType,
    });
    
    logger.info(`Stored object in MinIO`, {
      objectName, 
      contentType, 
      sizeBytes: buffer.length
    });
  } catch (error) {
    logger.error(`Failed to store object in MinIO`, { objectName, error });
    throw error;
  }
};
