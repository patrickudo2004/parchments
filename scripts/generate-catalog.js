const fs = require('fs');
const path = require('path');

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
        // Read only the first 2KB to extract metadata without reading the whole file
        const buffer = Buffer.alloc(2048);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buffer, 0, 2048, 0);
        fs.closeSync(fd);

        const contentHeader = buffer.toString('utf8');

        // We need to parse valid JSON, but we truncated it. 
        // So we'll try to find the "metadata" or "version" part and mock a closure if needed,
        // OR just read the whole file if it's not too huge. 
        // Given these are ~5MB, reading the whole file synchronously in a build script is acceptable and safer.

        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);

        let metadata = {
            id: path.basename(file, '.json').toLowerCase(),
            name: path.basename(file, '.json').toUpperCase(),
            lang: 'en' // Default
        };

        if (data.metadata) {
            // Structure A (e.g. WEB)
            metadata.name = data.metadata.name || metadata.name;
            metadata.lang = data.metadata.lang_short || 'en';
            if (data.metadata.shortname) metadata.shortname = data.metadata.shortname;
        } else if (data.version) {
            // Structure B (e.g. ESV)
            // "English ESV 2016 == The Holy Bible..."
            const v = data.version;
            const parts = v.split('==');
            if (parts.length > 0) {
                // Try to extract a clean name
                const namePart = parts[0].trim();
                metadata.name = namePart;
            }
        }

        return {
            id: metadata.id,
            name: metadata.name,
            language: metadata.lang,
            localPath: `/data/bibles/${file}`,
            url: `/data/bibles/${file}` // For now, treat local path as URL
        };

    } catch (err) {
        console.warn(`Failed to process ${file}:`, err.message);
        return null;
    }
}).filter(Boolean);

fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 2));
console.log(`Generated catalog with ${catalog.length} entries at ${CATALOG_FILE}`);
