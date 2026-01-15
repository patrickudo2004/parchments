import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BIBLE_DIR = path.join(__dirname, '../public/data/bibles');
const CATALOG_FILE = path.join(BIBLE_DIR, 'catalog.json');

// Ensure directory exists
if (!fs.existsSync(BIBLE_DIR)) {
    console.error(`Directory not found: ${BIBLE_DIR}`);
    process.exit(1);
}

const files = fs.readdirSync(BIBLE_DIR).filter(file => file.endsWith('.json') && file !== 'catalog.json');

const catalog = files.map(file => {
    const filePath = path.join(BIBLE_DIR, file);
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);

        let metadata = {
            id: path.basename(file, '.json').toLowerCase(),
            name: path.basename(file, '.json').toUpperCase(),
            abbreviation: path.basename(file, '.json').toUpperCase(),
            lang: 'eng' // Default
        };

        if (data.metadata) {
            // Structure A (e.g. WEB)
            metadata.name = data.metadata.name || metadata.name;
            metadata.abbreviation = data.metadata.shortname || metadata.abbreviation;
            metadata.lang = data.metadata.lang_short || 'eng';
        } else if (data.version) {
            // Structure B (e.g. ESV)
            const v = data.version;
            const parts = v.split('==');
            if (parts.length > 0) {
                const namePart = parts[0].trim();
                metadata.name = namePart;
                // Try to extract abbreviation from the version string
                const match = namePart.match(/\b([A-Z]{2,})\b/);
                if (match) {
                    metadata.abbreviation = match[1];
                }
            }
        }

        return {
            id: metadata.id,
            name: metadata.name,
            abbreviation: metadata.abbreviation,
            language: metadata.lang,
            size: 'Unknown',
            url: `/data/bibles/${file}`,
            copyright: 'See version details'
        };

    } catch (err) {
        console.warn(`Failed to process ${file}:`, err.message);
        return null;
    }
}).filter(Boolean);

fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 2));
console.log(`Generated catalog with ${catalog.length} entries at ${CATALOG_FILE}`);
