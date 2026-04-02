'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { Image as ImageIcon, Plus, Trash2, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import type { EventGalleryImage, UserRef } from './types';

interface EventGalleryProps {
  images: EventGalleryImage[];
  loading: boolean;
  onUpload: (imageUrl: string, caption?: string) => Promise<void>;
  onDelete: (imageId: string) => Promise<void>;
}

function getUploaderName(by: UserRef | string): string {
  if (typeof by === 'string') return by;
  return `${by.firstName} ${by.lastName}`;
}

export function EventGallery({ images, loading, onUpload, onDelete }: EventGalleryProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<EventGalleryImage | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!imageUrl.trim()) {
      toast.error('Please enter an image URL');
      return;
    }
    setUploading(true);
    try {
      await onUpload(imageUrl.trim(), caption.trim() || undefined);
      toast.success('Image uploaded');
      setUploadOpen(false);
      setImageUrl('');
      setCaption('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to upload image';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await onDelete(deleteId);
      toast.success('Image deleted');
      setDeleteId(null);
      setLightboxImage(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to delete image';
      toast.error(msg);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" />Add Image
        </Button>
      </div>

      {images.length === 0 ? (
        <EmptyState icon={ImageIcon} title="No Gallery Images" description="No images have been uploaded for this event." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => (
            <Card key={img.id} className="overflow-hidden group cursor-pointer" onClick={() => setLightboxImage(img)}>
              <div className="relative aspect-video bg-muted">
                <img src={img.imageUrl} alt={img.caption ?? 'Event photo'} className="h-full w-full object-cover" />
                <Button
                  variant="destructive"
                  size="icon-sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); setDeleteId(img.id); }}
                  aria-label="Delete photo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <CardContent className="p-3 space-y-1">
                {img.caption && <p className="text-sm font-medium">{img.caption}</p>}
                <p className="text-xs text-muted-foreground">
                  by {getUploaderName(img.uploadedBy)} - {formatDate(img.createdAt, 'dd MMM yyyy')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Upload Gallery Image</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Image URL *</Label>
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Caption</Label>
              <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Photo description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="sm:max-w-2xl p-0">
          {lightboxImage && (
            <div>
              <div className="relative">
                <img src={lightboxImage.imageUrl} alt={lightboxImage.caption ?? 'Event photo'} className="w-full rounded-t-xl" />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70"
                  onClick={() => setLightboxImage(null)}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-4 space-y-1">
                {lightboxImage.caption && <p className="font-medium">{lightboxImage.caption}</p>}
                <p className="text-xs text-muted-foreground">
                  Uploaded by {getUploaderName(lightboxImage.uploadedBy)} on {formatDate(lightboxImage.createdAt, 'dd MMM yyyy HH:mm')}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Image</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this image?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
