const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { zipSync, strToU8 } = require('fflate');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const resultsDir = path.join(projectRoot, 'test-results', 'v0221-e2e');
const screenshotsDir = path.join(resultsDir, 'screenshots');
const fixturesDir = path.join(resultsDir, 'fixtures');

fs.mkdirSync(screenshotsDir, { recursive: true });
fs.mkdirSync(fixturesDir, { recursive: true });

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.wasm': 'application/wasm',
    '.ico': 'image/x-icon',
    '.mp4': 'video/mp4',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.onnx': 'application/octet-stream',
};

function startServer(port = 4185) {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            let reqPath = decodeURI((req.url || '/').split('?')[0]);
            if (reqPath === '/') reqPath = '/index.html';
            let filePath = path.join(distDir, reqPath);
            if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
                filePath = path.join(distDir, 'index.html');
            }
            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';
            try {
                const stat = fs.statSync(filePath);
                res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': stat.size });
                fs.createReadStream(filePath).pipe(res);
            } catch {
                res.writeHead(500);
                res.end('Error loading file');
            }
        });
        server.listen(port, () => resolve(server));
        server.on('error', reject);
    });
}

const report = {
    timestamp: new Date().toISOString(),
    results: [],
    consoleErrors: [],
    pageErrors: [],
};

