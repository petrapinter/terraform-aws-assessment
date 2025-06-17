import db from '../config/database';
import { minioClient, BUCKET_NAME } from '../config/storage';
import { config } from '../config/env';
import { generatePublicUrl, generateUniqueFilename } from './storageService';
import { generateVideoThumbnail } from './thumbnailService';
import type { MediaItem, PaginatedResponse, ThumbnailOptions } from 'shared-types';
import path from 'path';
import { Readable } from 'stream';
import { createLogger } from '../utils/logger';

const logger = createLogger('media-service');

// Using shared filename generator

// Check if file is video
const isVideo = (mimetype: string): boolean => {
  return mimetype.startsWith('video/');
};

// Get paginated media items
export const getMediaItems = async (
  page: number = 1, 
  limit: number = 12
): Promise<PaginatedResponse<MediaItem>> => {
  // Calculate offset based on page and limit
  const offset = (page - 1) * limit;
  
  // Get total count for pagination info
  const [{ count }] = await db('media_items')
    .count('id as count')
    .then(rows => rows as { count: string }[]);
  
  const totalItems = parseInt(count, 10);
  const totalPages = Math.ceil(totalItems / limit);
  
  // Get media items for current page
  const mediaItems = await db('media_items')
    .select('*')
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);
  
  // Check for videos that need thumbnails and generate them on-demand
  for (const item of mediaItems) {
    if (item.type === 'video') {
      const thumbnailUrl = await ensureVideoThumbnail(item);
      if (thumbnailUrl) {
        item.thumbnail_url = thumbnailUrl;
      }
    }
  }
  
  // Get comments for all media items
  const mediaIds = mediaItems.map(item => item.id);
  const comments = mediaIds.length > 0
    ? await db('comments')
        .select('*')
        .whereIn('media_id', mediaIds)
        .orderBy('created_at', 'asc')
    : [];
  
  // Map database records to MediaItem type
  const mappedItems: MediaItem[] = mediaItems.map(item => ({
    id: item.id,
    type: item.type,
    url: item.url,
    thumbnailUrl: item.thumbnail_url || undefined,
    uploaderName: item.uploader_name,
    description: item.description,
    createdAt: item.created_at.toISOString(),
    comments: comments
      .filter(comment => comment.media_id === item.id)
      .map(comment => ({
        id: comment.id,
        mediaId: comment.media_id,
        author: comment.author,
        content: comment.content,
        createdAt: comment.created_at.toISOString()
      }))
  }));
  
  // Calculate next page or null if at the end
  const nextPage = page < totalPages ? page + 1 : null;
  
  return {
    data: mappedItems,
    nextPage,
    totalPages,
    totalItems
  };
};

// Fetch file from MinIO storage
const fetchFromMinio = async (objectName: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    let data: Buffer[] = [];
    
    minioClient.getObject(BUCKET_NAME, objectName)
      .then((stream: Readable) => {
        stream.on('data', (chunk) => {
          data.push(chunk);
        });
        
        stream.on('end', () => {
          resolve(Buffer.concat(data));
        });
        
        stream.on('error', (err) => {
          reject(err);
        });
      })
      .catch(reject);
  });
};

/**
 * Check if a video needs a thumbnail and generate one on-demand
 */
