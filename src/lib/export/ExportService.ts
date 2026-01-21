import { saveAs } from 'file-saver';
import TurndownService from 'turndown';
// @ts-ignore
import html2pdf from 'html2pdf.js';
// @ts-ignore
import htmlToDocx from 'html-to-docx';

export class ExportService {
    private turndownService: TurndownService;

    constructor() {
        this.turndownService = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced'
        });
    }

    /**
     * Export HTML content as a Microsoft Word (.docx) file
     */
    async exportToDocx(title: string, htmlContent: string) {
        try {
            // html-to-docx expects a complete HTML document structure or at least body content
            const fullHtml = `<!DOCTYPE html><html><head><title>${title}</title></head><body>${htmlContent}</body></html>`;

            const data = await htmlToDocx(fullHtml, null, {
                title: title,
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
    async exportToPdf(title: string, elementOrHtml: HTMLElement | string) {
        try {
            const opt = {
                margin: 10,
                filename: `${title}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            if (typeof elementOrHtml === 'string') {
                // If string, create a temp container
                const container = document.createElement('div');
                container.innerHTML = `<h1>${title}</h1><br/>` + elementOrHtml;
                container.style.width = '800px'; // Force width for consistency
                // We might need to append to body briefly if styles depend on it, 
                // but html2pdf usually handles off-screen elements if passed directly.
                // However, for best styling, passing the actual editor DOM element ID is better.
                await html2pdf().set(opt).from(container).save();
            } else {
                await html2pdf().set(opt).from(elementOrHtml).save();
            }
        } catch (error) {
            console.error('PDF Export Failed:', error);
            throw error;
        }
    }

    /**
     * Export HTML content as Markdown (.md)
     */
    exportToMarkdown(title: string, htmlContent: string) {
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
    exportToHtml(title: string, htmlContent: string) {
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
