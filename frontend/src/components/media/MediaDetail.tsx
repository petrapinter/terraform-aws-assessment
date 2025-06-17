import { useState, useEffect } from 'react';
import type { MediaItem, Comment } from 'shared-types';
import { mediaApi } from '../../services/api';
import '../../styles/MediaDetail.css';

interface MediaDetailProps {
  media: MediaItem;
  onClose: () => void;
}

export const MediaDetail = ({ media, onClose }: MediaDetailProps) => {
  const [comments, setComments] = useState<Comment[]>(media.comments);
  const [newComment, setNewComment] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  // Fetch fresh comments when component mounts
  useEffect(() => {
    const fetchComments = async () => {
      setIsLoadingComments(true);
      try {
        // Use the comments endpoint to get the latest comments
        const freshComments = await mediaApi.getCommentsByMediaId(media.id);
        setComments(freshComments);
      } catch (error) {
        console.error('Failed to fetch latest comments:', error);
      } finally {
        setIsLoadingComments(false);
      }
    };
    
    fetchComments();
  }, [media.id]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim() || !commentAuthor.trim()) return;
    
    try {
      const comment = await mediaApi.addComment(media.id, {
        author: commentAuthor,
        content: newComment
      });
      
      setComments([...comments, comment]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="media-detail-backdrop" onClick={handleBackdropClick}>
      <div className="media-detail-container">
        <button className="close-button" onClick={onClose}>×</button>
        
        <div className="media-detail-content">
          <div className="media-view">
            {media.type === 'image' ? (
              <img src={media.url} alt={media.description} className="detail-image" />
            ) : (
              <video src={media.url} controls className="detail-video">
                Your browser does not support the video tag.
              </video>
            )}
          </div>
          
          <div className="media-info-detail">
            <h2 className="media-title">Uploaded by: {media.uploaderName}</h2>
            <p className="media-desc">{media.description}</p>
            <p className="media-date">Posted on: {new Date(media.createdAt).toLocaleDateString()}</p>
            
            <div className="comments-section">
              <h3>Comments ({comments.length})</h3>
              
              <form onSubmit={handleAddComment} className="comment-form">
                <input
                  type="text"
                  placeholder="Your name"
                  value={commentAuthor}
                  onChange={(e) => setCommentAuthor(e.target.value)}
                  required
                />
                <textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  required
                ></textarea>
                <button type="submit">Post Comment</button>
              </form>
              
              <div className="comments-list">
                {isLoadingComments ? (
                  <p className="loading-comments">Loading comments...</p>
                ) : comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="comment">
                      <div className="comment-header">
                        <span className="comment-author">{comment.author}</span>
                        <span className="comment-date">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="comment-content">{comment.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="no-comments">No comments yet. Be the first to comment!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaDetail;
