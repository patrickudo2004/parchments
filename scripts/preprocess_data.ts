import fs from 'fs';
import path from 'path';

const STRONGS_HEBREW_PATH = './strongs-master/hebrew/strongs-hebrew-dictionary.js';
const STRONGS_GREEK_PATH = './strongs-master/greek/strongs-greek-dictionary.js';
const INTERLINEAR_PATH = './interlinear_bibledata-master/src';
const OUTPUT_DIR = './public/data';

function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function parseStrongsJS(filePath: string, varName: string) {
    const content = fs.readFileSync(filePath, 'utf8');
    const regex = new RegExp(`var ${varName} = ({[\\s\\S]*});`);
    const match = content.match(regex);
    if (!match) {
        // Try the greek one which might have a different format if it's multi-line or something
        // The greek one in the view_file output started with var strongsGreekDictionary = {"G1615":...
        const fallbackRegex = new RegExp(`var ${varName} = ({.*});`, 's');
        const fallbackMatch = content.match(fallbackRegex);
        if (!fallbackMatch) {
            // If it's too big for regex, just slice it
            const start = content.indexOf('{');
            const end = content.lastIndexOf('}');
            if (start !== -1 && end !== -1) {
                return JSON.parse(content.substring(start, end + 1));
            }
            throw new Error(`Failed to parse Strong's JS for ${varName}`);
        }
        return JSON.parse(fallbackMatch[1]);
    }
    return JSON.parse(match[1]);
}

async function preprocess() {
    console.log('--- Starting Data Preprocessing ---');
    ensureDir(OUTPUT_DIR);
    ensureDir(path.join(OUTPUT_DIR, 'strongs'));
    ensureDir(path.join(OUTPUT_DIR, 'interlinear'));

    // 1. Process Strong's Lexicon
    console.log('Processing Hebrew Lexicon...');
    const hebrewData = parseStrongsJS(STRONGS_HEBREW_PATH, 'strongsHebrewDictionary');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'strongs', 'hebrew.json'), JSON.stringify(hebrewData));

    console.log('Processing Greek Lexicon...');
    const greekData = parseStrongsJS(STRONGS_GREEK_PATH, 'strongsGreekDictionary');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'strongs', 'greek.json'), JSON.stringify(greekData));

    // 2. Process Interlinear Data
    console.log('Processing Interlinear Data...');
    const books = fs.readdirSync(INTERLINEAR_PATH);
    for (const book of books) {
        const bookPath = path.join(INTERLINEAR_PATH, book);
        if (fs.statSync(bookPath).isDirectory()) {
            console.log(`  Merging ${book}...`);
            const bookData: Record<string, any> = {};
            const chapters = fs.readdirSync(bookPath);
            for (const chapter of chapters) {
                if (chapter.endsWith('.json')) {
                    const chapterNum = chapter.replace('.json', '');
                    const chapterContent = JSON.parse(fs.readFileSync(path.join(bookPath, chapter), 'utf8'));
                    bookData[chapterNum] = chapterContent;
                }
            }
            fs.writeFileSync(path.join(OUTPUT_DIR, 'interlinear', `${book}.json`), JSON.stringify(bookData));
        }
    }

    console.log('--- Preprocessing Complete ---');
}

preprocess().catch(console.error);