function record(suite, name, passed, details = '') {
    report.results.push({ suite, name, passed, details });
    console.log(`  ${passed ? '[PASS]' : '[FAIL]'} ${suite} :: ${name}${details ? ' -> ' + details : ''}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildTestFixtures() {
    // 1. Realistic eBible.org-style multi-book USFM .zip with \wj, \f...\f*, \x...\x*, \nd, \add, \q1/\q2, \w|strong, \s1 headings
    const genUsfm = [
        '\\id GEN Test eBible USFM',
        '\\h Genesis',
        '\\mt1 Genesis',
        '\\c 1',
        '\\s1 The Creation of the World',
        '\\p',
        '\\v 1 In the beginning God created the heavens and the earth.\\f + \\fr 1:1 \\ft Hebrew elohim \\f*',
        '\\q1 \\v 2 And the \\nd LORD\\nd* hovered over the face of the deep,',
        '\\q2 bringing light out of darkness.\\x + \\xo 1:2 \\xt John 1:1-5 \\x*',
        ''
    ].join('\n');

    const jhnUsfm = [
        '\\id JHN Test eBible USFM',
        '\\h John',
        '\\c 3',
        '\\s1 Jesus Teaches Nicodemus',
        '\\p',
        '\\v 3 Jesus answered, \\wj “Truly, truly, I say to you, unless one is born again\\f + \\fr 3:3 \\ft Or from above \\f* he cannot see the kingdom of God.”\\wj*',
        '\\s2 God So Loved the World',
        '\\p',
        '\\v 16 \\wj For God so loved the \\w world|strong="G2889"\\w*,',
        '\\q1 that he gave his only \\add begotten\\add* Son.\\wj*\\x + \\xo 3:16 \\xt Rom 5:8 \\x*',
        ''
    ].join('\n');

    const zipBytes = zipSync({
        '01-GEN.usfm': strToU8(genUsfm),
        '43-JHN.usfm': strToU8(jhnUsfm),
        '__MACOSX/._01-GEN.usfm': strToU8('junk mac resource fork'),
    });
    const zipPath = path.join(fixturesDir, 'test_ebible_usfm.zip');
    fs.writeFileSync(zipPath, Buffer.from(zipBytes));

    // 2. Realistic GitHub thiagobodruk/bible JSON with leading UTF-8 BOM (\uFEFF) and 'jud' (Judges) vs 'jd' (Jude)
    const thiagoData = [
        {
            abbrev: 'gn',
            name: 'Genesis',
            chapters: [
                ['In the beginning God created the heaven and the earth.', 'And the earth was without form, and void.']
            ]
        },
        {
            abbrev: 'jud',
            name: 'Judges',
            chapters: [
                ['Now after the death of Joshua it came to pass that the children of Israel asked the LORD.']
            ]
        },
        {
            abbrev: 'jd',
            name: 'Jude',
            chapters: [
                ['Jude, the servant of Jesus Christ, and brother of James, to them that are sanctified.']
            ]
        }
    ];
    const thiagoPath = path.join(fixturesDir, 'thiago_github_bom.json');
    fs.writeFileSync(thiagoPath, '\uFEFF' + JSON.stringify(thiagoData), 'utf8');

    // 3. Corrupt JSON file
    const corruptPath = path.join(fixturesDir, 'corrupt_bible.json');
    fs.writeFileSync(corruptPath, '{ "broken": [ unclosed json ', 'utf8');

    return { zipPath, thiagoPath, corruptPath };
}

async function run() {
    const port = 4185;
    const server = await startServer(port);
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const fixtures = buildTestFixtures();

    const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
        ],
    });

    try {
        const page = await browser.newPage();
        page.on('console', (m) => {
            if (m.type() === 'error') {
                const txt = m.text();
                // Ignore expected worker parse error from deliberate corrupt file test
                if (!txt.includes('[BibleWorker] Import error') && !txt.includes('Import failed:')) {
                    report.consoleErrors.push(txt);
                }
            }
        });
        page.on('pageerror', (e) => report.pageErrors.push(e.message));

        await page.setViewport({ width: 1440, height: 900 });
        await page.goto(`http://localhost:${port}/app`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !!window.useNoteStore && !!window.useUIStore && !!window.useBibleStore, { timeout: 25000 });
        await sleep(1500);

        // Select Browser Database foundation cleanly
        await page.evaluate(async () => {
            const ns = window.useNoteStore.getState();
            if (!ns.hasStudyspace) {
                await ns.selectStorageFoundation('browser');
            }
        });
        await sleep(1200);

        // Wait until default KJV finishes seeding (so tooltips & [[Psalm 23:1]] resolve real decrypted text!)
        await page.waitForFunction(async () => {
            const bs = window.useBibleStore.getState();
            return Boolean(bs.mainVersion);
        }, { timeout: 15000 });
        // Give Bible seeding a brief moment if fresh DB
        await sleep(2500);

        // ============================================================
        // SUITE 1: Live Document Typing, Outlining & Typography Simulation
        // ============================================================
        console.log('\n--- Suite 1: Live Document Typing, Tabs, Nested Lists, Typography & Auto-Save ---');
        const longTitle = 'The Unsearchable Riches of Christ Across the Pauline Epistles: An Expository Sermon';
        await page.evaluate(async (title) => {
            const ns = window.useNoteStore.getState();
            const note = await ns.createNote(null, title);
            ns.setCurrentNote(note);
        }, longTitle);
        await sleep(600);

        // Verify Editor Toolbar upgrades (H3, Checklist, Indent, Outdent, Color/Highlight, Horizontal Rule)
        const toolbarInfo = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button')).map((b) => ({
                title: b.getAttribute('title') || '',
                text: (b.textContent || '').trim()
            }));
            return {
                hasH3: btns.some((b) => /Heading 3/i.test(b.title)),
                hasChecklist: btns.some((b) => /Checklist|Task List/i.test(b.title)),
                hasIndent: btns.some((b) => /Indent \(Tab\)/i.test(b.title)),
                hasOutdent: btns.some((b) => /Outdent \(Shift\+Tab\)/i.test(b.title)),
                hasHR: btns.some((b) => /Horizontal Divider|Divider/i.test(b.title)),
                hasHighlightOrColor: btns.some((b) => /Highlight|Text Color/i.test(b.title)),
            };
        });
        record('Typing&Toolbar', 'Toolbar includes H3, Checklist, Indent, Outdent, Divider, Highlight/Color',
            toolbarInfo.hasH3 && toolbarInfo.hasChecklist && toolbarInfo.hasIndent && toolbarInfo.hasOutdent && toolbarInfo.hasHR && toolbarInfo.hasHighlightOrColor,
            JSON.stringify(toolbarInfo));

        // Focus the ProseMirror editor and simulate realistic user document typing!
        await page.click('.tiptap-editor .ProseMirror');
        await sleep(150);

        // Type H1, H2, H3 via Markdown shortcuts
        await page.keyboard.type('# Introduction to Sovereign Grace');
        await page.keyboard.press('Enter');
        await page.keyboard.type('## Theological Foundation');
        await page.keyboard.press('Enter');
        await page.keyboard.type('### Practical Application for Today');
        await page.keyboard.press('Enter');

        // Type numbered list with Tab & Shift+Tab 3-level nesting!
        await page.keyboard.type('1. Primary Exegetical Point');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Tab');
        await page.keyboard.type('Supporting Sub-Point Alpha');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Tab');
        await page.keyboard.type('Deep Roman Sub-Detail');
        await page.keyboard.press('Enter');
        await page.keyboard.down('Shift');
        await page.keyboard.press('Tab');
        await page.keyboard.up('Shift');
        await page.keyboard.type('Second Level Item B');
        await page.keyboard.press('Enter');
        await page.keyboard.down('Shift');
        await page.keyboard.press('Tab');
        await page.keyboard.up('Shift');
        await page.keyboard.type('Second Main Point');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter'); // Exit ordered list

        // Type bullet list with Tab nesting
        await page.keyboard.type('- Key Takeaway One');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Tab');
        await page.keyboard.type('Nested Bullet Detail');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');

        // Toggle Checklist via toolbar button and type 2 tasks
        await page.click('[data-testid="toolbar-tasklist-btn"]');
        await sleep(150);
        await page.keyboard.type('Verify Greek lexicon for charis');
        await page.keyboard.press('Enter');
        await page.keyboard.type('Prepare benediction reading');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');

        // Type scriptures (testing auto-link + [[...]] auto-quote)
        await page.keyboard.type('Study John 3:16 and Romans 8:28-30 alongside Psalm 23:1 carefully. ');
        await sleep(200);
        await page.keyboard.press('Enter');
        await page.keyboard.type('[[Psalm 23:1]]');
        await sleep(600);

        const typingAudit = await page.evaluate(() => {
            const pm = document.querySelector('.tiptap-editor .ProseMirror');
            const titleEl = document.querySelector('textarea[placeholder="Note Title"]');
            const h1 = pm?.querySelector('h1');
            const h2 = pm?.querySelector('h2');
            const h3 = pm?.querySelector('h3');
            const ol1 = pm?.querySelector('ol');
            const ol2 = ol1?.querySelector('ol');
            const ol3 = ol2?.querySelector('ol');
            const ul1 = pm?.querySelector('ul:not([data-type="taskList"])');
            const ul2 = ul1?.querySelector('ul');
            const taskItems = pm?.querySelectorAll('ul[data-type="taskList"] li') || [];
            const taskCheckboxes = pm?.querySelectorAll('ul[data-type="taskList"] input[type="checkbox"]') || [];
            const scriptureRefs = Array.from(pm?.querySelectorAll('.scripture-ref') || []).map((el) => el.textContent?.trim());
            const bodyText = pm?.textContent || '';
            const activeInsideEditor = pm ? pm.contains(document.activeElement) : false;

            return {
                activeInsideEditor,
                titleFontSizePx: titleEl ? parseFloat(getComputedStyle(titleEl).fontSize) : 0,
                h1FontSizePx: h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0,
                h2FontSizePx: h2 ? parseFloat(getComputedStyle(h2).fontSize) : 0,
                h3FontSizePx: h3 ? parseFloat(getComputedStyle(h3).fontSize) : 0,
                olDepth3: Boolean(ol1 && ol2 && ol3),
                ol1Style: ol1 ? getComputedStyle(ol1).listStyleType : null,
                ol2Style: ol2 ? getComputedStyle(ol2).listStyleType : null,
                ol3Style: ol3 ? getComputedStyle(ol3).listStyleType : null,
                ulDepth2: Boolean(ul1 && ul2),
                ul2Style: ul2 ? getComputedStyle(ul2).listStyleType : null,
                taskCount: taskItems.length,
                checkboxCount: taskCheckboxes.length,
                scriptureRefs,
                hasPsalm23Quote: /shepherd/i.test(bodyText) && !bodyText.includes('ENC::v1::'),
            };
        });
        await page.screenshot({ path: path.join(screenshotsDir, '01_typing_typography_outlining.png') });

        record('Typing&Toolbar', 'Obsidian-calibrated Note Title & H1 > H2 > H3 proportions',
            typingAudit.titleFontSizePx >= 24 && typingAudit.titleFontSizePx <= 34 &&
            typingAudit.h1FontSizePx > typingAudit.h2FontSizePx &&
            typingAudit.h2FontSizePx > typingAudit.h3FontSizePx &&
            typingAudit.h1FontSizePx <= 28,
            JSON.stringify({ title: typingAudit.titleFontSizePx, h1: typingAudit.h1FontSizePx, h2: typingAudit.h2FontSizePx, h3: typingAudit.h3FontSizePx }));

        record('Typing&Toolbar', 'Tab / Shift+Tab nests 3-level numbered list (decimal -> lower-alpha -> lower-roman) and 2-level bullets without losing editor focus',
            typingAudit.activeInsideEditor && typingAudit.olDepth3 && typingAudit.ol1Style === 'decimal' &&
            typingAudit.ol2Style === 'lower-alpha' && typingAudit.ol3Style === 'lower-roman' &&
            typingAudit.ulDepth2 && typingAudit.ul2Style === 'circle',
            JSON.stringify({ focus: typingAudit.activeInsideEditor, olStyles: [typingAudit.ol1Style, typingAudit.ol2Style, typingAudit.ol3Style], ul2Style: typingAudit.ul2Style }));

        record('Typing&Toolbar', 'Checklist tasks, scripture auto-linking, and [[Psalm 23:1]] decrypted quote work seamlessly',
            typingAudit.taskCount >= 2 && typingAudit.scriptureRefs.length >= 2 && typingAudit.hasPsalm23Quote,
            JSON.stringify({ tasks: typingAudit.taskCount, refs: typingAudit.scriptureRefs, quoteOk: typingAudit.hasPsalm23Quote }));

        // Continuous typing across auto-save cycle (2.2s) verifying zero lost chars & preserved long title
        await page.keyboard.press('Enter');
        const continuousText = 'Continuous writing across auto-save boundary stays rock solid without jumping.';
        for (const word of continuousText.split(' ')) {
            await page.keyboard.type(word + ' ', { delay: 25 });
            await sleep(90);
        }
        await sleep(600);
        const afterSaveAudit = await page.evaluate((expectedPhrase, expectedTitle) => {
            const pmText = document.querySelector('.tiptap-editor .ProseMirror')?.textContent || '';
            const currentNote = window.useNoteStore.getState().currentNote;
            return {
                phrasePreserved: pmText.includes(expectedPhrase),
                titlePreserved: currentNote?.title === expectedTitle,
                savedTitle: currentNote?.title
            };
        }, continuousText, longTitle);
        record('Typing&Toolbar', 'Continuous typing across auto-save preserves all characters and title',
            afterSaveAudit.phrasePreserved && afterSaveAudit.titlePreserved,
            JSON.stringify(afterSaveAudit));

        // ============================================================
        // SUITE 2: Outline Sidebar (Stacked Headings + Scriptures Cited)
        // ============================================================
        console.log('\n--- Suite 2: Outline Sidebar (Headings + Scriptures Cited) ---');
        await page.evaluate(() => {
            window.useUIStore.getState().openLeftSidebar('outline');
        });
        await sleep(500);
        await page.screenshot({ path: path.join(screenshotsDir, '02_outline_headings_and_scriptures.png') });

        const outlineAudit = await page.evaluate(() => {
            const text = document.body.innerText;
            const hasHeadingsSection = text.includes('HEADINGS') || text.includes('Headings');
            const hasScripturesSection = text.includes('SCRIPTURES CITED') || text.includes('Scriptures Cited');
            const hasH1Item = text.includes('Introduction to Sovereign Grace');
            const hasH3Item = text.includes('Practical Application for Today');
            const hasJohn316 = text.includes('John 3:16');
            const hasRom828 = text.includes('Romans 8:28');
            const hasPsalm23 = text.includes('Psalm 23:1');
            const copyBtn = Array.from(document.querySelectorAll('button')).find((b) => /Copy all cited scriptures/i.test(b.getAttribute('title') || ''));
            const openBibleBtn = Array.from(document.querySelectorAll('button')).find((b) => /Open John 3:16 in Bible Reader/i.test(b.getAttribute('title') || ''));
            return {
                hasHeadingsSection,
                hasScripturesSection,
                hasH1Item,
                hasH3Item,
                hasJohn316,
                hasRom828,
                hasPsalm23,
                hasCopyBtn: !!copyBtn,
                hasOpenBibleBtn: !!openBibleBtn,
            };
        });

        // Test clicking Open-in-Bible from Scriptures Cited section
        await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find((b) => /Open John 3:16 in Bible Reader/i.test(b.getAttribute('title') || ''));
            if (btn) btn.click();
        });
        await sleep(450);
        const outlineOpenBibleCheck = await page.evaluate(() => {
            const bs = window.useBibleStore.getState();
            const ui = window.useUIStore.getState();
            return {
                rightOpen: ui.rightSidebarOpen,
                book: bs.bibleFocus?.book,
                chapter: bs.bibleFocus?.chapter,
                verse: bs.bibleFocus?.verse,
            };
        });
        record('Outline', 'Two stacked collapsible sections show Headings (H1-H3) & Scriptures Cited with Open-in-Bible & Copy List',
            outlineAudit.hasHeadingsSection && outlineAudit.hasScripturesSection &&
            outlineAudit.hasH1Item && outlineAudit.hasH3Item &&
            outlineAudit.hasJohn316 && outlineAudit.hasRom828 && outlineAudit.hasPsalm23 &&
            outlineAudit.hasCopyBtn && outlineOpenBibleCheck.rightOpen &&
            outlineOpenBibleCheck.book === 'John' && outlineOpenBibleCheck.chapter === 3,
            JSON.stringify({ outlineAudit, outlineOpenBibleCheck }));

        // ============================================================
        // SUITE 3: File Manager DnD + Option A Delete Protection + 30-Day Trash
        // ============================================================
        console.log('\n--- Suite 3: File Manager DnD, Option A Delete Protection & 30-Day Trash ---');
        await page.evaluate(() => {
            window.useUIStore.getState().closeRightSidebar();
            window.useUIStore.getState().openLeftSidebar('files');
        });
        await sleep(400);

        const ids = await page.evaluate(async () => {
            const ns = window.useNoteStore.getState();
            const fSeries = await ns.createFolder('Sermon Series', null);
            const fArchive = await ns.createFolder('Archive', null);
            const fRomans = await ns.createFolder('Romans Study', fSeries.id);
            const nAlpha = await ns.createNote(null, 'Note Alpha');
            const nBeta = await ns.createNote(fSeries.id, 'Note Beta');
            return { fSeriesId: fSeries.id, fArchiveId: fArchive.id, fRomansId: fRomans.id, nAlphaId: nAlpha.id, nBetaId: nBeta.id };
        });
        await sleep(500);

        // Desktop HTML5 Drag-and-Drop: Note Alpha -> Sermon Series
        const dndNoteResult = await page.evaluate(async ({ noteId, folderId }) => {
            const src = document.querySelector(`[data-tree-item-id="${noteId}"]`);
            const dst = document.querySelector(`[data-tree-item-id="${folderId}"]`);
            if (!src || !dst) return { found: false };
            const dt = new DataTransfer();
            src.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
            dst.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
            dst.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
            src.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }));
            await new Promise((r) => setTimeout(r, 400));
            const movedNote = window.useNoteStore.getState().notes.find((n) => n.id === noteId);
            return { found: true, newFolderId: movedNote?.folderId };
        }, { noteId: ids.nAlphaId, folderId: ids.fSeriesId });

        // Folder DnD + Cycle Guard: Archive -> Sermon Series, then try Sermon Series -> Archive (must keep original parentId unchanged!)
        const dndFolderResult = await page.evaluate(async ({ fSeriesId, fArchiveId }) => {
            const ns = window.useNoteStore.getState();
            const originalSeriesParent = ns.folders.find((f) => f.id === fSeriesId)?.parentId ?? null;
            await ns.moveFolder(fArchiveId, fSeriesId);
            const afterMove = window.useNoteStore.getState().folders.find((f) => f.id === fArchiveId)?.parentId;
            await window.useNoteStore.getState().moveFolder(fSeriesId, fArchiveId);
            const seriesParentAfterCycle = window.useNoteStore.getState().folders.find((f) => f.id === fSeriesId)?.parentId ?? null;
            return {
                afterMove,
                originalSeriesParent,
                seriesParentAfterCycle,
                cycleBlocked: seriesParentAfterCycle === originalSeriesParent && seriesParentAfterCycle !== fArchiveId,
            };
        }, { fSeriesId: ids.fSeriesId, fArchiveId: ids.fArchiveId });

        // Drag Note Alpha back to root
        await page.evaluate(async ({ noteId }) => {
            await window.useNoteStore.getState().moveNote(noteId, null);
        }, { noteId: ids.nAlphaId });
        await sleep(300);

        record('FileManagerDnD', 'HTML5 drag-and-drop moves notes into folders, moves folders, and blocks circular folder drops',
            dndNoteResult.found && dndNoteResult.newFolderId === ids.fSeriesId &&
            dndFolderResult.afterMove === ids.fSeriesId && dndFolderResult.cycleBlocked,
            JSON.stringify({ dndNoteResult, dndFolderResult }));

        // Test Option A Delete Protection Modal on non-empty folder "Sermon Series"
        await page.evaluate((folderId) => {
            const folderRow = document.querySelector(`[data-tree-item-id="${folderId}"]`);
            const delBtn = folderRow?.querySelector('button[title="Delete Folder"], button[title="Delete"]');
            if (delBtn) delBtn.click();
        }, ids.fSeriesId);
        await sleep(400);
        await page.screenshot({ path: path.join(screenshotsDir, '03_delete_protection_option_a.png') });

        const deleteModalCheck = await page.evaluate(() => {
            const modal = document.querySelector('[data-testid="delete-protection-modal"]');
            if (!modal) return { open: false };
            const txt = modal.textContent || '';
            const toggleHard = modal.querySelector('[data-testid="toggle-permanent-delete-btn"]');
            if (toggleHard) toggleHard.click();
            return {
                open: true,
                hasBlastCount: txt.includes('2 subfolders') && txt.includes('1 note'),
                hasStorageNotice: /Browser Database/i.test(txt),
                hasMoveToTrash: !!modal.querySelector('[data-testid="move-to-trash-btn"]'),
            };
        });
        await sleep(200);

        const hardDeleteGateCheck = await page.evaluate(() => {
            const btn = document.querySelector('[data-testid="permanent-delete-confirm-btn"]');
            const input = document.querySelector('[data-testid="permanent-delete-confirm-input"]');
            return {
                disabledWhenEmpty: Boolean(btn && btn.disabled),
                hasNameInput: Boolean(input),
            };
        });

        // Type wrong name -> stays disabled; type exact name -> enables
        await page.type('[data-testid="permanent-delete-confirm-input"]', 'Wrong Folder');
        const disabledOnWrong = await page.evaluate(() => document.querySelector('[data-testid="permanent-delete-confirm-btn"]')?.disabled);
        await page.click('[data-testid="permanent-delete-confirm-input"]');
        await page.keyboard.down('Control');
        await page.keyboard.press('a');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await page.type('[data-testid="permanent-delete-confirm-input"]', 'Sermon Series');
        await sleep(100);
        const enabledOnExact = await page.evaluate(() => !document.querySelector('[data-testid="permanent-delete-confirm-btn"]')?.disabled);

        // Now click primary safe "Move to Trash" button!
        await page.click('[data-testid="move-to-trash-btn"]');
        await sleep(500);

        const afterTrashState = await page.evaluate((folderId) => {
            const ns = window.useNoteStore.getState();
            return {
                folderStillActive: ns.folders.some((f) => f.id === folderId),
                trashCount: ns.trashItems.length,
                trashName: ns.trashItems[0]?.name,
            };
        }, ids.fSeriesId);

        record('DeleteProtection', 'Option A Delete Modal shows blast radius, enforces exact folder name for permanent delete, and safely Moves to Trash',
            deleteModalCheck.open && deleteModalCheck.hasBlastCount && deleteModalCheck.hasStorageNotice &&
            hardDeleteGateCheck.disabledWhenEmpty && disabledOnWrong && enabledOnExact &&
            !afterTrashState.folderStillActive && afterTrashState.trashCount === 1,
            JSON.stringify({ deleteModalCheck, hardDeleteGateCheck, disabledOnWrong, enabledOnExact, afterTrashState }));

        // Open Trash Modal & Restore "Sermon Series" (including descendants!)
        await page.click('[data-testid="open-trash-btn"]');
        await sleep(400);
        await page.screenshot({ path: path.join(screenshotsDir, '04_trash_modal_recovery.png') });

        const trashRestoreCheck = await page.evaluate(async () => {
            const modal = document.querySelector('[data-testid="trash-modal"]');
            const hasDaysLeft = /30d left|29d left|30 days/i.test(modal?.textContent || '');
            const restoreBtn = modal?.querySelector('[data-testid="trash-restore-btn"]');
            if (restoreBtn) restoreBtn.click();
            await new Promise((r) => setTimeout(r, 500));
            const ns = window.useNoteStore.getState();
            return {
                hasDaysLeft,
                trashCountAfterRestore: ns.trashItems.length,
                seriesRestored: ns.folders.some((f) => f.name === 'Sermon Series'),
                romansRestored: ns.folders.some((f) => f.name === 'Romans Study'),
                archiveRestored: ns.folders.some((f) => f.name === 'Archive'),
                betaNoteRestored: ns.notes.some((n) => n.title === 'Note Beta'),
            };
        });
        await page.evaluate(() => {
            const modal = document.querySelector('[data-testid="trash-modal"]');
            const closeBtn = modal?.querySelector('button');
            if (closeBtn) closeBtn.click();
        });
        await sleep(300);

        record('DeleteProtection', '30-Day Trash restores deleted folder along with all nested subfolders and notes intact',
            trashRestoreCheck.hasDaysLeft && trashRestoreCheck.trashCountAfterRestore === 0 &&
            trashRestoreCheck.seriesRestored && trashRestoreCheck.romansRestored &&
            trashRestoreCheck.archiveRestored && trashRestoreCheck.betaNoteRestored,
            JSON.stringify(trashRestoreCheck));

        // Now test explicit Permanent Delete on "Sermon Series" -> verify zero orphans remain!
        await page.evaluate((folderId) => {
            const folderRow = document.querySelector(`[data-tree-item-id="${folderId}"]`);
            const delBtn = folderRow?.querySelector('button[title="Delete Folder"], button[title="Delete"]');
            if (delBtn) delBtn.click();
        }, ids.fSeriesId);
        await sleep(300);
        await page.click('[data-testid="toggle-permanent-delete-btn"]');
        await sleep(150);
        await page.type('[data-testid="permanent-delete-confirm-input"]', 'Sermon Series');
        await page.click('[data-testid="permanent-delete-confirm-btn"]');
        await sleep(500);
        const afterHardDelete = await page.evaluate(() => {
            const ns = window.useNoteStore.getState();
            return {
                seriesGone: !ns.folders.some((f) => f.name === 'Sermon Series'),
                romansGone: !ns.folders.some((f) => f.name === 'Romans Study'),
                archiveGone: !ns.folders.some((f) => f.name === 'Archive'),
                betaGone: !ns.notes.some((n) => n.title === 'Note Beta'),
                trashEmpty: ns.trashItems.length === 0,
            };
        });
        record('DeleteProtection', 'Explicit Permanent Delete removes folder & all nested children with zero orphans and bypasses Trash',
            afterHardDelete.seriesGone && afterHardDelete.romansGone && afterHardDelete.archiveGone && afterHardDelete.betaGone && afterHardDelete.trashEmpty,
            JSON.stringify(afterHardDelete));

        await page.evaluate(() => { window.useUIStore.getState().closeLeftSidebar(); });
        await sleep(300);

        // ============================================================
        // SUITE 4: Pulpit Mode Touch Fix (Pulpit ONLY vs Mouse vs Normal Editor)
        // ============================================================
        console.log('\n--- Suite 4: Pulpit Mode Touch 1-Tap Fix (Pulpit ONLY) vs Mouse & Editor ---');
        await page.evaluate(async () => {
            const ns = window.useNoteStore.getState();
            const n = await ns.createNote(null, 'Pulpit Touch Test Sermon');
            ns.setCurrentNote(n);
        });
        await sleep(500);
        await page.click('.tiptap-editor .ProseMirror');
        await page.keyboard.type('Let us read John 3:16 together this morning. ');
        await sleep(500);

        // 4a. Normal editor mouse hover MUST still show ScriptureTooltip!
        const refBox = await page.evaluate(() => {
            const el = document.querySelector('.tiptap-editor .scripture-ref');
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        });
        if (refBox) {
            await page.mouse.move(refBox.x, refBox.y);
            await sleep(550);
        }
        const normalEditorTooltipVisible = await page.evaluate(() => {
            return Boolean(document.querySelector('[data-scripture-tooltip]'));
        });
        await page.mouse.move(10, 10);
        await sleep(350);

        // Wait briefly for auto-save or flush save explicitly so the note survives viewport touch switch
        await page.evaluate(async () => {
            const ns = window.useNoteStore.getState();
            const ed = window.useUIStore.getState().activeEditor;
            if (ns.currentNote && ed) {
                await ns.saveCurrentNote(ns.currentNote.title, ed.getHTML(), ns.currentNote.id);
            }
        });
        await sleep(250);

        // 4b. Enter Pulpit Mode on a Touch Tablet viewport (768x1024, hasTouch: true)
        await page.setViewport({ width: 768, height: 1024, isMobile: false, hasTouch: true });
        await page.waitForFunction(() => !!window.useNoteStore && !!window.useUIStore, { timeout: 15000 });
        await sleep(500);
        await page.evaluate(async () => {
            const ns = window.useNoteStore.getState();
            if (!ns.notes.length) await ns.loadNotes();
            const target = window.useNoteStore.getState().notes.find((n) => n.title === 'Pulpit Touch Test Sermon');
            if (target) window.useNoteStore.getState().setCurrentNote(target);
        });
        await sleep(500);
        await page.evaluate(() => { window.useUIStore.getState().togglePulpitMode(); });
        await sleep(650);

        // Simulate realistic touch tap (touchstart -> pointerdown(touch) -> mouseover(synthetic) -> click) on .scripture-ref
        const touchPulpitAudit = await page.evaluate(async () => {
            const refEl = document.querySelector('.scripture-ref');
            if (!refEl) return { found: false };
            refEl.dispatchEvent(new Event('touchstart', { bubbles: true }));
            refEl.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
            refEl.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            refEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise((r) => setTimeout(r, 550));
            const tooltipCount = document.querySelectorAll('[data-scripture-tooltip]').length;
            const modalText = document.body.innerText;
            const modalOpened = /John 3:16/i.test(modalText) && /For God so loved the world/i.test(modalText);
            return { found: true, tooltipCount, modalOpened };
        });
        await page.screenshot({ path: path.join(screenshotsDir, '05_pulpit_touch_modal_no_tooltip.png') });

        // Close modal and exit Pulpit Mode, then restore Desktop viewport cleanly
        await page.keyboard.press('Escape');
        await sleep(250);
        await page.evaluate(() => { window.useUIStore.getState().togglePulpitMode(); });
        await page.setViewport({ width: 1440, height: 900, isMobile: false, hasTouch: false });
        await page.waitForFunction(() => !!window.useNoteStore && !!window.useUIStore && !!window.useBibleStore, { timeout: 15000 });
        await sleep(500);

        record('PulpitTouch', 'Normal editor hover tooltip stays active; Pulpit Mode touch tap opens Scripture Modal directly with ZERO competing hover tooltip',
            normalEditorTooltipVisible && touchPulpitAudit.found && touchPulpitAudit.modalOpened && touchPulpitAudit.tooltipCount === 0,
            JSON.stringify({ normalEditorTooltipVisible, touchPulpitAudit }));

        // ============================================================
        // SUITE 5: Bible Reader & Mini Bible Header Clarity, Tools Tray & Font Size
        // ============================================================
        console.log('\n--- Suite 5: Bible Reader & Mini Bible Header, Tools Tray & Font Size ---');
        await page.evaluate(() => {
            window.useBibleStore.getState().setBibleFocus({ book: '1 Thessalonians', chapter: 5, verse: 16 });
            window.useUIStore.getState().openRightSidebar('bible');
        });
        await sleep(600);

        const bibleHeaderAudit = await page.evaluate(() => {
            const pickerBtn = document.querySelector('[data-testid="bible-chapter-picker-btn"]');
            const toolsBtn = document.querySelector('[data-testid="bible-reader-tools-toggle"]');
            const heading = document.querySelector('[data-testid="bible-chapter-heading"]');
            const pRect = pickerBtn?.getBoundingClientRect();
            const tRect = toolsBtn?.getBoundingClientRect();
            const headingSize = heading ? parseFloat(getComputedStyle(heading).fontSize) : 0;
            const noOverlap = Boolean(pRect && tRect && pRect.right <= tRect.left + 2);
            return {
                pickerText: pickerBtn?.textContent?.trim(),
                pickerWidth: pRect ? Math.round(pRect.width) : 0,
                noOverlap,
                headingSize,
                toolsTrayInitiallyHidden: !document.querySelector('[data-testid="bible-reader-tools-bar"]'),
            };
        });

        // Open Tools tray and bump font size A+ twice (16 -> 18px)
        await page.click('[data-testid="bible-reader-tools-toggle"]');
        await sleep(250);
        await page.screenshot({ path: path.join(screenshotsDir, '06_bible_reader_tools_tray.png') });
        await page.click('[data-testid="bible-font-increase"]');
        await page.click('[data-testid="bible-font-increase"]');
        await sleep(250);

        const bibleFontAudit = await page.evaluate(() => {
            const fontSize = window.useUIStore.getState().bibleFontSize;
            const heading = document.querySelector('[data-testid="bible-chapter-heading"]');
            const headingSize = heading ? parseFloat(getComputedStyle(heading).fontSize) : 0;
            const verseText = document.querySelector('#verse-16 .font-serif');
            const versePx = verseText ? parseFloat(getComputedStyle(verseText).fontSize) : 0;
            return { fontSize, headingSize, versePx };
        });

        // Open Mini Bible Modal and verify it inherits header cleanliness & 18px font size
        await page.evaluate(() => { window.useUIStore.getState().toggleBibleModal(true); });
        await sleep(500);
        const miniBibleAudit = await page.evaluate(() => {
            const modalHeading = Array.from(document.querySelectorAll('[data-testid="bible-chapter-heading"]')).pop();
            const toolsToggles = document.querySelectorAll('[data-testid="bible-reader-tools-toggle"]').length;
            return {
                miniBibleOpen: toolsToggles >= 2,
                modalHeadingSize: modalHeading ? parseFloat(getComputedStyle(modalHeading).fontSize) : 0,
            };
        });
        await page.screenshot({ path: path.join(screenshotsDir, '07_mini_bible_modal.png') });
        await page.evaluate(() => {
            window.useUIStore.getState().toggleBibleModal(false);
            window.useUIStore.getState().setBibleFontSize(16);
        });
        await sleep(300);

        record('BibleReader', 'Long chapter name (1 Thessalonians 5) renders cleanly without icon overlap; Tools tray & dynamic bibleFontSize scale BibleReader + Mini Bible proportionally',
            bibleHeaderAudit.noOverlap && bibleHeaderAudit.toolsTrayInitiallyHidden &&
            bibleHeaderAudit.headingSize >= 20 && bibleHeaderAudit.headingSize <= 30 &&
            bibleFontAudit.fontSize === 18 && bibleFontAudit.versePx === 18 &&
            bibleFontAudit.headingSize > bibleHeaderAudit.headingSize &&
            miniBibleAudit.miniBibleOpen,
            JSON.stringify({ bibleHeaderAudit, bibleFontAudit, miniBibleAudit }));

        // ============================================================
        // SUITE 6: Custom Bible Import (.zip USFM, GitHub JSON w/ BOM, Corrupt Guard) & Live HelloAO Browser
        // ============================================================
        console.log('\n--- Suite 6: Custom Bible Import (.zip USFM, GitHub JSON, Corrupt Guard) & Live HelloAO ---');
        await page.evaluate(() => {
            window.useUIStore.setState({ isSettingsModalOpen: true, settingsTab: 'bible' });
        });
        await sleep(1000);

        // 6a. Upload realistic eBible.org USFM .zip!
        await page.type('[data-testid="custom-bible-name-input"]', 'Test eBible USFM');
        await page.type('[data-testid="custom-bible-abbrev-input"]', 'TEU');
        const fileInput = await page.$('[data-testid="custom-bible-file-input"]');
        await fileInput.uploadFile(fixtures.zipPath);

        // Wait for import worker to finish and mark 'teu' downloaded
        await page.waitForFunction(() => {
            const prog = document.querySelector('[data-testid="bible-import-progress"]');
            const txt = document.body.innerText;
            return !prog && txt.includes('Test eBible USFM');
        }, { timeout: 25000 });
        await sleep(500);

        // Switch BibleReader to TEU and inspect John 3:3 and John 3:16 (and verify encrypted at rest!)
        await page.evaluate(() => {
            window.useUIStore.setState({ isSettingsModalOpen: false });
            window.useBibleStore.getState().setMainVersion('teu');
            window.useBibleStore.getState().setBibleFocus({ book: 'John', chapter: 3, verse: 16 });
            window.useUIStore.getState().openRightSidebar('bible');
        });
        await sleep(700);
        const usfmReadAudit = await page.evaluate(() => {
            const v3 = document.querySelector('#verse-3')?.textContent || '';
            const v16 = document.querySelector('#verse-16')?.textContent || '';
            return {
                v3,
                v16,
                v3HasFullWordsOfJesus: v3.includes('born again') && v3.includes('kingdom of God'),
                v3StrippedFootnote: !v3.includes('Or from above') && !v3.includes('\\f'),
                v16StrippedStrongsAndXref: v16.includes('loved the world') && v16.includes('only begotten Son') && !v16.includes('G2889') && !v16.includes('Rom 5:8'),
                v16NoSectionHeadingBleed: !v16.includes('God So Loved') && !v3.includes('Nicodemus'),
                noCiphertext: !v3.includes('ENC::v1::') && !v16.includes('ENC::v1::'),
            };
        });
        record('CustomBibles', 'eBible.org USFM .zip imports multi-book archive preserving \\wj Words of Jesus, \\add, \\q1/\\q2 poetry while stripping footnotes/cross-refs/Strong attributes',
            usfmReadAudit.v3HasFullWordsOfJesus && usfmReadAudit.v3StrippedFootnote &&
            usfmReadAudit.v16StrippedStrongsAndXref && usfmReadAudit.v16NoSectionHeadingBleed && usfmReadAudit.noCiphertext,
            JSON.stringify(usfmReadAudit));

        // 6b. Upload GitHub thiagobodruk/bible JSON with UTF-8 BOM (and verify Judges vs Jude mapping!)
        await page.evaluate(() => { window.useUIStore.setState({ isSettingsModalOpen: true, settingsTab: 'bible' }); });
        await sleep(500);
        await page.type('[data-testid="custom-bible-name-input"]', 'GitHub Thiago Test');
        await page.type('[data-testid="custom-bible-abbrev-input"]', 'GTT');
        const fileInput2 = await page.$('[data-testid="custom-bible-file-input"]');
        await fileInput2.uploadFile(fixtures.thiagoPath);
        await page.waitForFunction(() => {
            return !document.querySelector('[data-testid="bible-import-progress"]') && document.body.innerText.includes('GitHub Thiago Test');
        }, { timeout: 25000 });
        await sleep(500);

        await page.evaluate(() => {
            window.useUIStore.setState({ isSettingsModalOpen: false });
            window.useBibleStore.getState().setMainVersion('gtt');
            window.useBibleStore.getState().setBibleFocus({ book: 'Judges', chapter: 1, verse: 1 });
            window.useUIStore.getState().openRightSidebar('bible');
        });
        await sleep(600);
        const thiagoJudgesText = await page.evaluate(() => document.querySelector('#verse-1')?.textContent || '');
        await page.evaluate(() => {
            window.useBibleStore.getState().setBibleFocus({ book: 'Jude', chapter: 1, verse: 1 });
        });
        await sleep(500);
        const thiagoJudeText = await page.evaluate(() => document.querySelector('#verse-1')?.textContent || '');
        // Also run Bible search on GTT to verify search cache invalidation worked!
        await page.evaluate(async () => {
            await window.useBibleStore.getState().executeSearch('sanctified');
        });
        await sleep(500);
        const thiagoSearchHits = await page.evaluate(() => window.useBibleStore.getState().searchTotalCount);
        record('CustomBibles', 'GitHub thiagobodruk/bible JSON (with UTF-8 BOM) imports cleanly, separates Judges vs Jude, and indexes into Bible Search',
            thiagoJudgesText.includes('death of Joshua') && thiagoJudeText.includes('brother of James') && thiagoSearchHits >= 1,
            JSON.stringify({ judgesOk: thiagoJudgesText.includes('death of Joshua'), judeOk: thiagoJudeText.includes('brother of James'), searchHits: thiagoSearchHits }));

        // 6c. Corrupt JSON file guard -> clear AlertModal & zero ghost DB entries
        await page.evaluate(() => { window.useUIStore.setState({ isSettingsModalOpen: true, settingsTab: 'bible' }); });
        await sleep(500);
        await page.type('[data-testid="custom-bible-name-input"]', 'Broken Bible');
        await page.type('[data-testid="custom-bible-abbrev-input"]', 'BRKN');
        const fileInput3 = await page.$('[data-testid="custom-bible-file-input"]');
        await fileInput3.uploadFile(fixtures.corruptPath);
        await sleep(700);
        const corruptGuardAudit = await page.evaluate(() => {
            const txt = document.body.innerText;
            const showsError = /Import Failed/i.test(txt);
            const okBtn = Array.from(document.querySelectorAll('button')).find((b) => /^(Got it|OK|Close|Dismiss)$/i.test((b.textContent || '').trim()));
            if (okBtn) okBtn.click();
            return { showsError, dismissed: Boolean(okBtn), noProgressStuck: !document.querySelector('[data-testid="bible-import-progress"]') };
        });
        await sleep(300);
        const noGhostBroken = await page.evaluate(() => !document.body.innerText.includes('Broken Bible (BRKN)'));
        record('CustomBibles', 'Corrupt Bible file fails gracefully with clear error alert and leaves zero ghost versions',
            corruptGuardAudit.showsError && corruptGuardAudit.noProgressStuck && noGhostBroken,
            JSON.stringify({ corruptGuardAudit, noGhostBroken }));

        // Clear optional inputs before HelloAO test
        await page.evaluate(() => {
            const n = document.querySelector('[data-testid="custom-bible-name-input"]');
            const a = document.querySelector('[data-testid="custom-bible-abbrev-input"]');
            if (n) n.value = '';
            if (a) a.value = '';
        });

        // 6d. Live HelloAO 1,500+ Online Free Translations Browser + Real Live Download!
        await page.waitForFunction(() => {
            const el = document.querySelector('[data-testid="helloao-online-browser"]');
            return el && /\d[\d,]+ available/.test(el.textContent || '');
        }, { timeout: 25000 });

        const helloaoCatalogAudit = await page.evaluate(() => {
            const txt = document.querySelector('[data-testid="helloao-online-browser"]')?.textContent || '';
            const m = txt.match(/([\d,]+)\s+available/);
            const count = m ? parseInt(m[1].replace(/,/g, ''), 10) : 0;
            return { count };
        });

        // Search for Berean Standard Bible (BSB) and click Download LIVE!
        await page.type('[data-testid="helloao-search-input"]', 'Berean Standard Bible');
        await sleep(350);
        await page.screenshot({ path: path.join(screenshotsDir, '08_settings_helloao_browser.png') });

        const bsbBtnPresent = await page.$('[data-testid="helloao-download-BSB"]');
        let bsbDownloadOk = false;
        let bsbVerseText = '';
        if (bsbBtnPresent) {
            await bsbBtnPresent.click();
            // Wait up to 90s for live download + AES-GCM encryption of all 31,086 verses!
            await page.waitForFunction(() => {
                const btn = document.querySelector('[data-testid="helloao-download-BSB"]');
                return btn && /Installed/i.test(btn.textContent || '');
            }, { timeout: 90000 });
            await sleep(500);

            await page.evaluate(() => {
                window.useUIStore.setState({ isSettingsModalOpen: false });
                window.useBibleStore.getState().setMainVersion('bsb');
                window.useBibleStore.getState().setBibleFocus({ book: 'John', chapter: 3, verse: 16 });
                window.useUIStore.getState().openRightSidebar('bible');
            });
            await sleep(700);
            bsbVerseText = await page.evaluate(() => document.querySelector('#verse-16')?.textContent || '');
            bsbDownloadOk = bsbVerseText.includes('For God so loved the world') && !bsbVerseText.includes('[object Object]') && !bsbVerseText.includes('ENC::v1::');
        }

        record('CustomBibles', 'Live HelloAO browser loads 1,500+ free translations and downloads/encrypts/renders Berean Standard Bible (BSB) cleanly',
            helloaoCatalogAudit.count >= 1000 && bsbDownloadOk,
            JSON.stringify({ catalogCount: helloaoCatalogAudit.count, bsbDownloadOk, sample: bsbVerseText.slice(0, 90) }));

        // ============================================================
        // SUITE 7: Full-App Screens, Sidebars, Modals & Themes Sweep (Desktop + Mobile 360px)
        // ============================================================
        console.log('\n--- Suite 7: Full-App Modals, Sidebars & Themes Sweep (Desktop + Mobile 360px) ---');
        // Sweep all right sidebars on desktop
        const rightTabs = ['bible', 'crossrefs', 'commentary', 'dictionary', 'lexicon', 'pins'];
        const sidebarErrors = [];
        for (const tab of rightTabs) {
            await page.evaluate((t) => window.useUIStore.getState().openRightSidebar(t), tab);
            await sleep(300);
            const hasContent = await page.evaluate(() => document.body.innerText.trim().length > 50);
            if (!hasContent) sidebarErrors.push(tab);
        }

        // Sweep Command Palette, Light & Dark Themes, Lectio Mode, and Settings 5 tabs at Mobile 360x800
        await page.evaluate(() => {
            window.useUIStore.getState().closeRightSidebar();
            window.useUIStore.getState().setTheme('light');
        });
        await sleep(300);
        const lightThemeActive = await page.evaluate(() => !document.documentElement.classList.contains('dark') && !document.body.classList.contains('dark'));
        await page.evaluate(() => { window.useUIStore.getState().setTheme('dark'); });
        await sleep(300);
        const darkThemeActive = await page.evaluate(() => document.documentElement.classList.contains('dark') || document.body.classList.contains('dark'));

        await page.evaluate(() => { window.useUIStore.getState().toggleSearchModal(); });
        await sleep(350);
        const cmdPaletteOk = await page.evaluate(() => Boolean(document.querySelector('input[placeholder*="Search"]')));
        await page.evaluate(() => { window.useUIStore.setState({ isSearchModalOpen: false }); });
        await sleep(200);

        // Mobile 360px sweep: Settings Bible Versions tab + BibleReader long title check
        await page.setViewport({ width: 360, height: 800, isMobile: true, hasTouch: true });
        await page.waitForFunction(() => !!window.useUIStore && !!window.useBibleStore, { timeout: 15000 });
        await sleep(500);
        await page.evaluate(() => {
            window.useBibleStore.getState().setBibleFocus({ book: 'Song of Solomon', chapter: 8, verse: 6 });
            window.useUIStore.getState().openRightSidebar('bible');
        });
        await sleep(500);
        await page.screenshot({ path: path.join(screenshotsDir, '09_mobile_360_bible_song_of_solomon.png') });
        const mobileBibleAudit = await page.evaluate(() => {
            const picker = document.querySelector('[data-testid="bible-chapter-picker-btn"]');
            const tools = document.querySelector('[data-testid="bible-reader-tools-toggle"]');
            const pr = picker?.getBoundingClientRect();
            const tr = tools?.getBoundingClientRect();
            return {
                docOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
                pickerText: picker?.textContent?.trim(),
                noOverlap: Boolean(pr && tr && pr.right <= tr.left + 2 && tr.right <= 361),
            };
        });
        await page.evaluate(() => {
            window.useUIStore.getState().closeRightSidebar();
            window.useUIStore.setState({ isSettingsModalOpen: true, settingsTab: 'bible' });
        });
        await sleep(500);
        await page.screenshot({ path: path.join(screenshotsDir, '10_mobile_360_settings_bible_tab.png') });
        const mobileSettingsOverflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth > window.innerWidth + 1;
        });

        record('FullAppSweep', 'All 6 study sidebars, Light/Dark themes, Command Palette, Mobile 360px Song of Solomon header & Settings Bible tab render with zero errors/overflow',
            sidebarErrors.length === 0 && lightThemeActive && darkThemeActive && cmdPaletteOk &&
            !mobileBibleAudit.docOverflow && mobileBibleAudit.noOverlap && !mobileSettingsOverflow,
            JSON.stringify({ sidebarErrors, lightThemeActive, darkThemeActive, cmdPaletteOk, mobileBibleAudit, mobileSettingsOverflow }));

        await page.close();
    } finally {
        await browser.close();
        server.close();
    }

    fs.writeFileSync(path.join(resultsDir, 'report.json'), JSON.stringify(report, null, 2));
    const passed = report.results.filter((r) => r.passed).length;
    const failed = report.results.filter((r) => !r.passed).length;
    console.log('\n======================================================');
    console.log(`v0.2.21 COMPREHENSIVE E2E SUMMARY: ${passed} passed, ${failed} failed`);
    console.log(`Console Errors: ${report.consoleErrors.length}, Page Errors: ${report.pageErrors.length}`);
    console.log(`Report saved to: ${path.join(resultsDir, 'report.json')}`);
    console.log('======================================================\n');
    if (report.consoleErrors.length > 0) console.log('Console Errors:\n', report.consoleErrors);
    if (report.pageErrors.length > 0) console.log('Page Errors:\n', report.pageErrors);
    if (failed > 0 || report.pageErrors.length > 0) {
        process.exit(1);
    }
}

run().catch((err) => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
});
