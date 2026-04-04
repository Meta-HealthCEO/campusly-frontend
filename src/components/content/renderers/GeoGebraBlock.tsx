'use client';

import type { ContentBlockItem } from '@/types';

interface GeoGebraBlockProps {
  block: ContentBlockItem;
}

/**
 * Embeds a GeoGebra applet. The block content should be a GeoGebra material ID
 * (e.g., "abc123de") or a full GeoGebra URL.
 *
 * Metadata can include:
 * - width: number (default 800)
 * - height: number (default 450)
 * - appName: 'graphing' | 'geometry' | 'classic' | '3d' (default 'graphing')
 * - showToolBar: boolean (default false)
 * - showAlgebraInput: boolean (default false)
 * - caption: string
 */
export function GeoGebraBlock({ block }: GeoGebraBlockProps) {
  const materialId = block.content.trim();
  const meta = block.metadata ?? {};
  const width = (meta.width as number) ?? 800;
  const height = (meta.height as number) ?? 450;
  const appName = (meta.appName as string) ?? 'graphing';
  const showToolBar = (meta.showToolBar as boolean) ?? false;
  const showAlgebraInput = (meta.showAlgebraInput as boolean) ?? false;

  // Support both material IDs and full URLs
  const isUrl = materialId.startsWith('http');
  const embedUrl = isUrl
    ? materialId
    : `https://www.geogebra.org/material/iframe/id/${materialId}/width/${width}/height/${height}/border/888888/sfsb/true/smb/false/stb/${showToolBar}/stbh/false/ai/${showAlgebraInput}/asb/false/sri/false/rc/false/ld/false/sdz/false/ctl/false`;

  // If content starts with "applet:", use the GeoGebra app directly
  const isApplet = materialId.startsWith('applet:');
  const appletUrl = isApplet
    ? `https://www.geogebra.org/${appName}`
    : embedUrl;

  return (
    <div className="space-y-2">
      <div className="relative w-full overflow-hidden rounded-lg border" style={{ maxWidth: width }}>
        <div style={{ paddingBottom: `${(height / width) * 100}%`, position: 'relative' }}>
          <iframe
            src={appletUrl}
            title={`GeoGebra: ${(meta.caption as string) ?? 'Interactive graph'}`}
            className="absolute inset-0 w-full h-full"
            style={{ border: 'none' }}
            allowFullScreen
            allow="fullscreen"
          />
        </div>
      </div>
      {typeof meta.caption === 'string' && (
        <p className="text-center text-xs text-muted-foreground">
          {meta.caption}
        </p>
      )}
    </div>
  );
}
