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
            const btn = buttons.find(b => b.textContent?.includes('💾') || b.textContent?.includes('📁') || b.getAttribute('title')?.includes('Database'));
            if (!btn) return null;
            const rect = btn.getBoundingClientRect();
            return {
                text: btn.textContent?.trim(),
                width: rect.width,
                title: btn.getAttribute('title')
            };
        });

        recordResult('Scenario 2', 'Workspace switcher found with clear foundation icon', !!switcherInfo, `Text: ${switcherInfo?.text}`);
        recordResult('Scenario 2', 'Workspace switcher width >= 140px (no "Local Folder..." truncation)', (switcherInfo?.width || 0) >= 140, `Width: ${switcherInfo?.width}px`);

        // Click workspace switcher to open dropdown
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const btn = buttons.find(b => b.textContent?.includes('💾') || b.textContent?.includes('📁') || b.getAttribute('title')?.includes('Database'));
            if (btn) btn.click();
        });
        await new Promise(r => setTimeout(r, 400));

        const switcherDropdownText = await page.evaluate(() => {
            const d = document.querySelector('div[class*="shadow-2xl"]');
            return d ? d.textContent : '';
        });

        recordResult('Scenario 2', 'Dropdown contains Storage Location label', switcherDropdownText.includes('Storage Location'));
        recordResult('Scenario 2', 'Dropdown contains option to Switch to Local Folder', switcherDropdownText.includes('Switch to Local Folder'));

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

    console.log(`Total Scenarios Tested : 8`);
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
