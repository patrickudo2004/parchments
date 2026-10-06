import MarkdownIt from 'markdown-it';
import TurndownService from 'turndown';
import DOMPurify from 'dompurify';

type MarkdownItInstance = ReturnType<typeof MarkdownIt>;

export interface ParsedMarkdown {
    html: string;
    frontmatter: Record<string, any>;
    rawBody: string;
}

export class MarkdownService {
    private static mdParser: MarkdownItInstance | null = null;
    private static turndown: TurndownService | null = null;

    private static getParser(): MarkdownItInstance {
        if (!this.mdParser) {
            this.mdParser = new MarkdownIt({
                html: true,        // Allow HTML tags to pass through for custom styling
                linkify: true,     // Autoconvert URL-like text to links
                breaks: true,      // Convert '\n' in paragraphs to <br>
                typographer: true,
            });
        }
        return this.mdParser;
    }

    private static getTurndown(): TurndownService {
        if (!this.turndown) {
            const td = new TurndownService({
                headingStyle: 'atx',
                hr: '---',
                bulletListMarker: '-',
                codeBlockStyle: 'fenced',
                emDelimiter: '*',
            });

            // Preserve double-brackets for scripture quoting [[Reference]]
            const originalEscape = td.escape.bind(td);
            td.escape = (str: string) => {
                return originalEscape(str)
                    .replace(/\\\[\\\[/g, '[[')
                    .replace(/\\\]\\\]/g, ']]');
            };

            // Rule 1: Unwrap scripture-ref spans so markdown contains clean text (e.g. "1 Cor 14:4, 14-15")
            td.addRule('scriptureRef', {
                filter: (node) => {
                    return (
                        node.nodeName === 'SPAN' &&
                        (node.classList.contains('scripture-ref') || node.hasAttribute('data-scripture'))
                    );
                },
                replacement: (content) => content
            });

            // Rule 2: Preserve underline
            td.addRule('underline', {
                filter: ['u'],
                replacement: (content) => `<u>${content}</u>`
            });

            // Rule 3: Preserve highlight
            td.addRule('highlight', {
                filter: ['mark'],
                replacement: (content) => `<mark>${content}</mark>`
            });

            // Rule 4: Preserve text color/style spans if present
            td.addRule('styledSpan', {
                filter: (node) => {
                    return node.nodeName === 'SPAN' && !!node.getAttribute('style');
                },
                replacement: (content, node) => {
                    const style = (node as HTMLElement).getAttribute('style');
                    return style ? `<span style="${style}">${content}</span>` : content;
                }
            });

            // Rule 5: Images — use data-asset-name to produce clean relative Markdown paths
            td.addRule('imageAsset', {
                filter: (node) => node.nodeName === 'IMG',
                replacement: (_content, node) => {
                    const el = node as HTMLElement;
                    const assetName = el.getAttribute('data-asset-name');
                    const alt = el.getAttribute('alt') || 'image';
                    // Keep the same relative path as used by hydrateAssets
                    const src = assetName
                        ? `.assets/images/${assetName}`
                        : (el.getAttribute('src') || '');
                    return `\n\n![${alt}](${src})\n\n`;
                }
            });

            this.turndown = td;
        }
        return this.turndown;
    }

    /**
     * Check if a filename represents a Markdown file
     */
    static isMarkdownFile(filename: string): boolean {
        return /\.(md|markdown|mdown|mkdn)$/i.test(filename);
    }

    /**
     * Check if a filename represents an HTML file
     */
    static isHtmlFile(filename: string): boolean {
        return /\.(html|htm)$/i.test(filename);
    }

    /**
     * Parse YAML frontmatter if present at the start of the file.
     * Frontmatter is bounded by lines containing only '---'.
     */
    static parseFrontmatter(rawContent: string): { frontmatter: Record<string, any>; body: string } {
        const trimmed = rawContent.trimStart();
        if (!trimmed.startsWith('---')) {
            return { frontmatter: {}, body: rawContent };
        }

        const match = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
        if (!match) {
            return { frontmatter: {}, body: rawContent };
        }

        const frontmatterBlock = match[1];
        const body = match[2];
        const frontmatter: Record<string, any> = {};

        // Lightweight, resilient YAML key-value parser (no unsafe eval)
        const lines = frontmatterBlock.split(/\r?\n/);
        for (const line of lines) {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.slice(0, colonIndex).trim();
                let value = line.slice(colonIndex + 1).trim();

                // Strip quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }

                if (key) {
                    if (value.startsWith('[') && value.endsWith(']')) {
                        const items = value
                            .slice(1, -1)
                            .split(',')
                            .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
                            .filter(Boolean);
                        frontmatter[key] = items;
                    } else if (value.toLowerCase() === 'true') {
                        frontmatter[key] = true;
                    } else if (value.toLowerCase() === 'false') {
                        frontmatter[key] = false;
                    } else {
                        frontmatter[key] = value;
                    }
                }
            }
        }

        return { frontmatter, body };
    }

    /**
     * Serialize frontmatter object into a YAML header block
     */
    static serializeFrontmatter(frontmatter: Record<string, any>): string {
        const keys = Object.keys(frontmatter).filter(k => frontmatter[k] !== undefined && frontmatter[k] !== null && frontmatter[k] !== '');
        if (keys.length === 0) return '';

        const lines = ['---'];
        for (const key of keys) {
            const val = frontmatter[key];
            if (Array.isArray(val)) {
                const formattedItems = val.map(v => typeof v === 'string' && (v.includes(',') || v.includes(' ')) ? `"${v.replace(/"/g, '\\"')}"` : v).join(', ');
                lines.push(`${key}: [${formattedItems}]`);
            } else if (typeof val === 'string' && (val.includes(':') || val.includes('\n') || val.includes('"') || val.includes('#'))) {
                lines.push(`${key}: "${val.replace(/"/g, '\\"')}"`);
            } else {
                lines.push(`${key}: ${val}`);
            }
        }
        lines.push('---');
        return lines.join('\n') + '\n\n';
    }

    /**
     * Convert Markdown file content into TipTap-compatible HTML
     */
    static markdownToHtml(rawMarkdown: string): ParsedMarkdown {
        const { frontmatter, body } = this.parseFrontmatter(rawMarkdown);
        const parser = this.getParser();
        const rawHtml = parser.render(body);

        // Sanitize rendered HTML while preserving rich TipTap scripture tags and metadata
        const cleanHtml = DOMPurify.sanitize(rawHtml, {
            ADD_TAGS: ['mark', 'u', 's', 'sup', 'sub'],
            ADD_ATTR: [
                'data-book',
                'data-chapter',
                'data-verse',
                'data-verse-end',
                'data-segments',
                'data-scripture',
                'data-asset-name',
                'target',
                'rel',
                'class',
                'style'
            ]
        });

        return {
            html: cleanHtml,
            frontmatter,
            rawBody: body,
        };
    }

    /**
     * Convert TipTap HTML back to clean Markdown
     */
    static htmlToMarkdown(html: string, frontmatter?: Record<string, any>): string {
        const td = this.getTurndown();
        let markdown = td.turndown(html);

        // Prepend frontmatter if provided
        if (frontmatter && Object.keys(frontmatter).length > 0) {
            const fmString = this.serializeFrontmatter(frontmatter);
            markdown = fmString + markdown;
        }

        return markdown;
    }
}
