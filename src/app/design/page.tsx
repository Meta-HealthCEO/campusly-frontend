import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isDesignGalleryEnabled } from '@/lib/design/gallery';
import { DesignGallery } from '@/components/design-gallery/DesignGallery';

export const metadata: Metadata = {
  title: 'Blueprint gallery',
  robots: { index: false, follow: false },
};

export default function DesignPage() {
  if (!isDesignGalleryEnabled(process.env.NODE_ENV)) notFound();
  return <DesignGallery />;
}
