/**
 * Media item interface representing an image or video
 */
export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  uploaderName: string;
  description: string;
  createdAt: string;
  comments: Comment[];
}

/**
 * Comment interface for comments on media items
 */
export interface Comment {
  id: string;
  mediaId: string;
  author: string;
  content: string;
  createdAt: string;
}

/**
 * Generic paginated response interface for API endpoints
 */
export interface PaginatedResponse<T> {
  data: T[];
  nextPage: number | null;
  totalPages: number;
  totalItems: number;
}

/**
 * Media upload request interface
 */
export interface MediaUploadRequest {
  file: File;
  uploaderName: string;
  description: string;
  type: 'image' | 'video';
}

/**
 * Comment creation request interface
 */
export interface CommentCreateRequest {
  author: string;
  content: string;
}

/**
 * Storage configuration interface
 */
export interface StorageConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region: string;
  publicUrl: string;
  internalEndpoint?: string;
}

/**
 * Response for presigned URL generation
 */
export interface PresignedUrlResponse {
  presignedUrl: string;
  mediaId: string;
  objectName: string;
}

/**
 * API response for error conditions
 */
export interface ApiErrorResponse {
  error: string;
  details?: string;
}

/**
 * Types for media endpoints
 */
export interface GetMediaParams {
  page?: number;
  limit?: number;
}

/**
 * Types for direct upload request
 */
export interface DirectUploadMetadata {
  uploaderName: string;
  description: string;
  objectName?: string;
}

/**
 * Response for media upload
 */
export interface UploadResponse {
  mediaItem: MediaItem;
}

/**
 * Thumbnail generation options
 */
export interface ThumbnailOptions {
  timeMarkSeconds?: number;
  format?: 'jpg' | 'png';
  width?: number;
  height?: number;
}

/**
 * Log levels for application logging
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * Log message structure
 */
export interface LogMessage {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  data?: Record<string, unknown>;
}
