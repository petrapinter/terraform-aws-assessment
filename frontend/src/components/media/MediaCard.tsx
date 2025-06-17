import { useState } from 'react';
import type { MediaItem } from 'shared-types';
import '../../styles/MediaCard.css';

interface MediaCardProps {
  media: MediaItem;
  onClick: (media: MediaItem) => void;
}

export const MediaCard = ({ media, onClick }: MediaCardProps) => {
  const [isLoading, setIsLoading] = useState(true);

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className="media-card" onClick={() => onClick(media)}>
      {isLoading && <div className="media-loading">Loading...</div>}
      
      {media.type === 'image' ? (
        <img 
          src={media.url} 
          alt={media.description} 
          className="media-image"
          onLoad={handleLoad}
          style={{ display: isLoading ? 'none' : 'block' }}
        />
      ) : (
        <div className="media-video-container">
          <img 
            src={media.thumbnailUrl || media.url} 
            alt={media.description} 
            className="media-thumbnail"
            onLoad={handleLoad}
            style={{ display: isLoading ? 'none' : 'block' }}
          />
          <div className="video-play-icon">▶</div>
        </div>
      )}
      
      <div className="media-info">
        <p className="media-uploader">By: {media.uploaderName}</p>
        <p className="media-description">{media.description}</p>
      </div>
    </div>
  );
};

export default MediaCard;