const ensureVideoThumbnail = async (mediaItem: any): Promise<string | null> => {
  // Skip if not a video or if thumbnail already exists and is not the same as the video URL
  if (mediaItem.type !== 'video' || 
     (mediaItem.thumbnail_url && mediaItem.thumbnail_url !== mediaItem.url)) {
    return mediaItem.thumbnail_url;
  }
  
  try {
    logger.info(`Generating thumbnail on-demand for video: ${mediaItem.id}`);
    
    // Extract object name from URL (assuming URL format is /media-sharing/objectName)
    const objectName = mediaItem.url.replace('/media-sharing/', '');
    
    // Fetch video content from MinIO
    const videoBuffer = await fetchFromMinio(objectName);
    logger.debug(`Fetched video content for thumbnail generation: ${objectName} (${videoBuffer.length} bytes)`);
    
    // Generate thumbnail with options
    const thumbnailOptions: ThumbnailOptions = {
      timeMarkSeconds: 1,
      format: 'jpg' as 'jpg', // Type assertion to tell TypeScript this is specifically the literal 'jpg'
      width: 320,  // Reasonable thumbnail width
      height: 180  // 16:9 aspect ratio
    };
    
    const thumbnailName = await generateVideoThumbnail(videoBuffer, objectName, thumbnailOptions);
    const thumbnailUrl = generatePublicUrl(thumbnailName);
    
    // Update database record with new thumbnail URL
    await db('media_items')
      .where('id', mediaItem.id)
      .update({ thumbnail_url: thumbnailUrl });
    
    logger.info(`Generated on-demand thumbnail for video ${mediaItem.id}: ${thumbnailUrl}`);
    
    return thumbnailUrl;
  } catch (error) {
    logger.error(`Failed to generate thumbnail for video ${mediaItem.id}`, error);
    return null;
  }
};

/**
 * Get a single media item by ID
 */
export const getMediaById = async (id: string): Promise<MediaItem | null> => {
  const mediaItem = await db('media_items')
    .select('*')
    .where({ id })
    .first();
  
  if (!mediaItem) {
    return null;
  }

  // If this is a video, ensure it has a thumbnail (generate on-demand if needed)
  if (mediaItem.type === 'video') {
    const thumbnailUrl = await ensureVideoThumbnail(mediaItem);
    if (thumbnailUrl) {
      mediaItem.thumbnail_url = thumbnailUrl;
    }
  }
  
  const comments = await db('comments')
    .select('*')
    .where({ media_id: id })
    .orderBy('created_at', 'asc');
  
  return {
    id: mediaItem.id,
    type: mediaItem.type,
    url: mediaItem.url,
    thumbnailUrl: mediaItem.thumbnail_url || undefined,
    uploaderName: mediaItem.uploader_name,
    description: mediaItem.description,
    createdAt: mediaItem.created_at.toISOString(),
    comments: comments.map(comment => ({
      id: comment.id,
      mediaId: comment.media_id,
      author: comment.author,
      content: comment.content,
      createdAt: comment.created_at.toISOString()
    }))
  };
};

/**
 * Upload a media file to storage and create database record
 */
export const uploadMedia = async (
  file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  },
  uploaderName: string,
  description: string,
  customFilename?: string
): Promise<MediaItem> => {
  // Determine media type from mimetype
  const type = isVideo(file.mimetype) ? 'video' : 'image';
  
  // Use the provided custom filename or generate a unique one
  const filename = customFilename || generateUniqueFilename(file.originalname);
  
  // Upload file to MinIO
  await minioClient.putObject(
    BUCKET_NAME,
    filename,
    file.buffer,
    {
      'Content-Type': file.mimetype,
    }
  );

  // Generate public URL for the uploaded file
  const fileUrl = generatePublicUrl(filename);
  
  // We no longer generate thumbnails during upload - they will be generated on-demand
  // Set thumbnailUrl to null for all media types - thumbnails for videos will be generated
  // when they are first accessed via the /api/media endpoint
  const thumbnailUrl = null;
  
  // Insert record into database
  const [mediaItem] = await db('media_items')
    .insert({
      type,
      url: fileUrl,
      thumbnail_url: thumbnailUrl,
      uploader_name: uploaderName,
      description
    })
    .returning('*');
  
  // Return the created media item
  return {
    id: mediaItem.id,
    type: mediaItem.type,
    url: mediaItem.url,
    thumbnailUrl: mediaItem.thumbnail_url || undefined,
    uploaderName: mediaItem.uploader_name,
    description: mediaItem.description,
    createdAt: mediaItem.created_at.toISOString(),
    comments: []
  };
};
