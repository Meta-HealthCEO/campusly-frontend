'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface RichTextViewProps {
  html: string;
  className?: string;
}

/**
 * Read-only rich text renderer. Uses TipTap's editor in non-editable mode so
 * we get the same schema as the editor — anything the editor can't produce
 * is stripped, which means we can render arbitrary input safely (no script
 * tags survive the StarterKit + Link schema).
 */
export function RichTextView({ html, className }: RichTextViewProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: true,
        autolink: false,
        HTMLAttributes: {
          class: 'text-primary underline underline-offset-2',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content: html,
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() === html) return;
    editor.commands.setContent(html, { emitUpdate: false });
  }, [editor, html]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        // Match the inline prose styles used by MarkdownView for consistency.
        `text-sm leading-relaxed text-foreground
         [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3
         [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2
         [&_p]:mb-3 [&_p]:leading-relaxed
         [&_ul]:mb-3 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1
         [&_ol]:mb-3 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1
         [&_li]:leading-relaxed
         [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/30
         [&_blockquote]:bg-primary/5 [&_blockquote]:py-3 [&_blockquote]:px-4 [&_blockquote]:rounded-r-lg
         [&_blockquote]:text-sm [&_blockquote]:italic
         [&_strong]:font-semibold
         [&_em]:italic
         [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2`,
        className,
      )}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
