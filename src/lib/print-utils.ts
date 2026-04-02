interface PrintMetadata {
  label: string;
  value: string;
}

interface PrintOptions {
  title: string;
  subtitle?: string;
  metadata?: PrintMetadata[];
  bodyHtml: string;
}

/**
 * Opens a new window with print-friendly content and triggers print dialog.
 * Uses clean HTML with print-optimized CSS.
 */
export function printContent(options: PrintOptions): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const metadataHtml = options.metadata
    ? `<div class="metadata">${options.metadata
        .map((m) => `<span><strong>${m.label}:</strong> ${m.value}</span>`)
        .join('')}</div>`
    : '';

  const subtitleHtml = options.subtitle
    ? `<p style="text-align:center">${options.subtitle}</p>`
    : '';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${options.title}</title>
      <style>
        body { font-family: 'Times New Roman', serif; margin: 2cm; line-height: 1.6; color: #000; }
        h1 { text-align: center; font-size: 18pt; margin-bottom: 4px; }
        h2 { font-size: 14pt; margin-top: 20px; border-bottom: 1px solid #000; padding-bottom: 4px; }
        h3 { font-size: 12pt; margin-top: 16px; }
        .metadata { text-align: center; margin-bottom: 20px; font-size: 10pt; }
        .metadata span { margin: 0 12px; }
        .question { margin-bottom: 16px; page-break-inside: avoid; }
        .question-number { font-weight: bold; }
        .marks { float: right; font-weight: bold; }
        .section { margin-top: 24px; }
        .answer-lines { border-bottom: 1px dotted #999; height: 24px; margin: 4px 0; }
        .mcq-option { margin-left: 24px; }
        .model-answer { background: #f5f5f5; padding: 8px; margin: 8px 0; border-left: 3px solid #333; }
        .mark-allocation { margin-left: 16px; }
        .mark-allocation li { margin: 2px 0; }
        .common-mistakes { color: #666; font-style: italic; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0; }
        th, td { border: 1px solid #333; padding: 4px 8px; text-align: left; font-size: 10pt; }
        th { background: #eee; }
        @media print { body { margin: 1.5cm; } }
        @page { size: A4; margin: 1.5cm; }
      </style>
    </head>
    <body>
      <h1>${options.title}</h1>
      ${subtitleHtml}
      ${metadataHtml}
      <hr/>
      ${options.bodyHtml}
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
