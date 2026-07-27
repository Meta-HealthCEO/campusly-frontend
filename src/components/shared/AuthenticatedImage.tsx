'use client';

import { useAuthenticatedBlobUrl } from '@/hooks/useAuthenticatedBlobUrl';

interface AuthenticatedImageProps {
  /** Path relative to the API base URL — e.g. `/ai-tools/markings/<id>/image/<filename>`. */
  path: string;
  alt: string;
  className?: string;
}

/**
 * Renders an image fetched from an auth-gated endpoint.
 *
 * Native `<img src>` requests don't include the Authorization header that the
 * axios client adds, so an image behind `authenticate` middleware will 401 for
 * a browser-initiated load. This component fetches the bytes via axios (which
 * has the token in its interceptor), turns them into a blob URL, and renders.
 * The blob URL is revoked on unmount or src change.
 */
export function AuthenticatedImage({ path, alt, className }: AuthenticatedImageProps) {
  const blobUrl = useAuthenticatedBlobUrl(path);

  if (!blobUrl) {
    return <div className={className} aria-label={alt} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={blobUrl} alt={alt} className={className} />;
}
