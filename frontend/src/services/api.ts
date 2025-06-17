import axios from 'axios';
import { API_ENDPOINTS, API_BASE_URL } from './apiConfig';
import type { 
  MediaItem, 
  PaginatedResponse, 
  Comment, 
  PresignedUrlResponse, 
  GetMediaParams,
  UploadResponse
} from 'shared-types';

// Create a base axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Helper function to poll for media item until it's available
// This is defined outside the mediaApi object to avoid circular references
const pollForMediaItem = async (mediaId: string, maxAttempts: number = 5): Promise<MediaItem> => {
  console.log(`Starting to poll for media item ${mediaId}, max attempts: ${maxAttempts}`);
  
  let attempts = 0;
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  while (attempts < maxAttempts) {
    try {
      attempts++;
      console.log(`Attempt ${attempts}/${maxAttempts} to fetch media item ${mediaId}`);
      
      const response = await api.get(API_ENDPOINTS.MEDIA.GET(mediaId));
      const mediaItem = response.data;
      
      // Check if the media item exists and has a valid URL
      if (mediaItem && mediaItem.url) {
        console.log(`Successfully fetched media item on attempt ${attempts}`);
        return mediaItem;
      }
      
      // If we get here, the media item exists but the file might not be accessible yet
      console.log('Media record exists but file might not be fully uploaded yet. Waiting...');
    } catch (error) {
      console.log(`Error fetching media item on attempt ${attempts}:`, error);
    }
    
    // Wait longer between each attempt
    const waitTime = 1000 * attempts; // Increase wait time with each attempt
    console.log(`Waiting ${waitTime}ms before next attempt...`);
    await delay(waitTime);
  }
  
  throw new Error(`Media item not available after ${maxAttempts} attempts. It may still be processing.`);
};

// Media API
export const mediaApi = {
  // Get paginated media items
  getMedia: async (page: number = 1, limit: number = 12): Promise<PaginatedResponse<MediaItem>> => {
    const params: GetMediaParams = { page, limit };
    const response = await api.get(API_ENDPOINTS.MEDIA.LIST, {
      params
    });
    return response.data;
  },
  
  // Get a single media item by ID
  getMediaById: async (id: string): Promise<MediaItem> => {
    const response = await api.get(API_ENDPOINTS.MEDIA.GET(id));
    return response.data;
  },
  
  // Upload a new media item directly
  uploadMediaDirect: async (formData: FormData): Promise<MediaItem> => {
    const response = await api.post(API_ENDPOINTS.MEDIA.UPLOAD, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    const uploadResponse = response.data as UploadResponse;
    return uploadResponse.mediaItem;
  },
  
  // Upload a new media item using presigned URL approach
  uploadMedia: async (file: File, uploaderName: string, description: string): Promise<MediaItem> => {
    // Step 1: Get a presigned URL from the server
    console.log('Requesting presigned URL for:', { fileName: file.name, uploaderName, description });
    
    const getUrlResponse = await api.post(API_ENDPOINTS.MEDIA.UPLOAD_URL, {
      fileName: file.name,
      fileType: file.type,
      uploaderName,
      description
    });
    
    // Extract the presigned URL and mediaId from the response
    const { presignedUrl, mediaId, objectName } = getUrlResponse.data as PresignedUrlResponse;
    console.log('Received presigned URL and media ID:', { presignedUrl, mediaId, objectName });
    
    // Step 2: Upload the file directly to MinIO using the presigned URL
    console.log('Uploading file directly to MinIO with presigned URL');
    try {
      // We need to use fetch for this direct S3/MinIO upload as axios may not handle it correctly
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status: ${uploadResponse.status}`);
      }
      
      console.log('File uploaded successfully to MinIO');
    } catch (error) {
      console.error('Error uploading file to MinIO:', error);
      throw error;
    }
    
    // Step 3: Retrieve the media item details with polling to ensure the file is accessible
    console.log('Retrieving media item details for ID:', mediaId);
    return pollForMediaItem(mediaId, 10); // Poll up to 10 times
  },
  
  // Export the polling function as part of the API for external use
  pollForMediaAvailability: pollForMediaItem,
  
  // Get comments for a specific media item
  getCommentsByMediaId: async (mediaId: string): Promise<Comment[]> => {
    const response = await api.get(API_ENDPOINTS.COMMENTS.LIST(mediaId));
    return response.data;
  },
  
  // Add a comment to a media item
  addComment: async (mediaId: string, comment: { author: string; content: string }): Promise<Comment> => {
    const response = await api.post(API_ENDPOINTS.COMMENTS.ADD(mediaId), comment);
    return response.data;
  }
};

export default api;
