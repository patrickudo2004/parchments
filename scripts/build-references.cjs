const fs = require('fs');
const path = require('path');
const https = require('https');

const BOOK_MAP = {
    'Gen': 'Genesis', 'Exod': 'Exodus', 'Lev': 'Leviticus', 'Num': 'Numbers', 'Deut': 'Deuteronomy',
    'Josh': 'Joshua', 'Judg': 'Judges', 'Ruth': 'Ruth', '1Sam': '1 Samuel', '2Sam': '2 Samuel',
    '1Kgs': '1 Kings', '2Kgs': '2 Kings', '1Chr': '1 Chronicles', '2Chr': '2 Chronicles',
    'Ezra': 'Ezra', 'Neh': 'Nehemiah', 'Esth': 'Esther', 'Job': 'Job', 'Ps': 'Psalms',
    'Prov': 'Proverbs', 'Eccl': 'Ecclesiastes', 'Song': 'Song of Solomon',
    'Isa': 'Isaiah', 'Jer': 'Jeremiah', 'Lam': 'Lamentations', 'Ezek': 'Ezekiel', 'Dan': 'Daniel',
    'Hos': 'Hosea', 'Joel': 'Joel', 'Amos': 'Amos', 'Obad': 'Obadiah', 'Jonah': 'Jonah',
    'Mic': 'Micah', 'Nah': 'Nahum', 'Hab': 'Habakkuk', 'Zeph': 'Zephaniah', 'Hag': 'Haggai',
    'Zech': 'Zechariah', 'Mal': 'Malachi',
    'Matt': 'Matthew', 'Mark': 'Mark', 'Luke': 'Luke', 'John': 'John', 'Acts': 'Acts',
    'Rom': 'Romans', '1Cor': '1 Corinthians', '2Cor': '2 Corinthians', 'Gal': 'Galatians',
    'Eph': 'Ephesians', 'Phil': 'Philippians', 'Col': 'Colossians', '1Thess': '1 Thessalonians',
    '2Thess': '2 Thessalonians', '1Tim': '1 Timothy', '2Tim': '2 Timothy', 'Titus': 'Titus',
    'Phlm': 'Philemon', 'Heb': 'Hebrews', 'Jas': 'James', '1Pet': '1 Peter', '2Pet': '2 Peter',
    '1John': '1 John', '2John': '2 John', '3John': '3 John', 'Jude': 'Jude', 'Rev': 'Revelation'
};

function downloadBuffer(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'ParchmentsBuilder/1.0' } }, res => {
            if (res.statusCode !== 200) {
                return reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
    });
}

