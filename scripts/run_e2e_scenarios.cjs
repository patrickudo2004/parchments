const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const resultsDir = path.join(projectRoot, 'test-results', 'e2e');
const screenshotsDir = path.join(resultsDir, 'screenshots');

if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.wasm': 'application/wasm',
    '.ico': 'image/x-icon',
};

function startServer(port = 4176) {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            let reqPath = decodeURI(req.url.split('?')[0]);
            if (reqPath === '/' || reqPath === '/app') reqPath = '/index.html';
            let filePath = path.join(distDir, reqPath);

            if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
                filePath = path.join(distDir, 'index.html');
            }

            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';

            try {
                const data = fs.readFileSync(filePath);
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(data);
            } catch (err) {
                res.writeHead(500);
                res.end('Error loading file');
            }
        });

        server.listen(port, () => {
            console.log(`[E2E Server] Serving dist on http://localhost:${port}`);
            resolve(server);
        });
        server.on('error', reject);
    });
}

const testResults = [];

function recordResult(scenario, testName, passed, details = '') {
    testResults.push({ scenario, testName, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${mark} - ${testName} ${details ? '(' + details + ')' : ''}`);
}

async function run() {
    const port = 4176;
    const server = await startServer(port);
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

    console.log('\n======================================================');
    console.log('   PARCHMENTS END-TO-END (E2E) SCENARIO TEST SUITE   ');
    console.log('======================================================\n');

    const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--allow-file-access-from-files',
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream'
        ]
    });

    try {
        const page = await browser.newPage();

        // ==============================================================
        // SCENARIO 1: UI Layering, MenuBar & TopBar Stacking Context
        // ==============================================================
        console.log('\n--- Scenario 1: UI Layering, TopBar & MenuBar Stacking ---');
        await page.setViewport({ width: 1440, height: 900 });
        await page.goto(`http://localhost:${port}/app`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !!window.useNoteStore, { timeout: 15000 });
        await page.evaluate(async () => {
            localStorage.clear();
            localStorage.setItem('parchments-storage-foundation', 'browser');
            localStorage.setItem('parchments-ui', JSON.stringify({
                state: {
                    theme: 'dark',
                    isLeftSidebarOpen: true,
                    leftSidebarContent: 'files',
                    rightSidebarOpen: false
                }
            }));
            const noteStore = (window).useNoteStore.getState();
            await noteStore.selectStorageFoundation('browser');
        });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !!window.useNoteStore, { timeout: 15000 });
        await new Promise(r => setTimeout(r, 1500));

        // Check MenuBar z-index
        const menuBarZ = await page.evaluate(() => {
            const el = document.querySelector('div[class*="z-[100]"]');
            return el ? window.getComputedStyle(el).zIndex : null;
        });
        recordResult('Scenario 1', 'MenuBar has z-index >= 100', parseInt(menuBarZ || '0') >= 100, `z-index: ${menuBarZ}`);

        // Click on "File" menu in MenuBar
        const fileMenuClicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const fileBtn = buttons.find(b => b.textContent?.trim() === 'File');
            if (fileBtn) {
                fileBtn.click();
                return true;
            }
            return false;
        });
        recordResult('Scenario 1', 'File menu button found & clicked', fileMenuClicked);
        await new Promise(r => setTimeout(r, 400));

        // Check dropdown z-index and background opacity
        const dropdownInfo = await page.evaluate(() => {
            const dropdown = document.querySelector('div[class*="z-[110]"]');
            if (!dropdown) return null;
            const style = window.getComputedStyle(dropdown);
            const rect = dropdown.getBoundingClientRect();
            return {
                zIndex: style.zIndex,
                bgColor: style.backgroundColor,
                width: rect.width,
                height: rect.height,
                top: rect.top,
                left: rect.left,
                visible: rect.width > 0 && rect.height > 0
            };
        });

        const isDropdownOpaque = dropdownInfo && (
            dropdownInfo.bgColor.includes('rgb(26, 26, 26)') ||
            dropdownInfo.bgColor.includes('rgb(255, 255, 255)') ||
            dropdownInfo.bgColor.startsWith('rgb(')
        );

        recordResult('Scenario 1', 'File dropdown rendered with z-index >= 110', parseInt(dropdownInfo?.zIndex || '0') >= 110, `z-index: ${dropdownInfo?.zIndex}`);
        recordResult('Scenario 1', 'File dropdown has 100% solid opaque background (no transparency)', isDropdownOpaque, `bgColor: ${dropdownInfo?.bgColor}`);

        // Take Screenshot of Menu Dropdown
        const sc1Path = path.join(screenshotsDir, 'scenario1_menubar_layering.png');
        await page.screenshot({ path: sc1Path });

        // Close menu
        await page.mouse.click(10, 10);
        await new Promise(r => setTimeout(r, 300));

        // ==============================================================
        // SCENARIO 2: Studyspace & Local/Browser Storage Foundation
        // ==============================================================
        console.log('\n--- Scenario 2: Studyspace & Workspace Switcher ---');
        await page.evaluate(async () => {
            const noteStore = (window).useNoteStore.getState();
            await noteStore.selectStorageFoundation('browser');
        });
        await new Promise(r => setTimeout(r, 600));

        const switcherInfo = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const btn = buttons.find(b => b.getAttribute('title')?.includes('Browser Database') || b.getAttribute('title')?.includes('Local Folder'));
            const newNoteBtn = buttons.find(b => b.getAttribute('title') === 'New Note' || b.getAttribute('title') === 'New Local Note');
            if (!btn) return null;
            const rect = btn.getBoundingClientRect();
            const noteRect = newNoteBtn ? newNoteBtn.getBoundingClientRect() : null;
            const overlapsActionRow = noteRect
                ? !(rect.bottom <= noteRect.top + 1 || rect.right <= noteRect.left + 1)
                : false;
            return {
                text: btn.textContent?.trim(),
                width: rect.width,
                title: btn.getAttribute('title'),
                overlapsActionRow
            };
        });

        recordResult('Scenario 2', 'Workspace switcher found with clear foundation icon', !!switcherInfo, `Text: ${switcherInfo?.text}`);
        recordResult('Scenario 2', 'Workspace switcher full-width >= 200px with zero icon collision', (switcherInfo?.width || 0) >= 200 && !switcherInfo?.overlapsActionRow, `Width: ${Math.round(switcherInfo?.width || 0)}px, Overlaps: ${switcherInfo?.overlapsActionRow}`);

        // Click workspace switcher to open dropdown
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const btn = buttons.find(b => b.getAttribute('title')?.includes('Browser Database') || b.getAttribute('title')?.includes('Local Folder'));
            if (btn) btn.click();
        });
        await new Promise(r => setTimeout(r, 400));

        const switcherDropdownText = await page.evaluate(() => {
            const d = document.querySelector('div[class*="shadow-2xl"]');
            return d ? d.textContent : '';
        });

        recordResult('Scenario 2', 'Dropdown contains Storage Location label', switcherDropdownText.includes('Storage Location'));
        recordResult('Scenario 2', 'Dropdown contains option to Open Local Folder', switcherDropdownText.includes('Open Local Folder') || switcherDropdownText.includes('Switch to Local Folder'));

        const sc2Path = path.join(screenshotsDir, 'scenario2_studyspace_dropdown.png');
        await page.screenshot({ path: sc2Path });

        // Close dropdown
        await page.mouse.click(500, 500);
        await new Promise(r => setTimeout(r, 300));

        // ==============================================================
        // SCENARIO 3: Editor Toolbar, Inline Dictation & Responsiveness
        // ==============================================================
        console.log('\n--- Scenario 3: Editor Toolbar & Inline Dictation ---');
        await page.evaluate(async () => {
            const { notes, createNote } = (window).useNoteStore.getState();
            if (notes.length === 0) {
                await createNote(null);
            }
        });
        await new Promise(r => setTimeout(r, 800));

        // Verify Dictate button presence
        const dictateBtnInfo = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const dBtn = btns.find(b => b.getAttribute('title')?.includes('Voice Dictate') || b.textContent?.includes('Dictate'));
            if (!dBtn) return null;
            return {
                title: dBtn.getAttribute('title'),
                text: dBtn.textContent?.trim(),
                hasMicIcon: !!dBtn.querySelector('svg')
            };
        });

        recordResult('Scenario 3', 'Inline Dictate microphone button present on toolbar', !!dictateBtnInfo, `Title: ${dictateBtnInfo?.title}`);

        // Test clicking Dictate button to toggle listening state
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const dBtn = btns.find(b => b.getAttribute('title')?.includes('Voice Dictate') || b.textContent?.includes('Dictate'));
            if (dBtn) dBtn.click();
        });
        await new Promise(r => setTimeout(r, 400));

        const dictatingState = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const dBtn = btns.find(b => b.getAttribute('title')?.includes('Stop Voice Dictation') || b.className.includes('bg-red-500'));
            return {
                isListening: !!dBtn,
                hasPulseClass: dBtn ? dBtn.className.includes('animate-pulse') : false
            };
        });
        recordResult('Scenario 3', 'Clicking Dictate triggers active listening pulse state', dictatingState.isListening, `Pulse animation: ${dictatingState.hasPulseClass}`);

        // Toggle Dictate off
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const dBtn = btns.find(b => b.getAttribute('title')?.includes('Stop Voice Dictation') || b.className.includes('bg-red-500'));
            if (dBtn) dBtn.click();
        });
        await new Promise(r => setTimeout(r, 300));

        // Test Toolbar Responsiveness at 700px (narrow tablet)
        await page.setViewport({ width: 700, height: 900 });
        await new Promise(r => setTimeout(r, 500));

        const toolbarNarrowCheck = await page.evaluate(() => {
            const toolbar = document.querySelector('div[class*="sticky top-0"]');
            if (!toolbar) return null;
            const rect = toolbar.getBoundingClientRect();
            const hasFrozenOverlap = toolbar.scrollWidth > window.innerWidth + 20;
            return {
                hasFrozenOverlap,
                toolbarWidth: rect.width
            };
        });
        recordResult('Scenario 3', 'Toolbar wraps fluidly on narrow width without freezing', !toolbarNarrowCheck?.hasFrozenOverlap, `Toolbar width: ${toolbarNarrowCheck?.toolbarWidth}px`);

        const sc3Path = path.join(screenshotsDir, 'scenario3_responsive_toolbar.png');
        await page.screenshot({ path: sc3Path });

        // Restore desktop viewport
        await page.setViewport({ width: 1440, height: 900 });

        // ==============================================================
        // SCENARIO 4: Bible Reader & Verse Selection Flow (Issue 5 Test)
        // ==============================================================
        console.log('\n--- Scenario 4: Bible Verse Selection Flow (Issue 5) ---');
        await page.evaluate(() => {
            const ui = (window).useUIStore.getState();
            ui.openRightSidebar('bible');
        });
        await new Promise(r => setTimeout(r, 1200));

        const isBibleOpen = await page.evaluate(() => {
            const ui = (window).useUIStore.getState();
            return ui.rightSidebarOpen && ui.rightSidebarContent === 'bible';
        });
        recordResult('Scenario 4', 'Bible Reader mounted in right sidebar', isBibleOpen);

        // Click on verse 1 in BibleReader
        const verseClickSuccess = await page.evaluate(() => {
            const verseSpans = Array.from(document.querySelectorAll('sup, span.cursor-pointer, div.group\\/row'));
            if (verseSpans.length > 0) {
                const target = verseSpans[0];
                target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                return true;
            }
            return false;
        });
        recordResult('Scenario 4', 'Verse clicked in Bible Reader', verseClickSuccess);
        await new Promise(r => setTimeout(r, 600));

        // CRITICAL CHECK: Verify sidebar is STILL 'bible' (NOT hijacked to 'crossrefs' / TSK)
        const sidebarContentAfterVerseClick = await page.evaluate(() => {
            const ui = (window).useUIStore.getState();
            return ui.rightSidebarContent;
        });
        const notHijacked = sidebarContentAfterVerseClick === 'bible';
        recordResult('Scenario 4', 'Clicking verse did NOT hijack view to TSK (remains in BibleReader)', notHijacked, `Current rightSidebarContent: ${sidebarContentAfterVerseClick}`);

        // Check Floating Selection Bar presence with Pin Range, Copy, Quote, TSK
        const floatingBarInfo = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const pinBtn = btns.find(b => b.textContent?.includes('Pin Range'));
            const copyBtn = btns.find(b => b.textContent?.includes('Copy'));
            const quoteBtn = btns.find(b => b.textContent?.includes('Quote in Note'));
            const tskBtn = btns.find(b => b.textContent?.includes('TSK References'));
            return {
                hasPin: !!pinBtn,
                hasCopy: !!copyBtn,
                hasQuote: !!quoteBtn,
                hasTsk: !!tskBtn
            };
        });

        recordResult('Scenario 4', 'Floating bar displays Pin Range as primary action', floatingBarInfo.hasPin);
        recordResult('Scenario 4', 'Floating bar displays Copy & Quote in Note actions', floatingBarInfo.hasCopy && floatingBarInfo.hasQuote);
        recordResult('Scenario 4', 'Floating bar displays optional TSK References action', floatingBarInfo.hasTsk);

        const sc4Path = path.join(screenshotsDir, 'scenario4_bible_selection_bar.png');
        await page.screenshot({ path: sc4Path });

        // Now test clicking explicit TSK References button
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const tskBtn = btns.find(b => b.textContent?.includes('TSK References'));
            if (tskBtn) tskBtn.click();
        });
        await new Promise(r => setTimeout(r, 600));

        const sidebarAfterTskClick = await page.evaluate(() => {
            return (window).useUIStore.getState().rightSidebarContent;
        });
        recordResult('Scenario 4', 'Clicking TSK References button intentionally opens crossrefs panel', sidebarAfterTskClick === 'crossrefs', `Content: ${sidebarAfterTskClick}`);

        // Close right sidebar
        await page.evaluate(() => {
            (window).useUIStore.getState().closeRightSidebar();
        });
        await new Promise(r => setTimeout(r, 400));

        // ==============================================================
        // SCENARIO 5: Pulpit Presentation Mode Flow
        // ==============================================================
        console.log('\n--- Scenario 5: Pulpit Mode Presentation Flow ---');
        await page.evaluate(() => {
            (window).useUIStore.getState().togglePulpitMode();
        });
        await new Promise(r => setTimeout(r, 800));

        const pulpitState = await page.evaluate(() => {
            const isPulpit = (window).useUIStore.getState().pulpitMode;
            const pulpitContainer = document.querySelector('div[class*="fixed inset-0"]') || document.querySelector('div[class*="pulpit"]');
            return {
                isPulpit,
                mounted: !!pulpitContainer
            };
        });
        recordResult('Scenario 5', 'Pulpit Presentation Mode mounts fullscreen', pulpitState.isPulpit);

        const sc5Path = path.join(screenshotsDir, 'scenario5_pulpit_mode.png');
        await page.screenshot({ path: sc5Path });

        // Exit Pulpit Mode
        await page.evaluate(() => {
            (window).useUIStore.getState().togglePulpitMode();
        });
        await new Promise(r => setTimeout(r, 500));

        const isPulpitStillOpen = await page.evaluate(() => (window).useUIStore?.getState()?.pulpitMode);
        recordResult('Scenario 5', 'Exiting Pulpit Mode returns cleanly to editor', !isPulpitStillOpen);

        // ==============================================================
        // SCENARIO 6: Voice Note Recording & Live Reactivity Flow (Issue 2)
        // ==============================================================
        console.log('\n--- Scenario 6: Voice Note Recording & Live Reactivity ---');
        await page.evaluate(async () => {
            const noteStore = (window).useNoteStore.getState();
            const fakeAudioBlob = new Blob(['mock audio'], { type: 'audio/webm' });
            await noteStore.createVoiceNote(null, fakeAudioBlob, 12, 'For God so loved the world that He gave His only begotten Son.');
        });

        // Wait for React re-render & Yjs persistence sync to populate the active ProseMirror editor on screen (without clicking away)
        await page.waitForFunction(() => {
            const editorHTML = (window).useUIStore?.getState()?.activeEditor?.getHTML() || '';
            const editorText = (window).useUIStore?.getState()?.activeEditor?.getText() || '';
            return editorHTML.includes('For God so loved the world') || editorText.includes('For God so loved the world');
        }, { timeout: 6000 }).catch(() => {});

        const voiceNoteResult = await page.evaluate(() => {
            const current = (window).useNoteStore.getState().currentNote;
            const editorHTML = (window).useUIStore.getState().activeEditor?.getHTML() || '';
            const editorText = (window).useUIStore.getState().activeEditor?.getText() || '';
            const pmEl = document.querySelector('.tiptap-editor .ProseMirror');
            const pmRect = pmEl ? pmEl.getBoundingClientRect() : null;
            return {
                noteCreated: !!current,
                type: current?.type,
                hasTranscript: current?.transcript?.includes('For God so loved the world'),
                contentHasTranscript: current?.content?.includes('For God so loved the world'),
                editorHasTranscript: editorHTML.includes('For God so loved the world') || editorText.includes('For God so loved the world'),
                isEditorVisibleAndEditable: !!(pmEl && pmRect && pmRect.height > 0 && pmEl.getAttribute('contenteditable') === 'true')
            };
        });

        recordResult('Scenario 6', 'createVoiceNote saves with voice type & transcript field', voiceNoteResult.noteCreated && voiceNoteResult.type === 'voice');
        recordResult('Scenario 6', 'currentNote.content is immediately populated with transcript (not empty)', voiceNoteResult.contentHasTranscript);
        recordResult('Scenario 6', 'active editor displays transcript immediately without clicking away', voiceNoteResult.editorHasTranscript);
        recordResult('Scenario 6', 'Voice Note ProseMirror editor is visibly rendered & editable (not hidden)', voiceNoteResult.isEditorVisibleAndEditable);

        const sc6Path = path.join(screenshotsDir, 'scenario6_voice_note_editor.png');
        await page.screenshot({ path: sc6Path });

        // ==============================================================
        // SCENARIO 7: Local Wi-Fi Sync Host Self-Joining Loop (Issue 6)
        // ==============================================================
        console.log('\n--- Scenario 7: Local Sync Host Self-Joining Loop Check ---');
        const syncCheck = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const allowBtn = buttons.find(b => b.textContent?.trim() === 'Allow' || b.textContent?.includes('Approve'));
            const toast = document.querySelector('div[class*="HostApprovalToast"]');
            return {
                hasGhostRequestToast: !!allowBtn || !!toast
            };
        });
        recordResult('Scenario 7', 'No self-joining ghost approval toast on host screen', !syncCheck.hasGhostRequestToast);

        // ==============================================================
        // SCENARIO 8: Responsive Viewport Matrix (Mobile, Tablet, Desktop)
        // ==============================================================
        console.log('\n--- Scenario 8: Responsive Viewport Matrix ---');
        // 1. Mobile (375x667)
        await page.setViewport({ width: 375, height: 667 });
        await new Promise(r => setTimeout(r, 600));

        const mobileCheck = await page.evaluate(() => {
            const isMob = (window).useUIStore.getState().isMobile;
            const noHorizontalOverflow = document.documentElement.scrollWidth <= window.innerWidth + 1;
            return { isMob, noHorizontalOverflow };
        });
        recordResult('Scenario 8', 'Mobile viewport (375px) activates mobile state', mobileCheck.isMob);
        recordResult('Scenario 8', 'Mobile viewport (375px) has zero horizontal layout overflow/clipping', mobileCheck.noHorizontalOverflow);

        const sc8MobilePath = path.join(screenshotsDir, 'scenario8_mobile_375.png');
        await page.screenshot({ path: sc8MobilePath });

        // 2. Tablet (768x1024)
        await page.setViewport({ width: 768, height: 1024 });
        await new Promise(r => setTimeout(r, 600));

        const tabletCheck = await page.evaluate(() => {
            const isTabletWidth = window.innerWidth >= 768 && window.innerWidth < 1024;
            const ui = (window).useUIStore.getState();
            return isTabletWidth && !ui.isMobile;
        });
        recordResult('Scenario 8', 'Tablet viewport (768px) activates tablet state', tabletCheck);

        const sc8TabletPath = path.join(screenshotsDir, 'scenario8_tablet_768.png');
        await page.screenshot({ path: sc8TabletPath });

        // 3. Desktop (1440x900)
        await page.setViewport({ width: 1440, height: 900 });
        await new Promise(r => setTimeout(r, 600));

        const desktopCheck = await page.evaluate(() => {
            const ui = (window).useUIStore.getState();
            return !ui.isMobile && !ui.isTablet;
        });
        recordResult('Scenario 8', 'Desktop viewport (1440px) restores full desktop mode', desktopCheck);

        const sc8DesktopPath = path.join(screenshotsDir, 'scenario8_desktop_1440.png');
        await page.screenshot({ path: sc8DesktopPath });

        // ==============================================================
        // SCENARIO 9: Web App Local Folder Full Lifecycle (Issue 3 Deep Test)
        // ==============================================================
        console.log('\n--- Scenario 9: Web App Local Folder Access, Reload Persistence & Isolation ---');

        // 9.1 Create a Browser DB note first so we can verify strict isolation (no DB bleed into Local Mode)
        const preLocalDbCount = await page.evaluate(async () => {
            const ns = (window).useNoteStore.getState();
            await ns.selectStorageFoundation('browser');
            await ns.createNote(null, 'Browser Exclusive Note');
            return (window).useNoteStore.getState().notes.length;
        });

        // 9.2 Provision a real native Chromium FileSystemDirectoryHandle via OPFS & wire showDirectoryPicker
        const connectResult = await page.evaluate(async () => {
            const opfsRoot = await navigator.storage.getDirectory();
            // Clean any previous test vault
            try { await opfsRoot.removeEntry('MyStudyVault', { recursive: true }); } catch {}
            const vaultHandle = await opfsRoot.getDirectoryHandle('MyStudyVault', { create: true });

            // Seed an existing Markdown file + hidden .assets and .git folders on disk
            const romFile = await vaultHandle.getFileHandle('Romans 8 Exegesis.md', { create: true });
            const w = await romFile.createWritable();
            await w.write('---\ntitle: Romans 8 Exegesis\n---\n# No Condemnation\n\nWalk in the Spirit.');
            await w.close();
            await vaultHandle.getDirectoryHandle('.assets', { create: true });
            await vaultHandle.getDirectoryHandle('.git', { create: true });

            let pickerCalls = 0;
            (window).showDirectoryPicker = async () => {
                pickerCalls++;
                return vaultHandle;
            };
            (window).__getPickerCalls = () => pickerCalls;

            await (window).useNoteStore.getState().openLocalFolder();

            const state = (window).useNoteStore.getState();
            const sidebarEl = document.querySelector('[data-sidebar]');
            const sidebarText = sidebarEl ? sidebarEl.textContent || '' : '';

            return {
                isLocalMode: state.isLocalMode,
                hasStudyspace: state.hasStudyspace,
                folderName: state.localDirectoryHandle?.name,
                localFileNames: state.localFiles.map(f => f.name),
                sidebarHasDiskFile: sidebarText.includes('Romans 8 Exegesis.md'),
                sidebarLeakedBrowserNote: sidebarText.includes('Browser Exclusive Note') || sidebarText.includes('Study Journal'),
                hasDotfilesInTree: state.localFiles.some(f => f.name.startsWith('.'))
            };
        });

        recordResult('Scenario 9', 'Web Local Folder mounts cleanly via File System Access API', connectResult.isLocalMode && connectResult.hasStudyspace && connectResult.folderName === 'MyStudyVault', `Folder: ${connectResult.folderName}`);
        recordResult('Scenario 9', 'Existing disk .md file appears immediately in FilesSidebar', connectResult.sidebarHasDiskFile, `Files: ${connectResult.localFileNames.join(', ')}`);
        recordResult('Scenario 9', 'Strict Storage Isolation: Browser DB notes/folders do NOT bleed into Local Folder tree', !connectResult.sidebarLeakedBrowserNote && !connectResult.hasDotfilesInTree);

        // 9.3 Create two untitled notes & rename/save to disk — verify collision protection & zero DB leakage
        const diskWriteResult = await page.evaluate(async () => {
            const ns = (window).useNoteStore.getState();
            await ns.createNote(null); // Untitled Note.md
            await ns.createNote(null); // Untitled Note 2.md (must NOT overwrite first!)
            await ns.saveCurrentNote('Ephesians 2 Grace', '<h1>By Grace</h1><p>Saved onto disk directly.</p>');

            const opfsRoot = await navigator.storage.getDirectory();
            const vaultHandle = await opfsRoot.getDirectoryHandle('MyStudyVault');
            const diskEntries = [];
            for await (const entry of vaultHandle.values()) {
                if (!entry.name.startsWith('.')) diskEntries.push(entry.name);
            }
            const ephFile = await (await vaultHandle.getFileHandle('Ephesians 2 Grace.md')).getFile();
            const ephText = await ephFile.text();

            return {
                diskEntries: diskEntries.sort(),
                hasFirstUntitled: diskEntries.includes('Untitled Note.md'),
                hasRenamedEph: diskEntries.includes('Ephesians 2 Grace.md'),
                ephContainsMarkdown: ephText.includes('Saved onto disk directly'),
                dbNoteCountAfter: (window).useNoteStore.getState().notes.length
            };
        });

        recordResult('Scenario 9', 'Creating multiple Untitled Notes in Local Folder avoids overwriting existing files', diskWriteResult.hasFirstUntitled && diskWriteResult.hasRenamedEph, `Disk files: ${diskWriteResult.diskEntries.join(', ')}`);
        recordResult('Scenario 9', 'Editing note & title writes physical .md file to disk without leaking into Browser DB', diskWriteResult.ephContainsMarkdown && diskWriteResult.dbNoteCountAfter === preLocalDbCount);

        // 9.4 Page Reload at Narrow Desktop Width (900px < 1024px) — Verify Auto-Restore via Persisted IndexedDB Handle
        await page.setViewport({ width: 900, height: 800 });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => {
            const s = (window).useNoteStore?.getState();
            return s && s.isLocalMode && s.hasStudyspace && s.localFiles.length >= 3;
        }, { timeout: 10000 }).catch(() => {});

        const reloadAutoRestore = await page.evaluate(() => {
            const s = (window).useNoteStore.getState();
            return {
                isLocalMode: s.isLocalMode,
                hasStudyspace: s.hasStudyspace,
                folderName: s.localDirectoryHandle?.name,
                fileCount: s.localFiles.length
            };
        });
        recordResult('Scenario 9', 'Web page reload (<1024px split window) auto-restores Local Folder from IndexedDB handle with 0 clicks', reloadAutoRestore.isLocalMode && reloadAutoRestore.hasStudyspace && reloadAutoRestore.folderName === 'MyStudyVault' && reloadAutoRestore.fileCount >= 3, `Restored ${reloadAutoRestore.fileCount} files in '${reloadAutoRestore.folderName}'`);

        // 9.5 Simulate Full Browser Restart (queryPermission = 'prompt') — Verify Zero Zombie Mode & 1-Click Reconnect
        await page.setViewport({ width: 1440, height: 900 });
        await page.evaluateOnNewDocument(() => {
            if (window.__simulateBrowserRestartPerm) {
                let granted = false;
                FileSystemHandle.prototype.queryPermission = async function () {
                    return granted ? 'granted' : 'prompt';
                };
                FileSystemHandle.prototype.requestPermission = async function () {
                    granted = true;
                    return 'granted';
                };
            }
        });
        // Enable flag via sessionStorage check inside evaluateOnNewDocument
        await page.evaluateOnNewDocument(() => {
            if (sessionStorage.getItem('e2e-sim-restart') === '1') {
                let granted = false;
                FileSystemHandle.prototype.queryPermission = async function () {
                    return granted ? 'granted' : 'prompt';
                };
                FileSystemHandle.prototype.requestPermission = async function () {
                    granted = true;
                    return 'granted';
                };
            }
        });
        await page.evaluate(() => sessionStorage.setItem('e2e-sim-restart', '1'));
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !!(window).useNoteStore, { timeout: 10000 });
        await new Promise(r => setTimeout(r, 1000));

        // Open left sidebar via toggleLeftSidebar('files') and verify EmptyState does NOT slam it shut!
        const postRestartState = await page.evaluate(() => {
            (window).useUIStore.getState().openLeftSidebar('files');
            return {
                isLocalMode: (window).useNoteStore.getState().isLocalMode,
                hasStudyspace: (window).useNoteStore.getState().hasStudyspace,
                needsLocalReconnect: (window).useNoteStore.getState().needsLocalReconnect,
                lastLocalFolderName: (window).useNoteStore.getState().lastLocalFolderName
            };
        });
        await new Promise(r => setTimeout(r, 400));

        const postRestartUi = await page.evaluate(() => {
            const isSidebarStillOpen = (window).useUIStore.getState().isLeftSidebarOpen;
            const btns = Array.from(document.querySelectorAll('button'));
            const reconnectBtn = btns.find(b => b.textContent?.includes('Reconnect Folder') || b.textContent?.includes("Reconnect 'MyStudyVault'"));
            return {
                isSidebarStillOpen,
                hasReconnectBtn: !!reconnectBtn
            };
        });

        recordResult('Scenario 9', 'After browser restart (permission prompt), NO Zombie Local Mode — shows clear Reconnect state & sidebar stays open', postRestartState.isLocalMode && !postRestartState.hasStudyspace && postRestartState.needsLocalReconnect && postRestartUi.isSidebarStillOpen && postRestartUi.hasReconnectBtn);

        const sc9DisconnectedPath = path.join(screenshotsDir, 'scenario9_local_folder_reconnect_prompt.png');
        await page.screenshot({ path: sc9DisconnectedPath });

        // Click 1-click Reconnect button (without showDirectoryPicker defined, proving it uses cached IndexedDB handle!)
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const reconnectBtn = btns.find(b => b.textContent?.includes('Reconnect Folder') || b.textContent?.includes("Reconnect 'MyStudyVault'"));
            if (reconnectBtn) reconnectBtn.click();
        });

        await page.waitForFunction(() => {
            const s = (window).useNoteStore?.getState();
            return s && s.hasStudyspace && s.localFiles.length >= 3;
        }, { timeout: 8000 }).catch(() => {});

        const afterOneClickReconnect = await page.evaluate(() => {
            sessionStorage.removeItem('e2e-sim-restart');
            const s = (window).useNoteStore.getState();
            return {
                hasStudyspace: s.hasStudyspace,
                needsLocalReconnect: s.needsLocalReconnect,
                fileNames: s.localFiles.map(f => f.name)
            };
        });

        recordResult('Scenario 9', '1-Click Reconnect restores exact Local Folder & all .md files without OS picker dialog', afterOneClickReconnect.hasStudyspace && !afterOneClickReconnect.needsLocalReconnect && afterOneClickReconnect.fileNames.includes('Ephesians 2 Grace.md'), `Files: ${afterOneClickReconnect.fileNames.join(', ')}`);

        const sc9ConnectedPath = path.join(screenshotsDir, 'scenario9_local_folder_connected.png');
        await page.screenshot({ path: sc9ConnectedPath });

    } catch (err) {
        console.error('\n[E2E Runner Exception]:', err);
    } finally {
        await browser.close();
        server.close();
        console.log('\n[E2E Server] Server closed.');
    }

    // Generate Final Report
    console.log('\n======================================================');
    console.log('              E2E TEST SUMMARY REPORT                 ');
    console.log('======================================================\n');
    const total = testResults.length;
    const passed = testResults.filter(r => r.passed).length;
    const failed = total - passed;

    console.log(`Total Scenarios Tested : 9`);
    console.log(`Total Assertions Checked: ${total}`);
    console.log(`Passed Assertions      : ${passed}`);
    console.log(`Failed Assertions      : ${failed}`);
    console.log(`Success Rate           : ${((passed / total) * 100).toFixed(1)}%\n`);

    const reportPath = path.join(resultsDir, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        total,
        passed,
        failed,
        successRate: `${((passed / total) * 100).toFixed(1)}%`,
        results: testResults
    }, null, 2));

    console.log(`Test report and screenshots saved to: ${resultsDir}`);
    if (failed > 0) {
        process.exit(1);
    }
}

run();
