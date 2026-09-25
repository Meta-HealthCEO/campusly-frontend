/** The /design gallery is a development reference; production builds 404 it (spec §5). */
export function isDesignGalleryEnabled(nodeEnv: string | undefined): boolean {
  return nodeEnv !== 'production';
}
