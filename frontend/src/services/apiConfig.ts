/**
 * API configuration for the media sharing platform
 */

// The API URL is injected at build time via environment variables
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// API endpoints
export const API_ENDPOINTS = {
  // Media endpoints
  MEDIA: {
    LIST: `${API_BASE_URL}/media`,
    GET: (id: string) => `${API_BASE_URL}/media/${id}`,
    UPLOAD: `${API_BASE_URL}/media`,
    UPLOAD_URL: `${API_BASE_URL}/media/upload-url`,
    DIRECT_UPLOAD: `${API_BASE_URL}/media/direct-upload`,
  },
  // Comment endpoints
  COMMENTS: {
    LIST: (mediaId: string) => `${API_BASE_URL}/comments/${mediaId}`,
    ADD: (mediaId: string) => `${API_BASE_URL}/comments/${mediaId}`,
  }
};
