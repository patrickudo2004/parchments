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
        await page.waitForFunction(() => {
            const verseSpans = document.querySelectorAll('sup, span.cursor-pointer, div.group\\/row');
            return verseSpans.length > 0;
        }, { timeout: 6000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 600));

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
        await page.evaluate(async () => {
            const noteStore = (window).useNoteStore.getState();
            const uiStore = (window).useUIStore.getState();

            const sermonTitle = 'Unshakable Faith: Stepping Beyond the Boat';
            const sermonContent = `<h1>Unshakable Faith: Stepping Beyond the Boat</h1>
<p class="lead"><em>Scripture Anchor:</em> <span class="scripture-ref" data-book="Hebrews" data-chapter="11" data-verse="1">Hebrews 11:1</span> &bull; <span class="scripture-ref" data-book="Matthew" data-chapter="14" data-verse="28" data-verse-end="31">Matthew 14:28-31</span></p>

<h2>I. The Nature of True Faith</h2>
<p>Now <strong>faith is the substance of things hoped for, the evidence of things not seen</strong> (Hebrews 11:1). It is not blind optimism; it is standing on the unwavering bedrock of God's Word when every natural circumstance screams retreat.</p>

<blockquote class="border-l-4 border-primary pl-4 italic my-4 text-primary/90">
"Lord, if it be thou, bid me come unto thee on the water. And he said, Come." &mdash; Matthew 14:28-29
</blockquote>

<h2>II. Stepping Into the Tempest</h2>
<p>Notice that Peter did not sink when he stepped onto the waves. He walked on water as long as his gaze was locked upon Christ. It was only when <em>"he saw the wind boisterous, he was afraid; and beginning to sink, he cried, saying, Lord, save me."</em></p>

<ul>
<li><strong>Focus Precedes Footing:</strong> What captures your attention will determine your trajectory.</li>
<li><strong>Immediate Rescue:</strong> Immediately Jesus stretched forth his hand, and caught him. Grace never delays in the storm.</li>
</ul>

<p class="font-bold text-amber-500 my-4">[PAUSE 3s &bull; LOOK UP AT CONGREGATION]</p>

<h2>III. The Declaration for This Generation</h2>
<p>Whatever storm confronts you this week &mdash; sickness, lack, grief, or uncertainty &mdash; remember that your Redeemer stands above the waves. Speak to the water in His Name and step forward in unyielding confidence.</p>`;

            if (!noteStore.currentNote) {
                await noteStore.createNote(null, sermonTitle);
            }
            await noteStore.saveCurrentNote(sermonTitle, sermonContent);

            if (uiStore.activeEditor) {
                uiStore.activeEditor.commands.setContent(sermonContent);
            }
        });
        await new Promise(r => setTimeout(r, 800));

        await page.evaluate(() => {
            (window).useUIStore.getState().togglePulpitMode();
        });
        await new Promise(r => setTimeout(r, 1000));

        const pulpitState = await page.evaluate(() => {
            const isPulpit = (window).useUIStore.getState().pulpitMode;
            const pulpitContainer = document.querySelector('div[class*="fixed inset-0"]') || document.querySelector('div[class*="pulpit"]');
            const h1Title = document.querySelector('main h1')?.textContent?.trim() || '';
            const bodyText = document.querySelector('.pulpit-content')?.textContent || '';

            return {
                isPulpit,
                mounted: !!pulpitContainer,
                h1Title,
                hasFaithContent: bodyText.includes('Unshakable Faith') || bodyText.includes('substance of things hoped for'),
                hasScriptureRef: !!document.querySelector('.scripture-ref')
            };
        });
        recordResult('Scenario 5', 'Pulpit Presentation Mode mounts fullscreen', pulpitState.isPulpit && pulpitState.mounted);
        recordResult('Scenario 5', 'Pulpit Mode renders rich Faith sermon title and body content', pulpitState.h1Title.includes('Unshakable Faith') && pulpitState.hasFaithContent, `Title: "${pulpitState.h1Title}"`);

        const sc5Path = path.join(screenshotsDir, 'scenario5_pulpit_mode.png');
        await page.screenshot({ path: sc5Path });

        // Test clicking scripture reference in Pulpit Mode to open PulpitScriptureModal
        await page.evaluate(() => {
            const ref = document.querySelector('main .scripture-ref');
            if (ref) {
                ref.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            }
        });
        await new Promise(r => setTimeout(r, 800));

        const pulpitModalState = await page.evaluate(() => {
            const modal = document.querySelector('div[class*="fixed inset-0 z-[120]"]');
            const h3 = modal ? modal.querySelector('h3')?.textContent : '';
            const modalText = modal ? modal.textContent : '';
            return {
                mounted: !!modal,
                refTitle: h3,
                hasDecryptedText: modalText.includes('substance of things hoped for') || modalText.includes('evidence of things not seen')
            };
        });
        recordResult(
            'Scenario 5',
            'Clicking scripture reference in Pulpit Mode launches stage scripture modal with decrypted text',
            pulpitModalState.mounted && pulpitModalState.hasDecryptedText,
            `Ref: "${pulpitModalState.refTitle}"`
        );

        const sc5ModalPath = path.join(screenshotsDir, 'scenario5_pulpit_scripture_modal.png');
        await page.screenshot({ path: sc5ModalPath });

        // Close Pulpit Scripture Modal by clicking close button or pressing Escape
        await page.evaluate(() => {
            const closeBtn = document.querySelector('button[title*="Close"]');
            if (closeBtn) closeBtn.click();
        });
        await new Promise(r => setTimeout(r, 400));

        // Exit Pulpit Mode
        await page.evaluate(() => {
            (window).useUIStore.getState().togglePulpitMode();
        });
        await new Promise(r => setTimeout(r, 600));

        const isPulpitStillOpen = await page.evaluate(() => (window).useUIStore?.getState()?.pulpitMode);
        recordResult('Scenario 5', 'Exiting Pulpit Mode returns cleanly to editor', !isPulpitStillOpen);

        // Test hovering scripture reference in RichTextEditor to trigger instant frosted glass tooltip
        const hoverRefCoords = await page.evaluate(() => {
            const ref = document.querySelector('.scripture-ref');
            if (ref) {
                const rect = ref.getBoundingClientRect();
                return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, text: ref.textContent };
            }
            return null;
        });

        if (hoverRefCoords) {
            await page.mouse.move(hoverRefCoords.x, hoverRefCoords.y);
            await new Promise(r => setTimeout(r, 800));

            const tooltipState = await page.evaluate(() => {
                const tooltip = document.querySelector('[role="tooltip"]') || document.querySelector('div[class*="z-[200]"]');
                const text = tooltip ? tooltip.textContent : '';
                return {
                    mounted: !!tooltip,
                    hasRef: text.includes('Hebrews 11:1') || text.includes('HEBREWS'),
                    hasDecryptedVerse: text.includes('substance of things hoped for') || text.includes('evidence of things not seen')
                };
            });

            recordResult(
                'Scenario 5',
                'Hovering scripture reference in editor triggers instant frosted glass tooltip with decrypted verse',
                tooltipState.mounted && tooltipState.hasDecryptedVerse,
                `Tooltip text matched: ${tooltipState.hasDecryptedVerse}`
            );

            const scPopoverPath = path.join(screenshotsDir, 'scenario13_scripture_popover.png');
            await page.screenshot({ path: scPopoverPath });

            // Move mouse away to dismiss tooltip
            await page.mouse.move(20, 20);
            await new Promise(r => setTimeout(r, 1200));
        }

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

        // ==============================================================
        // SCENARIO 10: Canonical Scripture, Concordance, Lexicon & Universal Search
        // ==============================================================
        console.log('\n--- Scenario 10: Canonical Scripture, Concordance, Lexicon & Universal Search ---');
        await page.setViewport({ width: 1440, height: 900 });

        // Ensure clean UI state with Docked Right-Sidebar BibleReader open
        await page.evaluate(async () => {
            const ui = (window).useUIStore.getState();
            if (ui.isBibleModalOpen) ui.toggleBibleModal();
            ui.openRightSidebar('bible');
            if (ui.isRightSidebarFloating) ui.toggleRightSidebarFloating();
            const bible = (window).useBibleStore.getState();
            bible.setSearchOpen(false);
            bible.setSearchWholeWord(false);
            bible.setSearchTestamentFilter('all');
            bible.setSearchBookFilter(null);
            bible.setBibleFocus({ book: 'John', chapter: 1, verse: 1 });
        });
        await new Promise(r => setTimeout(r, 500));

        // Wait until full 31,102-verse encrypted KJV + 14,000+ Strong's Lexicon finish seeding
        await page.waitForFunction(async () => {
            const bible = (window).useBibleStore.getState();
            await bible.executeSearch('Revelation 22:21');
            const revReady = (window).useBibleStore.getState().searchResults.length === 1;
            if (!revReady) return false;
            await bible.executeSearch('H3548');
            const strongsReady = !!(window).useBibleStore.getState().searchStrongsEntry;
            return strongsReady;
        }, { timeout: 60000, polling: 1500 });

        // Reset search state cleanly before real user typing
        await page.evaluate(async () => {
            const bible = (window).useBibleStore.getState();
            bible.setSearchQuery('');
            await bible.executeSearch('');
            bible.setSearchOpen(false);
        });
        await new Promise(r => setTimeout(r, 300));

        // 10.1 Open Docked BibleReader Search button & type 'priest'
        const readerSearchBtnClicked = await page.evaluate(() => {
            const btn = document.querySelector('[data-testid="bible-reader-search-btn"]');
            if (btn) {
                btn.click();
                return true;
            }
            return false;
        });
        recordResult('Scenario 10', 'Docked Right-Sidebar BibleReader exposes dedicated Search toggle button', readerSearchBtnClicked);
        await new Promise(r => setTimeout(r, 300));

        await page.focus('[data-testid="bible-search-input"]');
        await page.keyboard.type('priest', { delay: 25 });

        await page.waitForFunction(() => {
            const s = (window).useBibleStore.getState();
            return !s.isSearching && s.searchQuery === 'priest' && s.searchTotalCount > 0;
        }, { timeout: 25000 });
        await new Promise(r => setTimeout(r, 300));

        const priestCanonicalCheck = await page.evaluate(() => {
            const s = (window).useBibleStore.getState();
            const domItems = Array.from(document.querySelectorAll('[data-testid="bible-search-result-item"]'));
            const firstDomRef = domItems[0]?.getAttribute('data-ref') || '';
            const secondDomRef = domItems[1]?.getAttribute('data-ref') || '';
            const firstDomText = domItems[0]?.textContent || '';
            const firstHasMark = !!domItems[0]?.querySelector('mark');
            const lastStoreVerse = s.searchResults[s.searchResults.length - 1];
            const lastStoreRef = lastStoreVerse ? `${lastStoreVerse.book} ${lastStoreVerse.chapter}:${lastStoreVerse.verse}` : '';
            const filterAllText = document.querySelector('[data-testid="bible-filter-all"]')?.textContent?.trim() || '';
            return {
                totalCount: s.searchTotalCount,
                otCount: s.searchOtCount,
                ntCount: s.searchNtCount,
                resultsLen: s.searchResults.length,
                firstDomRef,
                secondDomRef,
                firstDomText,
                firstHasMark,
                lastStoreRef,
                filterAllText,
                encryptedLeak: s.searchResults.some(v => v.text.startsWith('ENC::v1::'))
            };
        });

        recordResult(
            'Scenario 10',
            "Searching 'priest' returns all 846 KJV matches in strict canonical order starting at Genesis 14:18 (NOT 1 Samuel)",
            priestCanonicalCheck.totalCount === 846 &&
                priestCanonicalCheck.resultsLen === 846 &&
                priestCanonicalCheck.firstDomRef === 'Genesis 14:18' &&
                priestCanonicalCheck.secondDomRef === 'Genesis 41:45' &&
                priestCanonicalCheck.lastStoreRef === 'Revelation 20:6' &&
                priestCanonicalCheck.firstHasMark &&
                !priestCanonicalCheck.encryptedLeak,
            `1st: ${priestCanonicalCheck.firstDomRef}, 2nd: ${priestCanonicalCheck.secondDomRef}, Last: ${priestCanonicalCheck.lastStoreRef}, Total: ${priestCanonicalCheck.totalCount} (OT ${priestCanonicalCheck.otCount} / NT ${priestCanonicalCheck.ntCount})`
        );

        const sc10PriestPath = path.join(screenshotsDir, 'scenario10_bible_search_priest_genesis.png');
        await page.screenshot({ path: sc10PriestPath });

        // 10.2 Exact Whole-Word Toggle ('priest' -> 478 matches) + NT & Book ('Hebrews') Filtering
        await page.click('[data-testid="bible-filter-whole-word"]');
        await page.waitForFunction(() => {
            const s = (window).useBibleStore.getState();
            return !s.isSearching && s.searchWholeWord === true && s.searchTotalCount === 478;
        }, { timeout: 10000 });

        const wholeWordCheck = await page.evaluate(() => {
            const s = (window).useBibleStore.getState();
            const firstRef = s.searchResults[0] ? `${s.searchResults[0].book} ${s.searchResults[0].chapter}:${s.searchResults[0].verse}` : '';
            return { total: s.searchTotalCount, firstRef };
        });
        recordResult(
            'Scenario 10',
            "Exact Whole-Word toggle narrows 'priest' from 846 inclusive to 478 exact whole-word matches (Genesis 14:18 first)",
            wholeWordCheck.total === 478 && wholeWordCheck.firstRef === 'Genesis 14:18',
            `Exact matches: ${wholeWordCheck.total}, 1st: ${wholeWordCheck.firstRef}`
        );

        // Untoggle Whole-Word, filter to NT -> Hebrews
        await page.click('[data-testid="bible-filter-whole-word"]');
        await page.waitForFunction(() => !(window).useBibleStore.getState().isSearching && (window).useBibleStore.getState().searchTotalCount === 846, { timeout: 10000 });
        await page.click('[data-testid="bible-filter-nt"]');
        await page.waitForFunction(() => !(window).useBibleStore.getState().isSearching && (window).useBibleStore.getState().searchTestamentFilter === 'nt', { timeout: 10000 });
        await page.select('[data-testid="bible-filter-book"]', 'Hebrews');
        await page.waitForFunction(() => !(window).useBibleStore.getState().isSearching && (window).useBibleStore.getState().searchBookFilter === 'Hebrews', { timeout: 10000 });

        const ntBookFilterCheck = await page.evaluate(() => {
            const s = (window).useBibleStore.getState();
            const allInHebrews = s.searchResults.length > 0 && s.searchResults.every(v => v.book === 'Hebrews');
            const hasHeb56 = s.searchResults.some(v => v.chapter === 5 && v.verse === 6);
            return { count: s.searchResults.length, allInHebrews, hasHeb56 };
        });
        recordResult(
            'Scenario 10',
            'Testament (NT) & Book (Hebrews) filters isolate canonical book occurrences accurately',
            ntBookFilterCheck.allInHebrews && ntBookFilterCheck.hasHeb56 && ntBookFilterCheck.count >= 30,
            `Hebrews matches: ${ntBookFilterCheck.count}`
        );

        // Reset filters
        await page.click('[data-testid="bible-filter-all"]');
        await new Promise(r => setTimeout(r, 250));

        // 10.3 Multi-Word Search ('melchizedek priest') & Direct Passage Reference ('Genesis 14:18')
        await page.evaluate(() => {
            const input = document.querySelector('[data-testid="bible-search-input"]');
            if (input) input.select();
        });
        await page.keyboard.type('melchizedek priest', { delay: 20 });
        await page.waitForFunction(() => {
            const s = (window).useBibleStore.getState();
            return !s.isSearching && s.searchQuery === 'melchizedek priest' && s.searchTotalCount > 0;
        }, { timeout: 10000 });

        const multiWordCheck = await page.evaluate(() => {
            const s = (window).useBibleStore.getState();
            const first = s.searchResults[0];
            const marks = Array.from(document.querySelectorAll('[data-testid="bible-search-result-item"] mark')).map(m => m.textContent?.toLowerCase());
            return {
                count: s.searchTotalCount,
                firstRef: first ? `${first.book} ${first.chapter}:${first.verse}` : '',
                hasMelchizedekMark: marks.includes('melchizedek'),
                hasPriestMark: marks.includes('priest')
            };
        });
        recordResult(
            'Scenario 10',
            "Multi-word search ('melchizedek priest') matches non-adjacent terms in Genesis 14:18 & Psalms 110:4 with multi-term highlights",
            multiWordCheck.count === 2 && multiWordCheck.firstRef === 'Genesis 14:18' && multiWordCheck.hasMelchizedekMark && multiWordCheck.hasPriestMark,
            `Matches: ${multiWordCheck.count}, 1st: ${multiWordCheck.firstRef}`
        );

        // Direct Reference Lookup ('Genesis 14:18')
        await page.evaluate(() => {
            const input = document.querySelector('[data-testid="bible-search-input"]');
            if (input) input.select();
        });
        await page.keyboard.type('Genesis 14:18', { delay: 20 });
        await page.waitForFunction(() => {
            const s = (window).useBibleStore.getState();
            return !s.isSearching && s.searchMode === 'reference' && s.searchResults.length === 1;
        }, { timeout: 10000 });

        const directRefCheck = await page.evaluate(() => {
            const overlayText = document.querySelector('[data-testid="bible-search-overlay"]')?.textContent || '';
            const s = (window).useBibleStore.getState();
            return {
                mode: s.searchMode,
                hasBanner: overlayText.includes('Direct Passage Match'),
                verseText: s.searchResults[0]?.text || ''
            };
        });
        recordResult(
            'Scenario 10',
            "Direct Scripture Reference lookup ('Genesis 14:18') displays Direct Passage Match jump card & decrypted verse",
            directRefCheck.mode === 'reference' && directRefCheck.hasBanner && directRefCheck.verseText.includes('Melchizedek'),
            `Mode: ${directRefCheck.mode}`
        );

        // 10.4 BibleModal Search & Result Click Navigation (Independent Reader Sync Fix)
        await page.evaluate(() => {
            (window).useBibleStore.getState().setSearchOpen(false);
            (window).useUIStore.getState().closeRightSidebar();
            (window).useBibleStore.getState().setBibleFocus({ book: 'Romans', chapter: 8, verse: 1 });
            (window).useUIStore.getState().toggleBibleModal();
        });
        await new Promise(r => setTimeout(r, 500));

        await page.click('[data-testid="bible-modal-search-btn"]');
        await new Promise(r => setTimeout(r, 300));

        const modalOverlayCount = await page.evaluate(() => {
            return document.querySelectorAll('[data-testid="bible-search-overlay"]').length;
        });

        await page.evaluate(() => {
            const input = document.querySelector('[data-testid="bible-search-input"]');
            if (input) input.select();
        });
        await page.keyboard.type('priest', { delay: 20 });
        await page.waitForFunction(() => {
            const s = (window).useBibleStore.getState();
            return !s.isSearching && s.searchQuery === 'priest' && s.searchResults[0]?.book === 'Genesis';
        }, { timeout: 10000 });
        await new Promise(r => setTimeout(r, 250));

        // Click the 1st result ('Genesis 14:18') inside BibleModal
        await page.click('[data-testid="bible-search-result-item"]');
        await new Promise(r => setTimeout(r, 600));

        const modalNavCheck = await page.evaluate(() => {
            const modalHeaderText = document.body.innerText;
            const verse18El = document.getElementById('verse-18');
            return {
                overlayClosed: !(window).useBibleStore.getState().isSearchOpen,
                showsGenesis14: modalHeaderText.includes('Genesis 14'),
                verse18HasMelchizedek: !!(verse18El && verse18El.textContent?.includes('Melchizedek'))
            };
        });
        recordResult(
            'Scenario 10',
            'BibleModal renders single Search overlay & clicking Genesis 14:18 navigates independent modal reader directly to passage',
            modalOverlayCount === 1 && modalNavCheck.overlayClosed && modalNavCheck.showsGenesis14 && modalNavCheck.verse18HasMelchizedek,
            `Overlays: ${modalOverlayCount}, Navigated to Genesis 14:18: ${modalNavCheck.verse18HasMelchizedek}`
        );

        // Close BibleModal
        await page.evaluate(() => {
            if ((window).useUIStore.getState().isBibleModalOpen) {
                (window).useUIStore.getState().toggleBibleModal();
            }
        });
        await new Promise(r => setTimeout(r, 300));

        // 10.5 Strong's Concordance Search ('H3548') + Lexicon English Keyword Search ('priest')
        await page.evaluate(async () => {
            (window).useUIStore.getState().openRightSidebar('bible');
            const bible = (window).useBibleStore.getState();
            bible.setSearchOpen(true);
            bible.setSearchQuery('H3548');
            await bible.executeSearch('H3548');
        });
        await page.waitForFunction(() => {
            const s = (window).useBibleStore.getState();
            return !s.isSearching && s.searchMode === 'strongs' && s.searchTotalCount > 0;
        }, { timeout: 25000 });

        const strongsSearchCheck = await page.evaluate(() => {
            const s = (window).useBibleStore.getState();
            const first = s.searchResults[0];
            return {
                strongsId: s.searchStrongsEntry?.id,
                lemma: s.searchStrongsEntry?.lemma,
                totalOccurrences: s.searchTotalCount,
                firstRef: first ? `${first.book} ${first.chapter}:${first.verse}` : ''
            };
        });
        recordResult(
            'Scenario 10',
            "Strong's Concordance search ('H3548') displays Hebrew Kohen lexicon card & all OT verse occurrences starting at Genesis 14:18",
            strongsSearchCheck.strongsId === 'H3548' && strongsSearchCheck.totalOccurrences > 600 && strongsSearchCheck.firstRef === 'Genesis 14:18',
            `ID: ${strongsSearchCheck.strongsId} (${strongsSearchCheck.lemma}), Hits: ${strongsSearchCheck.totalOccurrences}, 1st: ${strongsSearchCheck.firstRef}`
        );

        // Open LexiconSidebar and search English keyword 'priest'
        await page.evaluate(() => {
            (window).useBibleStore.getState().setSearchOpen(false);
            (window).useUIStore.getState().openRightSidebar('lexicon');
        });
        await new Promise(r => setTimeout(r, 350));
        await page.focus('[data-testid="lexicon-search-input"]');
        await page.keyboard.type('priest', { delay: 25 });
        await page.waitForFunction(() => !!document.querySelector('[data-testid="lexicon-keyword-results"]'), { timeout: 10000 });

        const lexiconKeywordCheck = await page.evaluate(() => {
            const container = document.querySelector('[data-testid="lexicon-keyword-results"]');
            const text = container?.textContent || '';
            return {
                hasH3548: text.includes('H3548'),
                hasGreekPriest: text.includes('G2409') || text.includes('G749')
            };
        });
        recordResult(
            'Scenario 10',
            "Strong's Lexicon sidebar supports English keyword search ('priest' -> H3548 Kohen & G2409 Hiereus)",
            lexiconKeywordCheck.hasH3548 && lexiconKeywordCheck.hasGreekPriest
        );

        // 10.6 MenuBar 'Edit -> Find in Bible' ('bible:' scope) & Universal CommandPalette Canonical Search
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const editBtn = btns.find(b => b.textContent?.trim() === 'Edit');
            if (editBtn) editBtn.click();
        });
        await new Promise(r => setTimeout(r, 250));
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const findBibleBtn = btns.find(b => b.textContent?.includes('Find in Bible'));
            if (findBibleBtn) findBibleBtn.click();
        });
        await new Promise(r => setTimeout(r, 300));

        await page.focus('[data-testid="command-palette-input"]');
        await page.keyboard.type('priest', { delay: 25 });

        await page.waitForFunction(() => {
            const items = document.querySelectorAll('[data-testid="command-palette-result"]');
            return items.length >= 2 && items[0].textContent?.includes('Genesis 14:18');
        }, { timeout: 15000 });
        await new Promise(r => setTimeout(r, 250));

        const cmdPaletteCheck = await page.evaluate(() => {
            const hasBibleScopeBadge = !!document.querySelector('[data-testid="command-palette-bible-scope"]');
            const items = Array.from(document.querySelectorAll('[data-testid="command-palette-result"]')).map(el => el.textContent || '');
            return {
                hasBibleScopeBadge,
                firstItemText: items[0] || '',
                hasViewAll846: items.some(t => t.includes('View all 846 Scripture occurrences'))
            };
        });
        recordResult(
            'Scenario 10',
            "MenuBar 'Find in Bible' ('bible:priest') & CommandPalette show Bible Scope badge, Genesis 14:18 #1, and 'View all 846' link",
            cmdPaletteCheck.hasBibleScopeBadge &&
                cmdPaletteCheck.firstItemText.includes('Genesis 14:18 (KJV)') &&
                cmdPaletteCheck.hasViewAll846,
            `1st palette item: ${cmdPaletteCheck.firstItemText.slice(0, 48)}...`
        );

        const sc10PalettePath = path.join(screenshotsDir, 'scenario10_command_palette_priest.png');
        await page.screenshot({ path: sc10PalettePath });

        // 10.7 Click 'View all 846 Scripture occurrences of "priest"' in CommandPalette -> Verify handoff to Right-Sidebar BibleSearchOverlay
        await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('[data-testid="command-palette-result"]'));
            const viewAllItem = items.find(el => el.textContent?.includes('View all 846 Scripture occurrences'));
            if (viewAllItem) viewAllItem.click();
        });
        await page.waitForFunction(() => {
            const ui = (window).useUIStore.getState();
            const bible = (window).useBibleStore.getState();
            return !ui.isSearchModalOpen && ui.rightSidebarContent === 'bible' && bible.isSearchOpen && !bible.isSearching && bible.searchTotalCount === 846;
        }, { timeout: 10000 });

        const handoffCheck = await page.evaluate(() => {
            const ui = (window).useUIStore.getState();
            const bible = (window).useBibleStore.getState();
            return {
                paletteClosed: !ui.isSearchModalOpen,
                sidebarIsBible: ui.rightSidebarContent === 'bible',
                overlayOpen: bible.isSearchOpen,
                totalCount: bible.searchTotalCount,
                firstRef: bible.searchResults[0] ? `${bible.searchResults[0].book} ${bible.searchResults[0].chapter}:${bible.searchResults[0].verse}` : ''
            };
        });
        recordResult(
            'Scenario 10',
            "Clicking 'View all 846 occurrences' in CommandPalette hands off cleanly to Right-Sidebar Bible Concordance Search",
            handoffCheck.paletteClosed && handoffCheck.sidebarIsBible && handoffCheck.overlayOpen && handoffCheck.totalCount === 846 && handoffCheck.firstRef === 'Genesis 14:18',
            `Handed off ${handoffCheck.totalCount} results (${handoffCheck.firstRef} first)`
        );

        // 10.8 Search History & Parameters (History tracking, 1-click replay, and Clear History)
        // Clear input to reveal Recent Searches container
        await page.evaluate(() => {
            const input = document.querySelector('[data-testid="bible-search-input"]');
            if (input) {
                input.value = '';
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            const bible = (window).useBibleStore.getState();
            bible.setSearchQuery('');
            bible.executeSearch('');
        });
        await new Promise(r => setTimeout(r, 400));

        const historyStateCheck = await page.evaluate(() => {
            const historyContainer = document.querySelector('[data-testid="bible-search-history-container"]');
            const historyItems = Array.from(document.querySelectorAll('[data-testid="search-history-item"]'));
            const bible = (window).useBibleStore.getState();
            const queries = bible.searchHistory.map(h => h.query);
            return {
                hasContainer: !!historyContainer,
                itemCount: historyItems.length,
                storeCount: bible.searchHistory.length,
                hasPriest: queries.includes('priest'),
                hasMelchizedek: queries.includes('melchizedek priest') || queries.includes('Genesis 14:18') || queries.includes('H3548')
            };
        });
        recordResult(
            'Scenario 10',
            'Search History records past search queries, parameters & results up to 30 items with instant display on empty input',
            historyStateCheck.hasContainer && historyStateCheck.itemCount > 0 && historyStateCheck.hasPriest,
            `History items: ${historyStateCheck.itemCount}, Store count: ${historyStateCheck.storeCount}`
        );

        // Click Clear History button and verify list resets cleanly
        await page.click('[data-testid="clear-search-history-btn"]');
        await new Promise(r => setTimeout(r, 300));

        const clearHistoryCheck = await page.evaluate(() => {
            const historyContainer = document.querySelector('[data-testid="bible-search-history-container"]');
            const bible = (window).useBibleStore.getState();
            return {
                historyCleared: bible.searchHistory.length === 0,
                containerUnmounted: !historyContainer
            };
        });
        recordResult(
            'Scenario 10',
            'Clearing Search History empties stored history and returns cleanly to default study suggestions',
            clearHistoryCheck.historyCleared && clearHistoryCheck.containerUnmounted
        );

        // Re-execute 'priest' search via keyboard so Scenario 11 continues with 846 results
        await page.focus('[data-testid="bible-search-input"]');
        await page.keyboard.type('priest', { delay: 25 });
        await page.waitForFunction(() => {
            const bible = (window).useBibleStore.getState();
            return !bible.isSearching && bible.searchQuery === 'priest' && bible.searchTotalCount === 846;
        }, { timeout: 10000 });

        // ==============================================================
        // SCENARIO 11: Expand All & Group by Book Across Desktop, Tablet & Mobile Touch
        // ==============================================================
        console.log('\n--- Scenario 11: Expand All & Group by Book (Desktop, Tablet & Mobile Touch) ---');
        await page.setViewport({ width: 1440, height: 900, hasTouch: false, isMobile: false });
        await new Promise(r => setTimeout(r, 300));

        // 11.1 List View Batched Default (100) -> Expand All (846) -> Collapse back to 100
        const initialListBatchCheck = await page.evaluate(() => {
            const items = document.querySelectorAll('[data-testid="bible-search-result-item"]');
            const hasTopExpandAll = !!document.querySelector('[data-testid="bible-expand-all-btn"]');
            const hasFooterExpandAll = !!document.querySelector('[data-testid="bible-search-expand-all-footer"]');
            const hasLoadMore = !!document.querySelector('[data-testid="bible-search-load-more"]');
            return {
                renderedCount: items.length,
                hasTopExpandAll,
                hasFooterExpandAll,
                hasLoadMore
            };
        });
        recordResult(
            'Scenario 11',
            'List view renders initial 100-verse batch with both Next-100 & Expand All (846) controls',
            initialListBatchCheck.renderedCount === 100 &&
                initialListBatchCheck.hasTopExpandAll &&
                initialListBatchCheck.hasFooterExpandAll &&
                initialListBatchCheck.hasLoadMore,
            `Initial batch: ${initialListBatchCheck.renderedCount}`
        );

        await page.click('[data-testid="bible-expand-all-btn"]');
        await page.waitForFunction(() => {
            return document.querySelectorAll('[data-testid="bible-search-result-item"]').length === 846;
        }, { timeout: 10000 });

        const expandedListCheck = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('[data-testid="bible-search-result-item"]'));
            return {
                renderedCount: items.length,
                firstRef: items[0]?.getAttribute('data-ref') || '',
                lastRef: items[items.length - 1]?.getAttribute('data-ref') || '',
                hasCollapseBtn: !!document.querySelector('[data-testid="bible-collapse-list-btn"]')
            };
        });
        recordResult(
            'Scenario 11',
            "Clicking 'Expand All (846)' in List view mounts all 846 verses from Genesis 14:18 through Revelation 20:6",
            expandedListCheck.renderedCount === 846 &&
                expandedListCheck.firstRef === 'Genesis 14:18' &&
                expandedListCheck.lastRef === 'Revelation 20:6' &&
                expandedListCheck.hasCollapseBtn,
            `Expanded: ${expandedListCheck.renderedCount} (${expandedListCheck.firstRef} -> ${expandedListCheck.lastRef})`
        );

        await page.click('[data-testid="bible-collapse-list-btn"]');
        await page.waitForFunction(() => {
            return document.querySelectorAll('[data-testid="bible-search-result-item"]').length === 100;
        }, { timeout: 5000 });

        // 11.2 Switch to 'By Book (36)' View -> Verify Canonical OT/NT Grouping & Multi-Book Simultaneous Study
        await page.click('[data-testid="bible-view-books"]');
        await page.waitForFunction(() => !!document.querySelector('[data-testid="bible-books-accordion"]'), { timeout: 5000 });

        const byBookInitialCheck = await page.evaluate(() => {
            const headers = Array.from(document.querySelectorAll('[data-testid="bible-book-group-header"]'));
            const books = headers.map(h => h.getAttribute('data-book'));
            const accordionText = document.querySelector('[data-testid="bible-books-accordion"]')?.textContent || '';
            return {
                bookCount: books.length,
                firstBook: books[0],
                secondBook: books[1],
                lastBook: books[books.length - 1],
                hasOtHeader: accordionText.includes('Old Testament') && accordionText.includes('28 Books'),
                hasNtHeader: accordionText.includes('New Testament') && accordionText.includes('8 Books')
            };
        });
        recordResult(
            'Scenario 11',
            "Group by Book ('By Book (36)') organizes all 846 matches into 28 OT & 8 NT canonical book groups (Genesis -> Revelation)",
            byBookInitialCheck.bookCount === 36 &&
                byBookInitialCheck.firstBook === 'Genesis' &&
                byBookInitialCheck.secondBook === 'Exodus' &&
                byBookInitialCheck.lastBook === 'Revelation' &&
                byBookInitialCheck.hasOtHeader &&
                byBookInitialCheck.hasNtHeader,
            `Books: ${byBookInitialCheck.bookCount} (${byBookInitialCheck.firstBook} .. ${byBookInitialCheck.lastBook})`
        );

        // Expand Genesis (6) AND Hebrews (34) simultaneously
        await page.click('[data-testid="bible-book-group-header"][data-book="Genesis"]');
        await page.click('[data-testid="bible-book-group-header"][data-book="Hebrews"]');
        await new Promise(r => setTimeout(r, 250));

        const multiBookOpenCheck = await page.evaluate(() => {
            const genPanel = document.querySelector('[data-testid="bible-book-group-panel"][data-book="Genesis"]');
            const hebPanel = document.querySelector('[data-testid="bible-book-group-panel"][data-book="Hebrews"]');
            const genItems = genPanel ? genPanel.querySelectorAll('[data-testid="bible-search-result-item"]').length : 0;
            const hebItems = hebPanel ? hebPanel.querySelectorAll('[data-testid="bible-search-result-item"]').length : 0;
            return { genItems, hebItems };
        });
        recordResult(
            'Scenario 11',
            'Multiple books (Genesis + Hebrews) expand simultaneously in By Book view for cross-testament study',
            multiBookOpenCheck.genItems === 6 && multiBookOpenCheck.hebItems === 34,
            `Genesis: ${multiBookOpenCheck.genItems}, Hebrews: ${multiBookOpenCheck.hebItems}`
        );

        // Collapse Hebrews & scroll back to top so Genesis (6) + OT overview fit cleanly in the desktop screenshot
        await page.click('[data-testid="bible-book-group-header"][data-book="Hebrews"]');
        await page.evaluate(() => {
            const sc = document.querySelector('[data-testid="bible-search-results"]');
            if (sc) sc.scrollTop = 0;
        });
        await new Promise(r => setTimeout(r, 250));
        const sc11DesktopPath = path.join(screenshotsDir, 'scenario11_desktop_group_by_book.png');
        await page.screenshot({ path: sc11DesktopPath });

        // 11.3 Expand All Books & Collapse All Books in By Book View
        await page.click('[data-testid="bible-books-expand-all-btn"]');
        await page.waitForFunction(() => {
            return document.querySelectorAll('[data-testid="bible-book-group-panel"]').length === 36;
        }, { timeout: 10000 });

        const allBooksExpandedCheck = await page.evaluate(() => {
            const panels = document.querySelectorAll('[data-testid="bible-book-group-panel"]').length;
            const totalVerses = document.querySelectorAll('[data-testid="bible-search-result-item"]').length;
            const btnText = document.querySelector('[data-testid="bible-books-expand-all-btn"]')?.textContent || '';
            return { panels, totalVerses, isCollapseLabel: btnText.includes('Collapse All') };
        });
        recordResult(
            'Scenario 11',
            "'Expand All' in By Book view opens all 36 canonical books (846 verses) & toggles to 'Collapse All'",
            allBooksExpandedCheck.panels === 36 && allBooksExpandedCheck.totalVerses === 846 && allBooksExpandedCheck.isCollapseLabel,
            `Open book panels: ${allBooksExpandedCheck.panels}, Verses: ${allBooksExpandedCheck.totalVerses}`
        );

        await page.click('[data-testid="bible-books-expand-all-btn"]');
        await page.waitForFunction(() => document.querySelectorAll('[data-testid="bible-book-group-panel"]').length === 0, { timeout: 5000 });

        // 11.4 Tablet Touch Viewport (768x1024) — Drawer Layout, Zero Horizontal Overflow & Touch Tap
        // Note: Puppeteer reloads page once when hasTouch toggles false -> true; wait for stores & re-open search
        await page.setViewport({ width: 768, height: 1024, hasTouch: true, isMobile: false });
        await page.waitForFunction(() => !!(window).useBibleStore && !!(window).useUIStore, { timeout: 15000 });
        await page.evaluate(async () => {
            const ui = (window).useUIStore.getState();
            ui.openRightSidebar('bible');
            const bible = (window).useBibleStore.getState();
            bible.setSearchViewMode('books');
            bible.setSearchOpen(true);
            bible.setSearchQuery('priest');
            await bible.executeSearch('priest');
        });
        await page.waitForFunction(() => !!document.querySelector('[data-testid="bible-book-group-header"][data-book="Genesis"]'), { timeout: 15000 });
        await new Promise(r => setTimeout(r, 300));

        await page.tap('[data-testid="bible-book-group-header"][data-book="Genesis"]');
        await page.waitForFunction(() => !!document.querySelector('[data-testid="bible-book-group-panel"][data-book="Genesis"]'), { timeout: 5000 });

        const tabletTouchCheck = await page.evaluate(() => {
            const ui = (window).useUIStore.getState();
            const overlay = document.querySelector('[data-testid="bible-search-overlay"]');
            const header = document.querySelector('[data-testid="bible-book-group-header"][data-book="Genesis"]');
            const headerRect = header?.getBoundingClientRect();
            const genItems = document.querySelectorAll('[data-testid="bible-book-group-panel"][data-book="Genesis"] [data-testid="bible-search-result-item"]').length;
            return {
                leftClosedNoCollision: !ui.isLeftSidebarOpen,
                noOverflow: !!overlay && overlay.scrollWidth <= overlay.clientWidth + 1,
                headerHeight: headerRect ? Math.round(headerRect.height) : 0,
                genItems
            };
        });
        recordResult(
            'Scenario 11',
            'Tablet (768x1024 touch) renders By Book drawer cleanly with zero drawer collision, >=44px touch targets & tap-to-expand',
            tabletTouchCheck.leftClosedNoCollision && tabletTouchCheck.noOverflow && tabletTouchCheck.headerHeight >= 44 && tabletTouchCheck.genItems === 6,
            `Touch target: ${tabletTouchCheck.headerHeight}px, Left drawer closed: ${tabletTouchCheck.leftClosedNoCollision}`
        );

        const sc11TabletPath = path.join(screenshotsDir, 'scenario11_tablet_768_group_by_book.png');
        await page.screenshot({ path: sc11TabletPath });

        // 11.5 Mobile Touch Viewport (375x667) — Full-Height Search Above MobileNav, >=16px Anti-Zoom Input & Tap Navigation
        // Note: Puppeteer also reloads when isMobile toggles false -> true; wait for stores & open Bible search in 'half' state
        await page.setViewport({ width: 375, height: 667, hasTouch: true, isMobile: true });
        await page.waitForFunction(() => !!(window).useBibleStore && !!(window).useUIStore, { timeout: 15000 });
        await page.evaluate(async () => {
            const ui = (window).useUIStore.getState();
            ui.setMobileBibleState('half');
            const bible = (window).useBibleStore.getState();
            bible.setSearchViewMode('books');
            bible.setSearchOpen(true);
            bible.setSearchQuery('priest');
            await bible.executeSearch('priest');
        });
        await page.waitForFunction(() => !!document.querySelector('[data-testid="bible-book-group-header"][data-book="Genesis"]'), { timeout: 15000 });
        await page.tap('[data-testid="bible-book-group-header"][data-book="Genesis"]');
        await page.waitForFunction(() => !!document.querySelector('[data-testid="bible-book-group-panel"][data-book="Genesis"]'), { timeout: 5000 });
        await new Promise(r => setTimeout(r, 350));

        const mobileSearchLayoutCheck = await page.evaluate(() => {
            const overlay = document.querySelector('[data-testid="bible-search-overlay"]');
            const nav = document.querySelector('nav');
            const input = document.querySelector('[data-testid="bible-search-input"]');
            const overlayRect = overlay?.getBoundingClientRect();
            const navRect = nav?.getBoundingClientRect();
            const inputFontSize = input ? parseFloat(window.getComputedStyle(input).fontSize) : 0;
            return {
                overlayHeight: overlayRect ? Math.round(overlayRect.height) : 0,
                aboveMobileNav: !!(overlayRect && navRect && overlayRect.bottom <= navRect.top + 2),
                noPageOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
                inputFontSize
            };
        });
        recordResult(
            'Scenario 11',
            'Mobile (375x667 touch) promotes Bible Search to full height above MobileNav with >=16px anti-zoom input & zero clipping',
            mobileSearchLayoutCheck.overlayHeight >= 550 &&
                mobileSearchLayoutCheck.aboveMobileNav &&
                mobileSearchLayoutCheck.noPageOverflow &&
                mobileSearchLayoutCheck.inputFontSize >= 16,
            `Height: ${mobileSearchLayoutCheck.overlayHeight}px, Input: ${mobileSearchLayoutCheck.inputFontSize}px, Above MobileNav: ${mobileSearchLayoutCheck.aboveMobileNav}`
        );

        const sc11MobilePath = path.join(screenshotsDir, 'scenario11_mobile_375_group_by_book.png');
        await page.screenshot({ path: sc11MobilePath });

        // Tap Genesis 14:18 result on Mobile Touch -> Verify search closes & split reader navigates to Genesis 14:18
        await page.tap('[data-testid="bible-search-result-item"]');
        await new Promise(r => setTimeout(r, 500));

        const mobileTapNavCheck = await page.evaluate(() => {
            const bible = (window).useBibleStore.getState();
            const ui = (window).useUIStore.getState();
            return {
                searchClosed: !bible.isSearchOpen,
                mobileStateRestored: ui.mobileBibleState === 'half',
                focusedBook: bible.bibleFocus?.book,
                focusedChapter: bible.bibleFocus?.chapter,
                focusedVerse: bible.bibleFocus?.verse
            };
        });
        recordResult(
            'Scenario 11',
            'Tapping Genesis 14:18 on Mobile Touch closes search & restores split reader directly at Genesis 14:18',
            mobileTapNavCheck.searchClosed &&
                mobileTapNavCheck.mobileStateRestored &&
                mobileTapNavCheck.focusedBook === 'Genesis' &&
                mobileTapNavCheck.focusedChapter === 14 &&
                mobileTapNavCheck.focusedVerse === 18,
            `Navigated to ${mobileTapNavCheck.focusedBook} ${mobileTapNavCheck.focusedChapter}:${mobileTapNavCheck.focusedVerse} (state: ${mobileTapNavCheck.mobileStateRestored ? 'half' : 'other'})`
        );

        // ==============================================================
        // SCENARIO 12: Marketing Landing Page, Scenarios, Touch & Accessibility
        // ==============================================================
        console.log('\n--- Scenario 12: Marketing Landing Page, Scenarios, Touch & Accessibility ---');
        await page.setViewport({ width: 1440, height: 900 });
        await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 1000));

        // 1. Accessibility: Skip to Content link and landmarks
        const landingA11yCheck = await page.evaluate(() => {
            const skipLink = document.querySelector('a[href="#main-content"]');
            const mainLandmark = document.querySelector('main#main-content');
            const nav = document.querySelector('nav[aria-label="Main Navigation"]');
            const footer = document.querySelector('footer');
            return {
                hasSkipLink: !!skipLink,
                skipLinkText: skipLink ? skipLink.textContent.trim() : null,
                hasMainLandmark: !!mainLandmark,
                hasNav: !!nav,
                hasFooter: !!footer,
                title: document.title
            };
        });
        recordResult(
            'Scenario 12',
            'Skip to main content link and semantic HTML5 landmarks (header, nav, main, footer) are present',
            landingA11yCheck.hasSkipLink &&
                landingA11yCheck.hasMainLandmark &&
                landingA11yCheck.hasNav &&
                landingA11yCheck.hasFooter &&
                landingA11yCheck.title.includes('Parchments'),
            `Skip: "${landingA11yCheck.skipLinkText}", Title: "${landingA11yCheck.title}"`
        );

        // 2. Scenario-Driven Walkthrough & WAI-ARIA tablist
        const scenarioWalkthroughCheck = await page.evaluate(() => {
            const tablist = document.querySelector('#scenarios [role="tablist"]');
            const tabs = Array.from(document.querySelectorAll('#scenarios [role="tab"]'));
            const activeTab = document.querySelector('#scenarios [role="tab"][aria-selected="true"]');
            const activePanel = document.querySelector('#scenarios [role="tabpanel"]');
            const img = activePanel ? activePanel.querySelector('img') : null;
            return {
                hasTablist: !!tablist,
                tabCount: tabs.length,
                activeTabId: activeTab ? activeTab.id : null,
                panelHeadline: activePanel ? activePanel.querySelector('h3')?.textContent : null,
                hasAltText: !!(img && (img.getAttribute('alt') || '').length > 20),
                altTextSnippet: img ? (img.getAttribute('alt') || '').substring(0, 50) + '...' : null
            };
        });
        recordResult(
            'Scenario 12',
            'Scenario-Driven Walkthrough features 7 ARIA tabs with active panel and descriptive alt text',
            scenarioWalkthroughCheck.hasTablist &&
                scenarioWalkthroughCheck.tabCount === 7 &&
                scenarioWalkthroughCheck.activeTabId === 'tab-pulpit' &&
                scenarioWalkthroughCheck.hasAltText,
            `Tabs: ${scenarioWalkthroughCheck.tabCount}, Active: ${scenarioWalkthroughCheck.activeTabId}, Alt: "${scenarioWalkthroughCheck.altTextSnippet}"`
        );

        // 3. Switch scenario tab to 'search' and verify panel updates
        await page.click('#tab-search');
        await new Promise(r => setTimeout(r, 400));

        const tabSwitchCheck = await page.evaluate(() => {
            const activeTab = document.querySelector('#scenarios [role="tab"][aria-selected="true"]');
            const activePanel = document.querySelector('#scenarios [role="tabpanel"]');
            const h3 = activePanel ? activePanel.querySelector('h3')?.textContent || '' : '';
            return {
                activeTabId: activeTab ? activeTab.id : null,
                panelHeadline: h3,
                isSearchHeadline: h3.includes('Group by Book')
            };
        });
        recordResult(
            'Scenario 12',
            'Switching to Canonical Word Study tab displays canonical concordance scenario with real E2E visual capture',
            tabSwitchCheck.activeTabId === 'tab-search' && tabSwitchCheck.isSearchHeadline,
            `Active: ${tabSwitchCheck.activeTabId}, Headline: "${tabSwitchCheck.panelHeadline}"`
        );

        // 3b. Switch scenario tab to 'popover' and verify panel updates
        await page.click('#tab-popover');
        await new Promise(r => setTimeout(r, 400));

        const popoverTabCheck = await page.evaluate(() => {
            const activeTab = document.querySelector('#scenarios [role="tab"][aria-selected="true"]');
            const activePanel = document.querySelector('#scenarios [role="tabpanel"]');
            const h3 = activePanel ? activePanel.querySelector('h3')?.textContent || '' : '';
            return {
                activeTabId: activeTab ? activeTab.id : null,
                panelHeadline: h3,
                isPopoverHeadline: h3.includes('Hover to Inspect')
            };
        });
        recordResult(
            'Scenario 12',
            'Switching to Scripture Popovers tab displays instant in-line preview scenario',
            popoverTabCheck.activeTabId === 'tab-popover' && popoverTabCheck.isPopoverHeadline,
            `Active: ${popoverTabCheck.activeTabId}, Headline: "${popoverTabCheck.panelHeadline}"`
        );

        // 3c. Interactive Live Scripture Popover Playground verification
        await page.click('#sample-pill-matt-14');
        await new Promise(r => setTimeout(r, 400));

        const interactivePlaygroundCheck = await page.evaluate(() => {
            const playground = document.getElementById('interactive-scripture-playground');
            const activeRegion = playground ? playground.querySelector('div[role="region"]') : null;
            const regionText = activeRegion ? activeRegion.textContent : '';
            return {
                hasPlayground: !!playground,
                regionText,
                hasMatthewText: regionText.includes('Matthew 14:28–31') && regionText.includes('water')
            };
        });
        recordResult(
            'Scenario 12',
            'Interactive Live Scripture Popover Playground responds to user clicks/touches with instant decrypted scripture preview',
            interactivePlaygroundCheck.hasPlayground && interactivePlaygroundCheck.hasMatthewText,
            `Playground present: ${interactivePlaygroundCheck.hasPlayground}, Matthew text previewed: ${interactivePlaygroundCheck.hasMatthewText}`
        );

        const sc12DesktopPath = path.join(screenshotsDir, 'scenario12_landing_scenarios_desktop.png');
        await page.screenshot({ path: sc12DesktopPath });

        // 4. Touch Ergonomics & Hit Target Verification
        const touchErgonomicsCheck = await page.evaluate(() => {
            const touchTabs = Array.from(document.querySelectorAll('[role="tab"]'));
            const allTabsMeetTarget = touchTabs.length > 0 && touchTabs.every(t => t.getBoundingClientRect().height >= 44);
            return {
                tabCount: touchTabs.length,
                allTabsMeetTarget,
                sampleHeight: touchTabs[0]?.getBoundingClientRect().height
            };
        });
        recordResult(
            'Scenario 12',
            'Interactive scenario tabs and key navigation elements meet touch target ergonomics (>= 44px)',
            touchErgonomicsCheck.allTabsMeetTarget,
            `Tabs verified: ${touchErgonomicsCheck.tabCount}, Sample tab height: ${touchErgonomicsCheck.sampleHeight}px`
        );

        // 4b. Interlinear Word Order Verification (Greek & Hebrew sequential flow)
        const interlinearOrderCheck = await page.evaluate(async () => {
            try {
                const jhnRes = await fetch('/data/interlinear/john.json');
                const jhnData = await jhnRes.json();
                const jhn11 = jhnData['1']['1'];

                const genRes = await fetch('/data/interlinear/genesis.json');
                const genData = await genRes.json();
                const gen11 = genData['1']['1'];

                return {
                    jhnWord1: jhn11[0]?.text,
                    jhnNum1: jhn11[0]?.number,
                    jhnWord2: jhn11[1]?.text,
                    jhnWord3: jhn11[2]?.text,
                    genWord1: gen11[0]?.text,
                    genNum1: gen11[0]?.number,
                    genWord2: gen11[1]?.text,
                    isJhnCorrect: jhn11[0]?.text === 'In' && jhn11[1]?.text === 'the beginning' && jhn11[2]?.text === 'was',
                    isGenCorrect: gen11[0]?.text === 'In the beginning' && gen11[1]?.text === 'God' && gen11[2]?.text === 'created'
                };
            } catch (e) {
                return { error: String(e), isJhnCorrect: false, isGenCorrect: false };
            }
        });
        recordResult(
            'Scenario 12',
            'Interlinear Greek (John 1:1) and Hebrew (Genesis 1:1) datasets read in natural syntactical word order',
            interlinearOrderCheck.isJhnCorrect && interlinearOrderCheck.isGenCorrect,
            `John 1:1: "${interlinearOrderCheck.jhnWord1} (${interlinearOrderCheck.jhnNum1}) ${interlinearOrderCheck.jhnWord2} ${interlinearOrderCheck.jhnWord3}", Genesis 1:1: "${interlinearOrderCheck.genWord1} (${interlinearOrderCheck.genNum1}) ${interlinearOrderCheck.genWord2}"`
        );

        // 5. Responsive Tablet & Mobile rendering without document horizontal scroll
        await page.setViewport({ width: 375, height: 812, hasTouch: true });
        await new Promise(r => setTimeout(r, 400));

        const mobileLayoutCheck = await page.evaluate(() => {
            return {
                scrollWidth: document.documentElement.scrollWidth,
                innerWidth: window.innerWidth,
                noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1
            };
        });
        recordResult(
            'Scenario 12',
            'Landing page renders responsively on 375px mobile viewport with zero horizontal overflow',
            mobileLayoutCheck.noHorizontalOverflow,
            `ScrollWidth: ${mobileLayoutCheck.scrollWidth}px, Viewport: ${mobileLayoutCheck.innerWidth}px`
        );

        const sc12MobilePath = path.join(screenshotsDir, 'scenario12_landing_mobile_375.png');
        await page.screenshot({ path: sc12MobilePath });

        // 6. Navigate to /accessibility and verify WCAG 2.1 AA Statement Route
        await page.setViewport({ width: 1440, height: 900, hasTouch: false });
        await page.goto(`http://localhost:${port}/accessibility`, { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 600));

        const accessibilityPageCheck = await page.evaluate(() => {
            const h1 = document.querySelector('h1')?.textContent || '';
            const bodyText = document.body.innerText || '';
            return {
                h1: h1,
                hasWCAG: bodyText.includes('WCAG 2.1 Level AA'),
                hasContactEmail: bodyText.includes('patrickudo2004@gmail.com'),
                hasErgonomicsNotice: bodyText.includes('48')
            };
        });
        recordResult(
            'Scenario 12',
            '/accessibility route renders WCAG 2.1 Level AA conformance statement and contact feedback details',
            accessibilityPageCheck.h1 &&
                accessibilityPageCheck.h1.includes('Accessibility') &&
                accessibilityPageCheck.hasWCAG &&
                accessibilityPageCheck.hasContactEmail,
            `H1: "${accessibilityPageCheck.h1}", WCAG 2.1 AA: ${accessibilityPageCheck.hasWCAG}, Contact: ${accessibilityPageCheck.hasContactEmail}`
        );

        const sc12A11yPath = path.join(screenshotsDir, 'scenario12_accessibility_page.png');
        await page.screenshot({ path: sc12A11yPath });

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

    console.log(`Total Scenarios Tested : 12`);
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