async function buildNaves() {
    const dest = path.join(__dirname, '../public/data/references/topical/naves.json');
    if (fs.existsSync(dest) && fs.statSync(dest).size > 100000) {
        console.log('[Naves] Already exists, skipping download.');
        return;
    }

    console.log('[Naves] Downloading NavesTopicalDictionary.csv...');
    const buf = await downloadBuffer('https://raw.githubusercontent.com/BradyStephenson/bible-data/master/NavesTopicalDictionary.csv');
    const text = buf.toString('utf8');

    // Simple CSV parser handling multi-line quoted entries
    const entries = [];
    const lines = text.split(/\r?\n/);
    let i = 1;

    while (i < lines.length) {
        let line = lines[i];
        if (!line.trim()) { i++; continue; }

        let comma1 = line.indexOf(',');
        if (comma1 === -1) { i++; continue; }
        let comma2 = line.indexOf(',', comma1 + 1);

        // If line is incomplete due to unclosed quotes, read more lines
        while (comma2 === -1 && i + 1 < lines.length) {
            i++;
            line += '\n' + lines[i];
            comma2 = line.indexOf(',', comma1 + 1);
        }
        if (comma2 === -1) { i++; continue; }

        let section = line.slice(0, comma1).trim();
        let subject = line.slice(comma1 + 1, comma2).replace(/^"+|"+$/g, '').trim();
        let rawContent = line.slice(comma2 + 1).replace(/^"+|"+$/g, '').trim();

        // Continue reading while quotes are uneven
        let quoteCount = (rawContent.match(/"/g) || []).length;
        while (quoteCount % 2 !== 0 && i + 1 < lines.length) {
            i++;
            rawContent += '\n' + lines[i];
            quoteCount = (rawContent.match(/"/g) || []).length;
        }

        if (subject) {
            const rawSubtopics = rawContent.split('-').map(s => s.trim()).filter(Boolean);
            const subtopics = rawSubtopics.map(st => {
                const titleParts = st.split(/[A-Z0-9]{2,4}\s+\d+:/);
                return {
                    title: st.replace(/([A-Z0-9]{2,4}\s+\d+:[\d\-,\s;]+)/g, '').trim(),
                    refs: (st.match(/([A-Z0-9]{2,4}\s+\d+:[\d\-,\s;]+)/g) || []).map(r => r.trim())
                };
            });

            entries.push({
                id: subject.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                topic: subject,
                category: section,
                subtopics: subtopics.length > 0 ? subtopics : [{ title: rawContent, refs: [] }]
            });
        }
        i++;
    }

    fs.writeFileSync(dest, JSON.stringify(entries));
    console.log(`[Naves] Processed ${entries.length} topics -> ${dest}`);
}

async function buildEastons() {
    const dest = path.join(__dirname, '../public/data/references/dictionary/easton.json');
    if (fs.existsSync(dest) && fs.statSync(dest).size > 100000) {
        console.log('[Easton] Already exists, skipping download.');
        return;
    }

    console.log("[Easton] Downloading Easton's Bible Dictionary files...");
    const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
    const allEntries = [];

    for (const letter of letters) {
        try {
            const url = `https://raw.githubusercontent.com/neuu-org/bible-dictionary-dataset/master/data/01_parsed/${letter}.json`;
            const buf = await downloadBuffer(url);
            const data = JSON.parse(buf.toString('utf8'));

            for (const [key, item] of Object.entries(data)) {
                const easDef = (item.definitions || []).find(d => d.source === 'EAS') || (item.definitions || [])[0];
                if (!easDef) continue;

                allEntries.push({
                    id: (item.slug || key).toLowerCase(),
                    term: item.name || key,
                    source: easDef.source || 'EAS',
                    definition: easDef.text || '',
                    scriptureRefs: item.scripture_refs || []
                });
            }
        } catch (err) {
            console.warn(`[Easton] Skipping letter ${letter}:`, err.message);
        }
    }

    fs.writeFileSync(dest, JSON.stringify(allEntries));
    console.log(`[Easton] Processed ${allEntries.length} dictionary entries -> ${dest}`);
}

function parseVerseDotNotation(str) {
    // Format: Gen.1.1 or Ps.119.105 or 1Cor.13.4
    const parts = str.split('.');
    if (parts.length < 3) return null;

    const bookCode = parts[0];
    const chapter = parseInt(parts[1]);
    const verse = parseInt(parts[2]);

    const bookName = BOOK_MAP[bookCode] || bookCode;
    return {
        book: bookName,
        chapter,
        verse,
        key: `${bookName}-${chapter}-${verse}`.toLowerCase(),
        display: `${bookName} ${chapter}:${verse}`
    };
}

async function buildTSK() {
    const dest = path.join(__dirname, '../public/data/references/tsk/tsk.json');
    if (fs.existsSync(dest) && fs.statSync(dest).size > 100000) {
        console.log('[TSK] Already exists, skipping download.');
        return;
    }

    console.log('[TSK] Downloading cross_references.txt (OpenBible / TSK)...');
    const buf = await downloadBuffer('https://raw.githubusercontent.com/TJ-Frederick/TheologAI/main/data/cross-references/cross_references.txt');
    const text = buf.toString('utf8');

    console.log('[TSK] Parsing 340,000+ cross references...');
    const lines = text.split('\n');
    const grouped = {};

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim() || line.startsWith('#')) continue;

        const parts = line.split('\t');
        if (parts.length < 2) continue;

        const fromStr = parts[0].trim();
        const toStr = parts[1].trim();
        const votes = parseInt(parts[2]) || 0;

        const fromParsed = parseVerseDotNotation(fromStr);
        if (!fromParsed) continue;

        // "To" might be a range like Ps.148.4-Ps.148.5
        let displayTo = toStr;
        let targetKey = toStr.toLowerCase();
        if (toStr.includes('-')) {
            const rangeParts = toStr.split('-');
            const toStart = parseVerseDotNotation(rangeParts[0]);
            const toEnd = parseVerseDotNotation(rangeParts[1]);
            if (toStart && toEnd) {
                targetKey = toStart.key;
                displayTo = `${toStart.book} ${toStart.chapter}:${toStart.verse}-${toEnd.verse}`;
            }
        } else {
            const toParsed = parseVerseDotNotation(toStr);
            if (toParsed) {
                targetKey = toParsed.key;
                displayTo = toParsed.display;
            }
        }

        if (!grouped[fromParsed.key]) {
            grouped[fromParsed.key] = [];
        }

        grouped[fromParsed.key].push({
            targetVerseId: targetKey,
            displayRef: displayTo,
            votes
        });
    }

    // Sort refs per verse by votes descending, limit to top 20
    const finalMap = {};
    for (const [key, refs] of Object.entries(grouped)) {
        refs.sort((a, b) => b.votes - a.votes);
        finalMap[key] = refs.slice(0, 20);
    }

    fs.writeFileSync(dest, JSON.stringify(finalMap));
    console.log(`[TSK] Compiled cross-reference map for ${Object.keys(finalMap).length} verses -> ${dest}`);
}

async function main() {
    console.log('=== Building Reference Datasets ===');
    await buildNaves();
    await buildEastons();
    await buildTSK();
    console.log('=== Reference Datasets Built Successfully ===');
}

main().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
});
