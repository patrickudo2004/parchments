const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const kjvPath = path.join(projectRoot, 'public', 'data', 'bibles', 'KJV.json');
const interlinearDir = path.join(projectRoot, 'public', 'data', 'interlinear');

if (!fs.existsSync(kjvPath)) {
    console.error('KJV.json not found at:', kjvPath);
    process.exit(1);
}

const kjv = JSON.parse(fs.readFileSync(kjvPath, 'utf8'));

// Build KJV lookup table: normalized book name -> chapter -> verse -> text
const kjvLookup = {};
for (const [rawBookName, bookObj] of Object.entries(kjv.books)) {
    let bName = rawBookName.toLowerCase();
    if (bName.startsWith('i ')) bName = bName.replace('i ', '1 ');
    else if (bName.startsWith('ii ')) bName = bName.replace('ii ', '2 ');
    else if (bName.startsWith('iii ')) bName = bName.replace('iii ', '3 ');

    kjvLookup[bName] = {};
    for (const [chapNum, chapObj] of Object.entries(bookObj.chapters || {})) {
        kjvLookup[bName][chapNum] = {};
        for (const [verseNum, verseText] of Object.entries(chapObj.verses || {})) {
            kjvLookup[bName][chapNum][verseNum] = typeof verseText === 'string' ? verseText : (verseText.text || '');
        }
    }
}

function fileToBook(filename) {
    let slug = filename.replace('.json', '');
    if (slug.startsWith('i_')) slug = slug.replace('i_', '1 ');
    else if (slug.startsWith('ii_')) slug = slug.replace('ii_', '2 ');
    else if (slug.startsWith('iii_')) slug = slug.replace('iii_', '3 ');
    else slug = slug.replace(/_/g, ' ');
    return slug;
}

function alignWords(verseText, rawWords) {
    if (!rawWords || rawWords.length <= 1) return rawWords;
    const remaining = [...rawWords];
    const ordered = [];
    let pos = 0;
    const cleanVerse = verseText.toLowerCase();

    while (remaining.length > 0) {
        let bestIdx = -1;
        let bestPos = Infinity;
        let bestLen = 0;

        for (let i = 0; i < remaining.length; i++) {
            const wText = remaining[i].text.toLowerCase();
            let idx = cleanVerse.indexOf(wText, pos);
            if (idx === -1) {
                // If not found after current pos, try finding from start of verse
                idx = cleanVerse.indexOf(wText, 0);
            }
            if (idx !== -1) {
                if (idx < bestPos || (idx === bestPos && wText.length > bestLen)) {
                    bestPos = idx;
                    bestIdx = i;
                    bestLen = wText.length;
                }
            }
        }

        if (bestIdx !== -1) {
            ordered.push(remaining[bestIdx]);
            pos = Math.max(pos, bestPos + remaining[bestIdx].text.length);
            remaining.splice(bestIdx, 1);
        } else {
            ordered.push(...remaining);
            break;
        }
    }
    return ordered;
}

const files = fs.readdirSync(interlinearDir).filter(f => f.endsWith('.json'));
console.log(`Processing ${files.length} interlinear book files...`);

let totalVerses = 0;
let updatedFiles = 0;

for (const file of files) {
    const filePath = path.join(interlinearDir, file);
    const bookName = fileToBook(file);
    const bookKjv = kjvLookup[bookName];

    if (!bookKjv) {
        console.warn(`[Skip] No KJV text found for book: ${bookName} (${file})`);
        continue;
    }

    const bookInterlinear = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const reorderedBook = {};

    for (const [chapNum, chapterVerses] of Object.entries(bookInterlinear)) {
        reorderedBook[chapNum] = {};
        for (const [verseNum, rawWords] of Object.entries(chapterVerses)) {
            const verseText = bookKjv[chapNum]?.[verseNum] || '';
            reorderedBook[chapNum][verseNum] = alignWords(verseText, rawWords);
            totalVerses++;
        }
    }

    fs.writeFileSync(filePath, JSON.stringify(reorderedBook), 'utf8');
    updatedFiles++;
}

console.log(`Successfully aligned ${totalVerses} verses across ${updatedFiles} books in public/data/interlinear!`);
