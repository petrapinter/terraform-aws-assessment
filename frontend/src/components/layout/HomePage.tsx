import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mediaApi } from '../../services/api';
import type { MediaItem, PaginatedResponse } from 'shared-types';
import MediaGrid from '../media/MediaGrid';
import MediaUpload from '../media/MediaUpload';
import '../../styles/HomePage.css';

export const HomePage = () => {
  const [page, setPage] = useState(1);
  const [allMedia, setAllMedia] = useState<MediaItem[]>([]);
  const [showUpload, setShowUpload] = useState(false);

  // Fetch media with React Query
  const { data, isLoading, isFetching, refetch } = useQuery<PaginatedResponse<MediaItem>>({
    queryKey: ['media', page],
    queryFn: () => mediaApi.getMedia(page),
  });

  // Update allMedia when new data is fetched
  useEffect(() => {
    if (data && !isLoading) {
      if (page === 1) {
        setAllMedia(data.data);
      } else {
        setAllMedia(prevMedia => [...prevMedia, ...data.data]);
      }
    }
  }, [data, isLoading, page]);

  const handleLoadMore = () => {
    if (data?.nextPage) {
      setPage(data.nextPage);
    }
  };

  const handleUploadSuccess = () => {
    setShowUpload(false);
    setPage(1);
    refetch();
  };

  return (
    <div className="home-page">
      <header className="app-header">
        <h1>Media Share</h1>
        <button 
          className="upload-button"
          onClick={() => setShowUpload(true)}
        >
          Upload New Media
        </button>
      </header>

      <main className="main-content">
        <MediaGrid 
          mediaItems={allMedia}
          loading={isLoading || isFetching}
          hasMore={data ? !!data.nextPage : false}
          onLoadMore={handleLoadMore}
        />
      </main>

      {showUpload && (
        <MediaUpload 
          onUploadSuccess={handleUploadSuccess}
          onCancel={() => setShowUpload(false)}
        />
      )}
    </div>
  );
};

export default HomePage;
