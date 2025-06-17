import fs from 'fs';
import path from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import { minioClient, BUCKET_NAME } from '../config/storage';
import { generateUniqueFilename } from './storageService';
import { createLogger } from '../utils/logger';
import { ThumbnailOptions } from 'shared-types';

const logger = createLogger('thumbnail-service');

/**
 * Generate a thumbnail from a video buffer
 */
export const generateVideoThumbnail = async (
  videoBuffer: Buffer,
  originalFilename: string,
  options?: ThumbnailOptions
): Promise<string> => {
  // Set default options
  const {
    timeMarkSeconds = 1,
    format = 'jpg',
    width,
    height
  } = options || {};
  // Create temporary files for processing with more unique names
  const tempDir = os.tmpdir();
  const uniqueId = Date.now() + '-' + Math.random().toString(36).substring(2, 10);
  const tempVideoPath = path.join(tempDir, `temp-video-${uniqueId}`);
  const tempThumbnailPath = path.join(tempDir, `temp-thumbnail-${uniqueId}.${format}`);
  
  logger.info(`Starting thumbnail generation for ${originalFilename}`, { options });
  logger.debug(`Temp video path: ${tempVideoPath}`);
  logger.debug(`Temp thumbnail path: ${tempThumbnailPath}`);
  
  try {
    // Write the video buffer to a temporary file
    fs.writeFileSync(tempVideoPath, videoBuffer);
    logger.debug(`Video buffer written to temporary file (${videoBuffer.length} bytes)`);
    
    // Generate thumbnail filename with the specified format
    const thumbnailName = generateUniqueFilename(originalFilename.replace(/\.\w+$/, `.${format}`));
    logger.debug(`Generated thumbnail name: ${thumbnailName}`);
    
    // Check if FFmpeg is available by running a simple command
    try {
      const ffmpegVersion = require('child_process').execSync('ffmpeg -version').toString();
      logger.debug(`FFmpeg is available: ${ffmpegVersion.split('\n')[0]}`);
    } catch (ffmpegCheckError) {
      logger.error('FFmpeg is not available', ffmpegCheckError);
      throw new Error('FFmpeg is not available on the system. Cannot generate thumbnails.');
    }
    
    // Create a promise to handle the async ffmpeg processing
    await new Promise<void>((resolve, reject) => {
      // Configure FFmpeg command with options
      const ffmpegCommand = ffmpeg(tempVideoPath)
        .on('start', (commandLine) => {
          logger.debug(`FFmpeg process started with command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          logger.debug(`FFmpeg progress`, progress);
        })
        .on('error', (err) => {
          logger.error('Error generating thumbnail', err);
          reject(err);
        })
        .on('end', () => {
          logger.info('FFmpeg processing completed successfully');
          resolve();
        });
      
      // Apply custom size if provided
      if (width || height) {
        ffmpegCommand.size(`${width || '?'}x${height || '?'}`);
      }
      
      // Take screenshot with configured options
      ffmpegCommand.screenshots({
        count: 1,
        folder: tempDir,
        filename: path.basename(tempThumbnailPath),
        timemarks: [`00:00:${String(timeMarkSeconds).padStart(2, '0')}`]
      });
    });
    
    // Verify the thumbnail was created
    if (!fs.existsSync(tempThumbnailPath)) {
      throw new Error(`Thumbnail file was not created at expected path: ${tempThumbnailPath}`);
    }
    
    // Read the generated thumbnail
    const thumbnailBuffer = fs.readFileSync(tempThumbnailPath);
    logger.debug(`Read thumbnail into buffer (${thumbnailBuffer.length} bytes)`);
    
    // Determine content type based on format
    const contentType = format === 'png' ? 'image/png' : 'image/jpeg';
    
    // Upload thumbnail to MinIO
    await minioClient.putObject(
      BUCKET_NAME,
      thumbnailName,
      thumbnailBuffer,
      {
        'Content-Type': contentType,
      }
    );
    
    logger.info(`Successfully uploaded thumbnail to MinIO: ${thumbnailName}`);
    
    return thumbnailName;
  } catch (error) {
    logger.error('Failed to generate thumbnail', error);
    throw error;
  } finally {
    // Clean up temporary files
    try {
      if (fs.existsSync(tempVideoPath)) {
        fs.unlinkSync(tempVideoPath);
        logger.debug(`Cleaned up temporary video file: ${tempVideoPath}`);
      }
      if (fs.existsSync(tempThumbnailPath)) {
        fs.unlinkSync(tempThumbnailPath);
        logger.debug(`Cleaned up temporary thumbnail file: ${tempThumbnailPath}`);
      }
    } catch (cleanupError) {
      logger.error('Error cleaning up temporary files', cleanupError);
    }
  }
};
