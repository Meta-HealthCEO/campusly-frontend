'use client';

import { useState } from 'react';
import { Edit, ExternalLink, Plus, Trash2, Video } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { VideoCard, VideoFilter, VideoUploadForm } from '@/components/classroom';
import { useVideoLibrary } from '@/hooks/useVideoLibrary';
import type { CreateVideoPayload, VideoFilters, VideoLesson } from '@/types';

const DEFAULT_FILTERS: VideoFilters = {};

export default function TeacherVideoLibraryPage() {
  const [filters, setFilters] = useState<VideoFilters>(DEFAULT_FILTERS);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editVideo, setEditVideo] = useState<VideoLesson | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const {
    videos,
    loading,
    fetchVideos,
    createVideo,
    updateVideo,
    deleteVideo,
  } = useVideoLibrary(DEFAULT_FILTERS);

  function handleFilterChange(updated: VideoFilters) {
    setFilters(updated);
    void fetchVideos(updated);
  }

  async function handleCreateVideo(data: CreateVideoPayload) {
    try {
      await createVideo(data);
      toast.success('Video saved');
      setUploadOpen(false);
      await fetchVideos(filters);
    } catch (err: unknown) {
      console.error('Failed to save video', err);
      toast.error('Failed to save video');
    }
  }

  async function handleUpdateVideo(data: CreateVideoPayload) {
    if (!editVideo) return;

    try {
      await updateVideo(editVideo.id, data);
      toast.success('Video updated');
      setEditVideo(null);
      await fetchVideos(filters);
    } catch (err: unknown) {
      console.error('Failed to update video', err);
      toast.error('Failed to update video');
    }
  }

  async function handleDeleteVideo(video: VideoLesson) {
    const confirmed = window.confirm(`Delete "${video.title}" from your video library?`);
    if (!confirmed) return;

    setActioningId(video.id);
    try {
      await deleteVideo(video.id);
      toast.success('Video deleted');
      await fetchVideos(filters);
    } catch (err: unknown) {
      console.error('Failed to delete video', err);
      toast.error('Failed to delete video');
    } finally {
      setActioningId(null);
    }
  }

  function handleOpenVideo(video: VideoLesson) {
    window.open(video.videoUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Video Library"
        description="Upload, publish, and manage lesson videos for your classes."
      >
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger render={(
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Video
            </Button>
          )}
          />
          <DialogContent className="flex max-h-[85vh] flex-col">
            <DialogHeader>
              <DialogTitle>Add Video</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-4">
              <VideoUploadForm onSubmit={handleCreateVideo} />
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <VideoFilter filters={filters} onChange={handleFilterChange} />

      {loading ? (
        <LoadingSpinner />
      ) : videos.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No videos found"
          description="Upload a lesson video or adjust your filters."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <div key={video.id} className="space-y-2">
              <VideoCard video={video} onClick={() => handleOpenVideo(video)} />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenVideo(video)}
                >
                  <ExternalLink className="mr-1 h-4 w-4" />
                  Open
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditVideo(video)}
                >
                  <Edit className="mr-1 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={actioningId === video.id}
                  onClick={() => handleDeleteVideo(video)}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={Boolean(editVideo)} onOpenChange={(open) => {
        if (!open) setEditVideo(null);
      }}
      >
        <DialogContent className="flex max-h-[85vh] flex-col">
          <DialogHeader>
            <DialogTitle>Edit Video</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {editVideo && (
              <VideoUploadForm
                video={editVideo}
                onSubmit={handleUpdateVideo}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
