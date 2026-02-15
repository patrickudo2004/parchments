import { saveAs } from 'file-saver';
import TurndownService from 'turndown';
// @ts-ignore
import html2pdf from 'html2pdf.js/src/index.js';
// @ts-ignore
import htmlToDocx from 'html-to-docx';
import { parseScriptureReference } from '@/lib/scriptureParser';
import { dbHelpers } from '@/lib/db';

export interface ExportOptions {
    includeScripture?: boolean;
    bibleVersion?: string;
    author?: string;
}

export class ExportService {
    private turndownService: TurndownService;

    constructor() {
        this.turndownService = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced'
        });
    }

    /**
     * Enrich HTML content with scripture verse text
     */
    private async enrichContentWithScripture(htmlContent: string, versionId: string): Promise<string> {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

        // Find all scripture reference spans
        const scriptureSpans = doc.querySelectorAll('.scripture-ref');

        for (const span of Array.from(scriptureSpans)) {
            const refText = span.textContent?.trim();
            if (!refText) continue;

            const parsed = parseScriptureReference(refText);
            if (!parsed) continue;

            try {
                const verseText = await dbHelpers.getVerseText(
                    versionId,
                    parsed.book,
                    parsed.chapter,
                    parsed.verse || 1,
                    parsed.verseEnd
                );

                if (verseText) {
                    // Add verse text inline
                    span.innerHTML = `${refText} - <em>"${verseText}"</em>`;
                }
            } catch (error) {
                console.error('Failed to fetch verse:', error);
                // Keep original reference if fetch fails
            }
        }

        return doc.body.innerHTML;
    }

    /**
     * Export HTML content as a Microsoft Word (.docx) file
     */
    async exportToDocx(title: string, htmlContent: string, options?: ExportOptions) {
        // Enrich with scripture if requested
        if (options?.includeScripture && options?.bibleVersion) {
            htmlContent = await this.enrichContentWithScripture(htmlContent, options.bibleVersion);
        }
        try {
            // html-to-docx expects a complete HTML document structure or at least body content
            const fullHtml = `<!DOCTYPE html><html><head><title>${title}</title></head><body>${htmlContent}</body></html>`;

            const data = await htmlToDocx(fullHtml, null, {
                title: title,
                author: options?.author || 'Parchments User',
                orientation: 'portrait',
            });

            // Ensure data is a Blob (it might be a Node Buffer due to polyfills)
            const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            saveAs(blob, `${title}.docx`);
        } catch (error) {
            console.error('DoCX Export Failed:', error);
            throw error;
        }
    }

    /**
     * Export a DOM element or HTML string as PDF
     * Note: html2pdf works best with a visible DOM element, but we can pass a string too.
     */
    async exportToPdf(title: string, elementOrHtml: HTMLElement | string, options?: ExportOptions) {
        // Enrich with scripture if requested and input is string
        if (options?.includeScripture && options?.bibleVersion && typeof elementOrHtml === 'string') {
            elementOrHtml = await this.enrichContentWithScripture(elementOrHtml, options.bibleVersion);
        }
        try {
            const opt = {
                margin: [15, 15, 15, 15] as [number, number, number, number], // top, right, bottom, left in mm
                filename: `${title}.pdf`,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    letterRendering: true,
                    logging: false
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: 'portrait' as const,
                    compress: true
                },
                pagebreak: {
                    mode: ['avoid-all', 'css', 'legacy'] as any,
                    before: '.page-break-before',
                    after: '.page-break-after',
                    avoid: ['img', 'table', 'tr', 'td']
                }
            };

            const pdfObj = html2pdf().set(opt).from(typeof elementOrHtml === 'string' ? elementOrHtml : elementOrHtml);

            // Set PDF metadata if author is provided
            if (options?.author) {
                // Note: html2pdf uses jsPDF internally. We can access the worker.
                pdfObj.toPdf().get('pdf').then((pdf: any) => {
                    pdf.setProperties({
                        title: title,
                        author: options.author,
                        creator: 'Parchments Scripture IDE'
                    });
                });
            }

            if (typeof elementOrHtml === 'string') {
                // If string, create a temp container with better formatting
                const container = document.createElement('div');
                container.innerHTML = `<h1 style="margin-bottom: 20px; font-size: 24px; font-weight: bold;">${title}</h1>` + elementOrHtml;

                // Apply styles to prevent clipping
                container.style.width = '180mm'; // A4 width minus margins
                container.style.maxWidth = '180mm';
                container.style.color = '#000000';
                container.style.background = '#ffffff';
                container.style.padding = '0';
                container.style.fontSize = '12pt';
                container.style.lineHeight = '1.6';
                container.style.fontFamily = 'Georgia, serif';
                container.style.wordWrap = 'break-word';
                container.style.overflowWrap = 'break-word';

                // Fix all child elements to prevent overflow
                const allElements = container.getElementsByTagName('*');
                for (let i = 0; i < allElements.length; i++) {
                    const el = allElements[i] as HTMLElement;
                    el.style.color = '#000000';
                    el.style.backgroundColor = 'transparent';
                    el.style.borderColor = '#cccccc';
                    el.style.maxWidth = '100%';
                    el.style.wordWrap = 'break-word';
                    el.style.overflowWrap = 'break-word';

                    // Fix specific elements
                    if (el.tagName === 'P') {
                        el.style.marginBottom = '12px';
                        el.style.lineHeight = '1.6';
                    }
                    if (el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3') {
                        el.style.pageBreakAfter = 'avoid';
                        el.style.marginTop = '16px';
                        el.style.marginBottom = '8px';
                    }
                }

                await html2pdf().set(opt).from(container).save();
            } else {
                // For element, we clone it to modify styles without affecting UI
                const clone = elementOrHtml.cloneNode(true) as HTMLElement;
                const container = document.createElement('div');
                container.appendChild(clone);

                // Force styles on container and children
                container.style.width = '180mm';
                container.style.maxWidth = '180mm';
                container.style.color = '#000000';
                container.style.background = '#ffffff';
                container.style.padding = '0';
                container.style.fontSize = '12pt';
                container.style.lineHeight = '1.6';
                container.style.fontFamily = 'Georgia, serif';
                container.style.wordWrap = 'break-word';
                container.style.overflowWrap = 'break-word';

                // Force text color on all children to override dark mode classes
                const allElements = container.getElementsByTagName('*');
                for (let i = 0; i < allElements.length; i++) {
                    const el = allElements[i] as HTMLElement;
                    el.style.color = '#000000';
                    el.style.backgroundColor = 'transparent';
                    el.style.borderColor = '#cccccc';
                    el.style.maxWidth = '100%';
                    el.style.wordWrap = 'break-word';
                    el.style.overflowWrap = 'break-word';

                    if (el.tagName === 'P') {
                        el.style.marginBottom = '12px';
                        el.style.lineHeight = '1.6';
                    }
                    if (el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3') {
                        el.style.pageBreakAfter = 'avoid';
                        el.style.marginTop = '16px';
                        el.style.marginBottom = '8px';
                    }
                }

                await html2pdf().set(opt).from(container).save();
            }
        } catch (error) {
            console.error('PDF Export Failed:', error);
            throw error;
        }
    }

    /**
     * Export HTML content as Markdown (.md)
     */
    async exportToMarkdown(title: string, htmlContent: string, options?: ExportOptions) {
        // Enrich with scripture if requested
        if (options?.includeScripture && options?.bibleVersion) {
            htmlContent = await this.enrichContentWithScripture(htmlContent, options.bibleVersion);
        }
        try {
            const markdown = this.turndownService.turndown(htmlContent);
            // Add a title header
            const finalContent = `# ${title}\n\n${markdown}`;
            const blob = new Blob([finalContent], { type: 'text/markdown;charset=utf-8' });
            saveAs(blob, `${title}.md`);
        } catch (error) {
            console.error('Markdown Export Failed:', error);
            throw error;
        }
    }

    /**
     * Export HTML content as HTML (.html)
     */
    async exportToHtml(title: string, htmlContent: string, options?: ExportOptions) {
        // Enrich with scripture if requested
        if (options?.includeScripture && options?.bibleVersion) {
            htmlContent = await this.enrichContentWithScripture(htmlContent, options.bibleVersion);
        }
        const fullHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
        img { max-width: 100%; }
        blockquote { border-left: 4px solid #ccc; margin: 0; padding-left: 16px; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${htmlContent}
</body>
</html>`;
        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        saveAs(blob, `${title}.html`);
    }

    /**
     * Export content as Plain Text (.txt)
     */
    exportToTxt(title: string, textContent: string) {
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, `${title}.txt`);
    }
}

export const exportService = new ExportService();
