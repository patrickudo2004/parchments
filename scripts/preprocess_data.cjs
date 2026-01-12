const fs = require('fs');
const path = require('path');

const STRONGS_HEBREW_PATH = './strongs-master/hebrew/strongs-hebrew-dictionary.js';
const STRONGS_GREEK_PATH = './strongs-master/greek/strongs-greek-dictionary.js';
const INTERLINEAR_PATH = './interlinear_bibledata-master/src';
const OUTPUT_DIR = './public/data';

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function parseStrongsJS(filePath, varName) {
    const content = fs.readFileSync(filePath, 'utf8');
    // Attempt to find the object start and end
    const startIdx = content.indexOf('{');
    const endIdx = content.lastIndexOf('}');

    if (startIdx === -1 || endIdx === -1) {
        throw new Error(`Failed to find object in ${filePath}`);
    }

    const jsonStr = content.substring(startIdx, endIdx + 1);
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error(`Error parsing JSON from ${filePath}:`, e.message);
        // If it's not strictly JSON (e.g. single quotes or trailing commas), 
        // we might need a more robust parser or just regex clean it.
        // However, the files claimed to be "JSON version".
        // Let's try to clean common non-JSON bits if it fails.
        const cleaned = jsonStr
            .replace(/,\s*}/g, '}') // trailing commas
            .replace(/'/g, '"'); // single quotes
        return JSON.parse(cleaned);
    }
}

async function preprocess() {
    console.log('--- Starting Data Preprocessing (JS) ---');
    ensureDir(OUTPUT_DIR);
    ensureDir(path.join(OUTPUT_DIR, 'strongs'));
    ensureDir(path.join(OUTPUT_DIR, 'interlinear'));

    // 1. Process Strong's Lexicon
    try {
        console.log('Processing Hebrew Lexicon...');
        const hebrewData = parseStrongsJS(STRONGS_HEBREW_PATH, 'strongsHebrewDictionary');
        fs.writeFileSync(path.join(OUTPUT_DIR, 'strongs', 'hebrew.json'), JSON.stringify(hebrewData));
        console.log('Hebrew Lexicon processed.');
    } catch (e) {
        console.error('Failed to process Hebrew Lexicon:', e.message);
    }

    try {
        console.log('Processing Greek Lexicon...');
        const greekData = parseStrongsJS(STRONGS_GREEK_PATH, 'strongsGreekDictionary');
        fs.writeFileSync(path.join(OUTPUT_DIR, 'strongs', 'greek.json'), JSON.stringify(greekData));
        console.log('Greek Lexicon processed.');
    } catch (e) {
        console.error('Failed to process Greek Lexicon:', e.message);
    }

    // 2. Process Interlinear Data
    console.log('Processing Interlinear Data...');
    try {
        const books = fs.readdirSync(INTERLINEAR_PATH);
        for (const book of books) {
            const bookPath = path.join(INTERLINEAR_PATH, book);
            if (fs.statSync(bookPath).isDirectory()) {
                console.log(`  Merging ${book}...`);
                const bookData = {};
                const chapters = fs.readdirSync(bookPath);
                for (const chapter of chapters) {
                    if (chapter.endsWith('.json')) {
                        const chapterNum = chapter.replace('.json', '');
                        try {
                            const chapterContent = JSON.parse(fs.readFileSync(path.join(bookPath, chapter), 'utf8'));
                            bookData[chapterNum] = chapterContent;
                        } catch (e) {
                            console.error(`    Error reading chapter ${chapter} in ${book}:`, e.message);
                        }
                    }
                }
                fs.writeFileSync(path.join(OUTPUT_DIR, 'interlinear', `${book}.json`), JSON.stringify(bookData));
            }
        }
        console.log('Interlinear Data processed.');
    } catch (e) {
        console.error('Failed to process Interlinear Data:', e.message);
    }

    console.log('--- Preprocessing Complete ---');
}

preprocess().catch(console.error);
