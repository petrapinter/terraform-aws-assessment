import { useState, useRef, useEffect } from 'react';
import type { MediaItem } from 'shared-types';
import MediaCard from './MediaCard';

import '../../styles/MediaGrid.css';
import MediaDetail from './MediaDetail';

interface MediaGridProps {
  mediaItems: MediaItem[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export const MediaGrid = ({ mediaItems, loading, hasMore, onLoadMore }: MediaGridProps) => {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [columns, setColumns] = useState(4);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);

  // Handle responsive grid columns based on screen width
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width > 1400) setColumns(5);
      else if (width > 1100) setColumns(4);
      else if (width > 800) setColumns(3);
      else if (width > 500) setColumns(2);
      else setColumns(1);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Setup intersection observer for infinite scrolling
  useEffect(() => {
    if (loadingRef.current && hasMore) {
      observerRef.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          onLoadMore();
        }
      }, { threshold: 0.1 });
      
      observerRef.current.observe(loadingRef.current);
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, hasMore, onLoadMore]);

  const handleCardClick = (media: MediaItem) => {
    setSelectedMedia(media);
  };

  const handleClose = () => {
    setSelectedMedia(null);
  };

  // Create CSS grid style with dynamic column count
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: '16px',
  };

  return (
    <div className="media-grid-container">
      <div className="media-grid" style={gridStyle}>
        {mediaItems.map(media => (
          <MediaCard 
            key={media.id} 
            media={media} 
            onClick={handleCardClick} 
          />
        ))}
      </div>
      
      {loading && <div className="media-loading-more">Loading more media...</div>}
      
      <div ref={loadingRef} className="load-more-trigger"></div>
      
      {selectedMedia && (
        <MediaDetail media={selectedMedia} onClose={handleClose} />
      )}
    </div>
  );
};

export default MediaGrid;
