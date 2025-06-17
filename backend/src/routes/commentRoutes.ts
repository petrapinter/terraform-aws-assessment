import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { addComment, getCommentsByMediaId } from '../services/commentService';

// Create a new Hono router
const commentRouter = new Hono();

// Schema validation
const commentSchema = z.object({
  author: z.string().min(1, 'Author name is required'),
  content: z.string().min(1, 'Comment content is required')
});

// GET /comments/:mediaId - Get comments for a media item
commentRouter.get('/:mediaId', async (c) => {
  const mediaId = c.req.param('mediaId');
  
  try {
    const comments = await getCommentsByMediaId(mediaId);
    return c.json(comments);
  } catch (error) {
    console.error(`Error fetching comments for media ${mediaId}:`, error);
    return c.json({ error: 'Failed to fetch comments' }, 500);
  }
});

// POST /comments/:mediaId - Add a comment to a media item
commentRouter.post('/:mediaId', zValidator('json', commentSchema), async (c) => {
  const mediaId = c.req.param('mediaId');
  const { author, content } = c.req.valid('json');
  
  try {
    const comment = await addComment(mediaId, author, content);
    return c.json(comment, 201);
  } catch (error) {
    console.error(`Error adding comment to media ${mediaId}:`, error);
    
    if (error instanceof Error && error.message === 'Media item not found') {
      return c.json({ error: 'Media item not found' }, 404);
    }
    
    return c.json({ error: 'Failed to add comment' }, 500);
  }
});

export default commentRouter;
