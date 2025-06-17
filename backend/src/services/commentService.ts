import db from '../config/database';
import type { Comment } from 'shared-types';

/**
 * Add a comment to a media item
 */
export const addComment = async (
  mediaId: string,
  author: string,
  content: string
): Promise<Comment> => {
  // Verify the media item exists
  const mediaItem = await db('media_items')
    .select('id')
    .where({ id: mediaId })
    .first();
  
  if (!mediaItem) {
    throw new Error('Media item not found');
  }
  
  // Insert comment into database
  const [comment] = await db('comments')
    .insert({
      media_id: mediaId,
      author,
      content
    })
    .returning('*');
  
  // Map database record to Comment type
  return {
    id: comment.id,
    mediaId: comment.media_id,
    author: comment.author,
    content: comment.content,
    createdAt: comment.created_at.toISOString()
  };
};

/**
 * Get comments for a media item
 */
export const getCommentsByMediaId = async (mediaId: string): Promise<Comment[]> => {
  const comments = await db('comments')
    .select('*')
    .where({ media_id: mediaId })
    .orderBy('created_at', 'asc');
  
  return comments.map(comment => ({
    id: comment.id,
    mediaId: comment.media_id,
    author: comment.author,
    content: comment.content,
    createdAt: comment.created_at.toISOString()
  }));
};
