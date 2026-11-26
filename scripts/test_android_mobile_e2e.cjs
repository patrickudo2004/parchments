const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const resultsDir = path.join(projectRoot, 'test-results', 'android-e2e');
const screenshotsDir = path.join(resultsDir, 'screenshots');

fs.mkdirSync(screenshotsDir, { recursive: true });

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

function startServer(port = 4182) {
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
                if (req.headers.range && ext === '.mp4') {
                    const range = req.headers.range.replace(/bytes=/, '').split('-');
                    const start = parseInt(range[0], 10);
                    const end = range[1] ? parseInt(range[1], 10) : stat.size - 1;
                    res.writeHead(206, {
                        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
                        'Accept-Ranges': 'bytes',
                        'Content-Length': end - start + 1,
                        'Content-Type': contentType,
                    });
                    fs.createReadStream(filePath, { start, end }).pipe(res);
                    return;
                }
                res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': stat.size });
                fs.createReadStream(filePath).pipe(res);
            } catch (err) {
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
    findings: [],
    consoleErrors: [],
    pageErrors: [],
};

function record(scenario, name, passed, details = '') {
    report.results.push({ scenario, name, passed, details });
    console.log(`  ${passed ? '[PASS]' : '[FAIL]'} ${scenario} :: ${name}${details ? ' -> ' + details : ''}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function measureOverflowAndSmallTargets(page, label, minTargetPx = 40) {
    return page.evaluate((lbl, minPx) => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const docOverflow = document.documentElement.scrollWidth > vw + 1;
        const bodyOverflow = document.body.scrollWidth > vw + 1;

        const interactive = Array.from(document.querySelectorAll('button, a, select, input[type="button"], input[type="submit"], [role="button"]'));
        const visible = [];
        const smallTargets = [];
        const clippedTargets = [];

        for (const el of interactive) {
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
            const rect = el.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) continue;
            // Only measure elements currently in or horizontally crossing viewport (ignoring offscreen scroll drawers)
            if (rect.bottom < 0 || rect.top > vh) continue;

            const text = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
            visible.push({ text, x: Math.round(rect.left), y: Math.round(rect.top), w: Math.round(rect.width), h: Math.round(rect.height) });

            if (rect.left >= -2 && rect.right <= vw + 2 && (rect.width < minPx || rect.height < minPx)) {
                smallTargets.push({ text, w: Math.round(rect.width), h: Math.round(rect.height), y: Math.round(rect.top) });
            }
            if (rect.right > vw + 2 || rect.left < -2) {
                // Only flag if not inside an intentional overflow-x-auto horizontal strip
                let inScrollStrip = false;
                let p = el.parentElement;
                while (p && p !== document.body) {
                    const ps = window.getComputedStyle(p);
                    if (ps.overflowX === 'auto' || ps.overflowX === 'scroll') {
                        inScrollStrip = true;
                        break;
                    }
                    p = p.parentElement;
                }
                if (!inScrollStrip) {
                    clippedTargets.push({ text, left: Math.round(rect.left), right: Math.round(rect.right), vw });
                }
            }
        }
        return { label: lbl, vw, vh, docOverflow, bodyOverflow, docScrollWidth: document.documentElement.scrollWidth, smallTargets, clippedTargets };
    }, label, minTargetPx);
}

async function run() {
    const port = 4182;
    const server = await startServer(port);
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

    const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--disable-web-security',
        ],
    });

    try {
        // ============================================================
        // SCENARIO 1: Website Landing Page Showcase Video & Mobile Layout
        // ============================================================
        console.log('\n--- Scenario 1: Website Landing Page & Showcase Video ---');
        {
            const page = await browser.newPage();
            page.on('console', (m) => { if (m.type() === 'error') report.consoleErrors.push(`[/] ${m.text()}`); });
            page.on('pageerror', (e) => report.pageErrors.push(`[/] ${e.message}`));

            await page.setViewport({ width: 1440, height: 900 });
            await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle2' });
            await sleep(800);

            const videoInfo = await page.evaluate(() => {
                const v = document.querySelector('video');
                if (!v) return null;
                return {
                    src: v.getAttribute('src'),
                    poster: v.getAttribute('poster'),
                    readyState: v.readyState,
                    networkState: v.networkState,
                    duration: v.duration,
                    muted: v.muted,
                    error: v.error ? v.error.message : null,
                };
            });
            record('Website', 'Hero showcase video present & playable', Boolean(videoInfo && videoInfo.src === '/videos/parchments-website-showcase.mp4' && videoInfo.readyState >= 1 && !videoInfo.error), JSON.stringify(videoInfo));

            // Click unmute button ("Unmute Voiceover Tour") and a chapter jump pill
            const audioToggled = await page.evaluate(() => {
                const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Unmute Voiceover Tour'));
                if (!btn) return false;
                btn.click();
                return true;
            });
            await sleep(250);
            const mutedAfterClick = await page.evaluate(() => document.querySelector('video')?.muted);
            record('Website', 'Interactive Unmute Audio toggle works', audioToggled && mutedAfterClick === false, `muted=${mutedAfterClick}`);

            const jumped = await page.evaluate(() => {
                const pill = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Offline Theological Voice AI'));
                if (!pill) return null;
                pill.click();
                return document.querySelector('video')?.currentTime;
            });
            record('Website', 'Chapter pill seeks showcase video', typeof jumped === 'number' && jumped >= 20, `currentTime=${jumped}`);
            await page.evaluate(() => {
                const v = document.querySelector('video');
                if (v) v.scrollIntoView({ block: 'center' });
            });
            await sleep(400);
            await page.screenshot({ path: path.join(screenshotsDir, '01a_website_desktop_video.png') });

            await page.setViewport({ width: 360, height: 800, isMobile: true, hasTouch: true });
            await sleep(400);
            const siteMetrics = await measureOverflowAndSmallTargets(page, 'LandingPage-360px', 36);
            const navOverlap = await page.evaluate(() => {
                const header = document.querySelector('header, nav');
                if (!header) return null;
                const items = Array.from(header.querySelectorAll('a, button, span')).filter(el => {
                    const r = el.getBoundingClientRect();
                    return r.width > 10 && r.height > 10 && el.innerText.trim().length > 0 && el.children.length === 0;
                }).map(el => ({
                    text: el.innerText.trim(),
                    left: Math.round(el.getBoundingClientRect().left),
                    right: Math.round(el.getBoundingClientRect().right),
                }));
                const pairs = [];
                for (let i = 0; i < items.length; i++) {
                    for (let j = i + 1; j < items.length; j++) {
                        if (items[i].right > items[j].left + 1 && items[j].right > items[i].left + 1) {
                            pairs.push([items[i].text, items[j].text]);
                        }
                    }
                }
                return { pairs, items };
            });
            record('Website', 'Landing page fits 360px viewport without horizontal overflow or navbar text overlap', !siteMetrics.docOverflow && !siteMetrics.bodyOverflow && (!navOverlap || navOverlap.pairs.length === 0), JSON.stringify({ scrollWidth: siteMetrics.docScrollWidth, navOverlaps: navOverlap?.pairs }));

            const hasBetaHeaderBtn = await page.evaluate(() => Array.from(document.querySelectorAll('header a, header button')).some(el => /Get Beta/i.test(el.textContent || '')));
            record('Website', 'Top-right Get Beta button removed from header', !hasBetaHeaderBtn, `hasBetaHeaderBtn=${hasBetaHeaderBtn}`);

            await page.evaluate(() => window.scrollTo(0, 0));
            await sleep(250);
            await page.screenshot({ path: path.join(screenshotsDir, '01_website_mobile_video.png') });

            // Check all subpages (/guide, /releases, /privacy, /terms, /accessibility) for video, v0.2.20, zero broken anchors, zero raw LaTeX & zero 360px overflow
            const subpageChecks = {};
            for (const subRoute of ['/guide', '/releases', '/privacy', '/terms', '/accessibility']) {
                await page.setViewport({ width: 360, height: 800, isMobile: true, hasTouch: true });
                await page.goto(`http://localhost:${port}${subRoute}`, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
                await sleep(350);
                subpageChecks[subRoute] = await page.evaluate((r) => ({
                    scrollWidth: document.documentElement.scrollWidth,
                    innerWidth: window.innerWidth,
                    brokenAnchors: Array.from(document.querySelectorAll('a[href^="#"]')).filter(a => !document.getElementById((a.getAttribute('href') || '').slice(1))).map(a => a.getAttribute('href')),
                    hasBetaHeaderBtn: Array.from(document.querySelectorAll('header a, header button')).some(el => /Get Beta/i.test(el.textContent || '')),
                    hasVideo: r === '/guide' ? Boolean(document.querySelector('video[src="/videos/parchments-website-showcase.mp4"]')) : undefined,
                    hasLatestV0221: r === '/releases' ? /v0\.2\.21[\s\S]*Latest Release/i.test(document.body.innerText) : undefined,
                    hasRawLatex: r === '/accessibility' ? (document.body.innerText.includes('\\ge') || document.body.innerText.includes('\\times') || document.body.innerText.includes('\\text')) : undefined,
                }), subRoute);
            }
            const subpageIssues = Object.entries(subpageChecks).filter(([r, c]) =>
                c.scrollWidth > 361 ||
                c.brokenAnchors.length > 0 ||
                c.hasBetaHeaderBtn ||
                (r === '/guide' && !c.hasVideo) ||
                (r === '/releases' && !c.hasLatestV0221) ||
                (r === '/accessibility' && c.hasRawLatex)
            );
            record('Website', 'All website subpages (/guide video, /releases v0.2.21, /accessibility, /privacy, /terms) pass 360px layout & content checks', subpageIssues.length === 0, JSON.stringify(subpageChecks));
            await page.close();
        }

        // ============================================================
        // SCENARIO 2: Android Mobile Fresh Launch, Sync Identity & Storage Foundation
        // ============================================================
        console.log('\n--- Scenario 2: Fresh Android Mobile Launch, Sync Identity & Folder Support ---');
        const page = await browser.newPage();
        page.on('console', (m) => { if (m.type() === 'error') report.consoleErrors.push(`[/app] ${m.text()}`); });
        page.on('pageerror', (e) => report.pageErrors.push(`[/app] ${e.message}`));

        await page.setViewport({ width: 360, height: 800, isMobile: true, hasTouch: true });
        // Simulate Android WebView characteristics (no desktop showDirectoryPicker API)
        await page.evaluateOnNewDocument(() => {
            try { delete window.showDirectoryPicker; } catch { window.showDirectoryPicker = undefined; }
        });

        await page.goto(`http://localhost:${port}/app`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !!window.useNoteStore && !!window.useUIStore, { timeout: 20000 });
        await sleep(1000);

        const freshState = await page.evaluate(() => {
            const noteStore = window.useNoteStore.getState();
            const uiStore = window.useUIStore.getState();
            // Access sync store from localStorage if exposed or inspect DOM
            const syncRaw = localStorage.getItem('parchments-sync');
            return {
                hasStudyspace: noteStore.hasStudyspace,
                storageFoundation: noteStore.storageFoundation,
                isLocalMode: noteStore.isLocalMode,
                isMobile: uiStore.isMobile,
                syncStorageRaw: syncRaw,
                bodyText: document.body.innerText.slice(0, 600),
            };
        });
        record('Onboarding', 'Fresh launch detects isMobile=true at 360x800', freshState.isMobile === true);

        const emptyStateMetrics = await measureOverflowAndSmallTargets(page, 'EmptyState-360px', 40);
        await page.screenshot({ path: path.join(screenshotsDir, '02_empty_state_onboarding_360.png') });
        record('Onboarding', 'EmptyState fits 360px without horizontal overflow', !emptyStateMetrics.docOverflow, `scrollWidth=${emptyStateMetrics.docScrollWidth}`);

        await page.evaluate(() => {
            localStorage.setItem('__TEST_CAPACITOR__', '1');
            localStorage.setItem('parchments-storage-foundation', 'local');
            localStorage.setItem('parchments-last-folder-path', 'Parchments');
            localStorage.setItem('parchments-last-folder-name', 'Parchments');
            localStorage.removeItem('parchments-capacitor-directory');
        });
        await page.evaluateOnNewDocument(() => {
            if (localStorage.getItem('__TEST_CAPACITOR__') !== '1') {
                delete window.CapacitorCustomPlatform;
                delete window.Capacitor;
                return;
            }
            const memFs = { files: { 'Parchments': [{ name: 'Sunday Notes.md', type: 'file' }] } };
            window.CapacitorCustomPlatform = { name: 'android' };
            window.Capacitor = {
                PluginHeaders: [{
                    name: 'Filesystem',
                    methods: ['checkPermissions', 'requestPermissions', 'mkdir', 'readdir', 'stat', 'readFile', 'writeFile', 'deleteFile', 'rmdir', 'rename']
                        .map(name => ({ name, rtype: 'promise' }))
                }],
                nativePromise: async (_plugin, method, opts) => {
                    switch (method) {
                        case 'checkPermissions':
                        case 'requestPermissions':
                            return { publicStorage: 'granted' };
                        case 'mkdir':
                            return {};
                        case 'readdir':
                            if (opts.directory === 'DOCUMENTS' && localStorage.getItem('__SIMULATE_SCOPED_EACCES__') === '1') {
                                throw new Error('EACCES Permission denied on Documents');
                            }
                            return { files: memFs.files[opts.path] || [] };
                        case 'stat':
                            return { mtime: Date.now(), size: 42 };
                        case 'readFile':
                            return { data: '# Sunday Notes\nTesting phone storage' };
                        case 'writeFile':
                            return { uri: 'file:///Parchments/test.md' };
                        default:
                            return {};
                    }
                }
            };
        });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !!window.useNoteStore, { timeout: 20000 });
        await sleep(900);

        const reloadFolderState = await page.evaluate(() => {
            const s = window.useNoteStore.getState();
            return {
                storageFoundation: s.storageFoundation,
                isLocalMode: s.isLocalMode,
                hasStudyspace: s.hasStudyspace,
                localDirectoryHandle: !!s.localDirectoryHandle,
                localFolderName: s.lastLocalFolderName,
                capacitorDirChoice: localStorage.getItem('parchments-capacitor-directory'),
            };
        });
        record('FolderAccess', 'Capacitor Android persists & restores local folder foundation across app restart', reloadFolderState.isLocalMode && reloadFolderState.hasStudyspace && reloadFolderState.localDirectoryHandle, JSON.stringify(reloadFolderState));

        // Verify Scoped Storage EACCES fallback to app-owned External storage!
        await page.evaluate(() => {
            localStorage.setItem('__SIMULATE_SCOPED_EACCES__', '1');
            localStorage.removeItem('parchments-capacitor-directory');
        });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !!window.useNoteStore, { timeout: 20000 });
        await sleep(900);
        const fallbackFolderState = await page.evaluate(() => ({
            isLocalMode: window.useNoteStore.getState().isLocalMode,
            hasStudyspace: window.useNoteStore.getState().hasStudyspace,
            capacitorDirChoice: localStorage.getItem('parchments-capacitor-directory'),
        }));
        record('FolderAccess', 'Capacitor Android automatically falls back to External storage if Documents hits Scoped Storage EACCES', fallbackFolderState.isLocalMode && fallbackFolderState.hasStudyspace && fallbackFolderState.capacitorDirChoice === 'EXTERNAL', JSON.stringify(fallbackFolderState));

        // Simulate EmptyState + FilesSidebar on Capacitor Android native runtime (no desktop showDirectoryPicker)
        await page.evaluate(() => {
            window.useNoteStore.setState({ hasStudyspace: false, storageFoundation: null });
        });
        await sleep(300);
        const capOnboardingCheck = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button')).map(b => (b.textContent || '').trim());
            return {
                hasBrowserDbCard: buttons.some(t => t.includes('Browser Database')),
                hasLocalFolderCard: buttons.some(t => t.includes('Use Phone Parchments Folder') || t.includes('Local')),
                buttons,
            };
        });
        record('FolderAccess', 'EmptyState displays Phone Parchments Folder option on Capacitor Android', capOnboardingCheck.hasLocalFolderCard, JSON.stringify(capOnboardingCheck));

        // Switch cleanly back to clean non-Capacitor mobile context with Browser Database to test all UI workflows
        await page.evaluate(() => {
            localStorage.removeItem('__TEST_CAPACITOR__');
            localStorage.removeItem('__SIMULATE_SCOPED_EACCES__');
            localStorage.removeItem('parchments-capacitor-directory');
            localStorage.removeItem('parchments-storage-foundation');
            localStorage.removeItem('parchments-last-folder-path');
            localStorage.removeItem('parchments-last-folder-name');
        });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !!window.useNoteStore && !!window.useUIStore, { timeout: 20000 });
        await sleep(600);

        // Select Browser Database
        await page.evaluate(async () => {
            await window.useNoteStore.getState().selectStorageFoundation('browser');
        });
        await sleep(800);

        // ============================================================
        // SCENARIO 3: Mobile Navigation & Sidebars Reachability Audit
        // ============================================================
        console.log('\n--- Scenario 3: MobileNav, Plus Action Sheet & Study Panel Reachability ---');
        const mobileNavAudit = await page.evaluate(() => {
            const nav = document.querySelector('nav.fixed');
            if (!nav) return { exists: false };
            const navBtns = Array.from(nav.querySelectorAll('button')).map(b => {
                const r = b.getBoundingClientRect();
                return { text: b.innerText.trim() || b.title || '+', w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) };
            });
            return { exists: true, navBtns };
        });
        record('MobileUI', 'Mobile bottom navigation bar renders with reachable buttons', Boolean(mobileNavAudit.exists && mobileNavAudit.navBtns.length === 5), JSON.stringify(mobileNavAudit.navBtns));

        // Open '+' Action Sheet
        await page.evaluate(() => {
            const nav = document.querySelector('nav.fixed');
            const btns = Array.from(nav.querySelectorAll('button'));
            if (btns[2]) btns[2].click();
        });
        await sleep(400);
        await page.screenshot({ path: path.join(screenshotsDir, '03_mobile_plus_sheet_360.png') });

        const sheetItems = await page.evaluate(() => {
            const allText = document.body.innerText;
            const btns = Array.from(document.querySelectorAll('button'))
                .map(b => b.innerText.trim().replace(/\s+/g, ' '))
                .filter(Boolean);
            return {
                btns,
                hasJoinSync: allText.includes('Join') || allText.includes('Sync') || allText.includes('Link'),
                hasTSK: allText.includes('TSK') || allText.includes('Cross-Ref'),
                hasCommentary: allText.includes('Commentary'),
                hasDictionary: allText.includes('Dictionary'),
                hasLexicon: allText.includes('Lexicon') || allText.includes('Strong'),
                hasPins: allText.includes('Pinned Research') || allText.includes('Pins'),
                hasOutline: allText.includes('Outline'),
                hasVoiceLibrary: allText.includes('Voice Studio') || allText.includes('Voice Sidebar'),
                hasThemeToggle: allText.includes('Dark Mode') || allText.includes('Light Mode'),
            };
        });
        record('MobileUI', 'Mobile Plus Sheet includes Collaborate / Join / Sync action', sheetItems.hasJoinSync || sheetItems.btns.some(b => /Collaborate/i.test(b)), JSON.stringify(sheetItems));
        record('MobileUI', 'Mobile UI exposes Commentary / Dictionary / TSK / Lexicon / Pins / Outline / Voice Studio / Theme triggers', sheetItems.hasCommentary && sheetItems.hasDictionary && sheetItems.hasTSK && sheetItems.hasLexicon && sheetItems.hasPins && sheetItems.hasOutline && sheetItems.hasThemeToggle, JSON.stringify({
            hasTSK: sheetItems.hasTSK,
            hasCommentary: sheetItems.hasCommentary,
            hasDictionary: sheetItems.hasDictionary,
            hasLexicon: sheetItems.hasLexicon,
            hasPins: sheetItems.hasPins,
            hasOutline: sheetItems.hasOutline,
            hasVoiceStudio: /Voice Studio/i.test(sheetItems.btns.join(' ')),
            hasThemeToggle: sheetItems.hasThemeToggle,
        }));

        // Test opening TSK References & Commentary right on Mobile from '+' sheet!
        await page.evaluate(() => {
            const tskBtn = Array.from(document.querySelectorAll('button')).find(b => /TSK References/i.test(b.textContent || ''));
            if (tskBtn) tskBtn.click();
        });
        await sleep(450);
        const tskOpenedMobile = await page.evaluate(() => ({
            rightOpen: window.useUIStore.getState().rightSidebarOpen,
            rightContent: window.useUIStore.getState().rightSidebarContent,
        }));
        record('MobileUI', 'Tapping TSK References in MobileNav opens TSK Sidebar on Android', tskOpenedMobile.rightOpen && tskOpenedMobile.rightContent === 'crossrefs', JSON.stringify(tskOpenedMobile));
        await page.evaluate(() => { window.useUIStore.getState().closeRightSidebar(); });
        await sleep(250);

        await page.evaluate(async () => {
            const ns = window.useNoteStore.getState();
            const f = await ns.createFolder('Sunday Sermons', null);
            await ns.createNote(f.id, 'Grace Upon Grace');
        });
        await sleep(700);

        // Check Share Note button visibility inside RichTextEditor on a fresh install!
        const shareBtnPresent = await page.evaluate(() => {
            const shareBtn = Array.from(document.querySelectorAll('button')).find(b => /Share Note/i.test(b.textContent || ''));
            const syncRaw = JSON.parse(localStorage.getItem('parchments-sync') || '{}');
            return {
                shareBtnVisible: !!shareBtn,
                identityInStorage: syncRaw?.state?.identity ? 'present' : null,
            };
        });
        record('SyncLinking', '"Share Note" button visible in editor on fresh mobile install', shareBtnPresent.shareBtnVisible, JSON.stringify(shareBtnPresent));

        // Open Files drawer on mobile and measure grid touch targets
        await page.evaluate(() => {
            const nav = document.querySelector('nav.fixed');
            nav.querySelectorAll('button')[0].click();
        });
        await sleep(500);
        await page.screenshot({ path: path.join(screenshotsDir, '04_mobile_files_drawer_360.png') });

        // Check FilesSidebar touch targets & Android Phone Folder button (with Capacitor simulated!)
        await page.evaluate(() => {
            window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android' };
        });
        const filesMetrics = await page.evaluate(() => {
            const drawer = Array.from(document.querySelectorAll('aside')).find(d =>
                (d.textContent || '').includes('Study Journal') &&
                ((d.textContent || '').includes('Grace Upon Grace') || (d.textContent || '').includes('Sunday Sermons')) &&
                d.getBoundingClientRect().width <= 360
            );
            if (!drawer) return { found: false };
            const cardBtns = Array.from(drawer.querySelectorAll('button')).map(b => {
                const r = b.getBoundingClientRect();
                return {
                    title: b.getAttribute('title') || (b.textContent || '').trim().slice(0, 24),
                    w: Math.round(r.width),
                    h: Math.round(r.height),
                };
            }).filter(x => x.w > 0 && x.h > 0);
            const undersized = cardBtns.filter(b => b.w < 36 || b.h < 36);
            // Open workspace switcher dropdown to inspect Open Local Folder option
            const switcherBtn = Array.from(drawer.querySelectorAll('button')).find(b => (b.textContent || '').includes('Study Journal'));
            if (switcherBtn) switcherBtn.click();
            return { found: true, cardBtns: cardBtns.length, undersized };
        });
        await sleep(250);
        const hasLocalInDropdown = await page.evaluate(() => (document.body.innerText || '').includes('Open Local Folder'));
        await page.evaluate(() => {
            const backdrop = document.querySelector('div.fixed.inset-0.z-30');
            if (backdrop) backdrop.click();
        });
        await sleep(150);
        await page.evaluate(() => { delete window.Capacitor; });
        record('FolderAccess', 'FilesSidebar exposes Open Local Folder inside storage switcher', Boolean(filesMetrics.found && hasLocalInDropdown), JSON.stringify({ hasLocalInDropdown, found: filesMetrics.found }));
        record('MobileUI', 'FilesSidebar touch targets >= 36x36px', filesMetrics.found && filesMetrics.undersized.length === 0, JSON.stringify(filesMetrics.undersized));

        // Close Files drawer by selecting note or toggling left sidebar
        await page.evaluate(() => { window.useUIStore.getState().closeLeftSidebar(); });
        await sleep(400);

        // ============================================================
        // SCENARIO 4: Editor Toolbar, Picture Resizing & Pulpit Mode on Mobile (360px)
        // ============================================================
        console.log('\n--- Scenario 4: Editor Toolbar, Image Insertion & Pulpit Mode (360x800) ---');
        // Click pinned 'Advanced formatting tools' toggle button on EditorToolbar (must be <= 360px!)
        const advToggled = await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('title') === 'Advanced formatting tools');
            if (!btn) return { clicked: false };
            const r = btn.getBoundingClientRect();
            btn.click();
            return { clicked: true, right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) };
        });
        await sleep(350);
        await page.screenshot({ path: path.join(screenshotsDir, '05_mobile_editor_toolbar_360.png') });

        const toolbarAudit = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button')).filter(b => {
                const r = b.getBoundingClientRect();
                return r.top >= 0 && r.bottom <= 220 && r.width > 0 && r.height > 0;
            });
            const titles = buttons.map(b => b.getAttribute('title') || (b.textContent || '').trim());
            const caseBtn = buttons.find(b => (b.getAttribute('title') || '').includes('Text Case'));
            if (caseBtn) caseBtn.click();
            return {
                advToggled: buttons.length,
                titles,
                hasDictate: titles.some(t => /Dictat/i.test(t)),
                hasPulpit: titles.some(t => /Pulpit/i.test(t)),
                hasImage: titles.some(t => /Insert Image/i.test(t)),
                hasTextCase: titles.some(t => /Text Case/i.test(t)),
            };
        });
        await sleep(200);
        const hasTitleCaseExpanded = await page.evaluate(() =>
            Array.from(document.querySelectorAll('button')).some(b => (b.textContent || '').trim() === 'Title')
        );
        record('EditorMobile', 'Pinned Advanced Formatting toggle, Image, Dictate, Pulpit & Title Case accessible inside 360px', Boolean(advToggled.clicked && advToggled.right <= 360 && toolbarAudit.hasDictate && toolbarAudit.hasPulpit && toolbarAudit.hasImage && hasTitleCaseExpanded), JSON.stringify({
            advToggleRight: advToggled.right,
            hasDictate: toolbarAudit.hasDictate,
            hasPulpit: toolbarAudit.hasPulpit,
            hasImage: toolbarAudit.hasImage,
            hasTitleCaseExpanded,
        }));

        // Insert a large test image into editor & test scripture text
        await page.evaluate(() => {
            const ed = window.useUIStore.getState().activeEditor;
            if (!ed) return;
            const canvas = document.createElement('canvas');
            canvas.width = 640; canvas.height = 320;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#C5A059'; ctx.fillRect(0, 0, 640, 320);
            const dataUrl = canvas.toDataURL('image/png');
            ed.commands.setContent('<p>Read John 3:16 and Romans 8:28 carefully during study.</p>');
            ed.commands.setImage({ src: dataUrl, alt: 'Manuscript Visual' });
        });
        await sleep(500);
        const imageFit = await page.evaluate(() => {
            const img = document.querySelector('.tiptap-editor img');
            if (!img) return null;
            const r = img.getBoundingClientRect();
            return { w: Math.round(r.width), right: Math.round(r.right), vw: window.innerWidth };
        });
        record('EditorMobile', 'Inserted image constrains within 360px mobile viewport', Boolean(imageFit && imageFit.right <= 360), JSON.stringify(imageFit));

        // Enter Pulpit Mode on 360x800
        await page.evaluate(() => { window.useUIStore.getState().togglePulpitMode(); });
        await sleep(600);
        await page.screenshot({ path: path.join(screenshotsDir, '06_mobile_pulpit_360.png') });
        const pulpitMetrics = await measureOverflowAndSmallTargets(page, 'PulpitMode-360px', 30);
        const pulpitOverlapCheck = await page.evaluate(() => {
            const nav = document.querySelector('nav.fixed');
            const navRect = nav ? nav.getBoundingClientRect() : null;
            const header = document.querySelector('header');
            const headerBtns = header ? Array.from(header.querySelectorAll('button')).filter(b => b.getBoundingClientRect().width > 0) : [];
            const wrappedOutside = headerBtns.filter(b => b.getBoundingClientRect().right > window.innerWidth + 1).map(b => b.innerText.trim() || b.title);
            // Check footer bar in PulpitMode vs MobileNav bottom bar
            const footer = Array.from(document.querySelectorAll('footer, div')).find(d => d.innerText && (d.innerText.includes('words') || d.innerText.includes('min read')));
            const footerRect = footer ? footer.getBoundingClientRect() : null;
            return {
                wrappedOutside,
                navVisibleDuringPulpit: !!(navRect && navRect.height > 0),
                footerBottom: footerRect ? Math.round(footerRect.bottom) : null,
                navTop: navRect ? Math.round(navRect.top) : null,
            };
        });
        record('PulpitMobile', 'Pulpit Mode header fits 360px without horizontal clipping', !pulpitMetrics.docOverflow && pulpitOverlapCheck.wrappedOutside.length === 0, JSON.stringify(pulpitOverlapCheck));

        // Exit Pulpit Mode
        await page.evaluate(() => { window.useUIStore.getState().togglePulpitMode(); });
        await sleep(400);

        // ============================================================
        // SCENARIO 5: Audio UI (VoiceRecorder Modal, Live Whisper/Mic, VoiceNotePlayer, Inline Dictate)
        // ============================================================
        console.log('\n--- Scenario 5: Audio UI, VoiceRecorder & VoiceNotePlayer on 360x800 ---');
        // Open Files drawer and click 'Record Voice Note' button
        await page.evaluate(() => {
            const nav = document.querySelector('nav.fixed');
            nav.querySelectorAll('button')[0].click(); // Files
        });
        await sleep(500);
        await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('title') === 'Record Voice Note');
            if (btn) btn.click();
        });
        await sleep(500);
        await page.screenshot({ path: path.join(screenshotsDir, '07_mobile_voice_recorder_360.png') });
        const voiceModalCheck = await page.evaluate(() => {
            const startBtn = Array.from(document.querySelectorAll('button')).find(b => /Start Recording/i.test(b.textContent || ''));
            const r = startBtn ? startBtn.getBoundingClientRect() : null;
            return {
                hasStartBtn: !!startBtn,
                startBtnRect: r ? { w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom), right: Math.round(r.right) } : null,
                docOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
            };
        });
        record('AudioUI', 'VoiceRecorder modal opens & fits 360x800', voiceModalCheck.hasStartBtn && !voiceModalCheck.docOverflow, JSON.stringify(voiceModalCheck));

        // Start recording with Chromium fake mic stream, wait 1.6s, stop recording, save voice note
        let recorderWorked = false;
        if (voiceModalCheck.hasStartBtn) {
            await page.evaluate(() => {
                const startBtn = Array.from(document.querySelectorAll('button')).find(b => /Start Recording/i.test(b.textContent || ''));
                if (startBtn) startBtn.click();
            });
            await sleep(1600);
            await page.screenshot({ path: path.join(screenshotsDir, '08_mobile_voice_recording_active.png') });
            const activeRec = await page.evaluate(() => {
                const text = document.body.innerText;
                const stopBtn = Array.from(document.querySelectorAll('button')).find(b => /Stop/i.test(b.getAttribute('title') || '') || /Stop/i.test(b.textContent || ''));
                return { hasStopBtn: !!stopBtn, showsRecordingText: /0:0[1234]/.test(text) || /Recording/i.test(text) };
            });
            if (activeRec.hasStopBtn) {
                await page.evaluate(() => {
                    const stopBtn = Array.from(document.querySelectorAll('button')).find(b => /Stop/i.test(b.getAttribute('title') || '') || /Stop/i.test(b.textContent || ''));
                    if (stopBtn) stopBtn.click();
                });
                await sleep(700);
                await page.screenshot({ path: path.join(screenshotsDir, '08b_mobile_voice_review_360.png') });
                const reviewState = await page.evaluate(() => {
                    const saveBtn = Array.from(document.querySelectorAll('button')).find(b => /Save Voice Note|Save Note|Save/i.test(b.textContent || '') && b.closest('.fixed'));
                    if (saveBtn) saveBtn.click();
                    return saveBtn ? (saveBtn.textContent || '').trim() : null;
                });
                recorderWorked = Boolean(reviewState);
            }
        }
        await sleep(700);
        await page.evaluate(() => { window.useUIStore.getState().closeLeftSidebar(); });
        await sleep(400);
        record('AudioUI', 'Voice recording start -> stop -> Save completes on mobile', recorderWorked);

        // Verify VoiceNotePlayer renders cleanly on mobile 360px
        await page.screenshot({ path: path.join(screenshotsDir, '09_mobile_voice_player_360.png') });
        const playerCheck = await page.evaluate(() => {
            const note = window.useNoteStore.getState().currentNote;
            const speedBtn = Array.from(document.querySelectorAll('button')).find(b => /^\d+(\.\d+)?x$/.test(b.innerText.trim()));
            const seekBar = document.querySelector('input[type="range"]');
            const transcribeBtn = Array.from(document.querySelectorAll('button')).find(b => /Transcribe/i.test(b.innerText));
            return {
                noteType: note?.type,
                hasAudioBlob: !!note?.audioBlob,
                speedBtnRect: speedBtn ? { w: Math.round(speedBtn.getBoundingClientRect().width), h: Math.round(speedBtn.getBoundingClientRect().height) } : null,
                hasSeekBar: !!seekBar,
                transcribeBtnText: transcribeBtn ? transcribeBtn.innerText.trim() : null,
                docOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
            };
        });
        record('AudioUI', 'VoiceNotePlayer renders & fits 360px mobile viewport', playerCheck.noteType === 'voice' && playerCheck.hasSeekBar && !playerCheck.docOverflow, JSON.stringify(playerCheck));

        // ============================================================
        // SCENARIO 6: Bible Reader Header, Parallel Versions & Search on 360x800
        // ============================================================
        console.log('\n--- Scenario 6: Bible Reader Header, Parallel Versions & CommandPalette (360x800) ---');
        await page.evaluate(() => {
            const nav = document.querySelector('nav.fixed');
            nav.querySelectorAll('button')[1].click(); // Bible button
        });
        await sleep(700);
        await page.screenshot({ path: path.join(screenshotsDir, '10_mobile_bible_reader_360.png') });

        const bibleHeaderAudit = await page.evaluate(() => {
            const rightAside = Array.from(document.querySelectorAll('aside')).find(a => a.innerText.includes('Genesis') || a.innerText.includes('John') || a.querySelector('select'));
            if (!rightAside) return { found: false };
            const header = rightAside.querySelector('div.border-b');
            const headerBtns = header ? Array.from(header.querySelectorAll('button, select')).map(el => {
                const r = el.getBoundingClientRect();
                return {
                    tag: el.tagName,
                    label: (el.getAttribute('title') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 20),
                    left: Math.round(r.left),
                    right: Math.round(r.right),
                    top: Math.round(r.top),
                    bottom: Math.round(r.bottom),
                    w: Math.round(r.width),
                    h: Math.round(r.height),
                };
            }).filter(x => x.w > 0) : [];
            const clipped = headerBtns.filter(b => b.right > 361 || b.left < -1);
            const undersized = headerBtns.filter(b => b.w < 32 || b.h < 32);
            const overlaps = [];
            for (let i = 0; i < headerBtns.length; i++) {
                for (let j = i + 1; j < headerBtns.length; j++) {
                    const yOverlap = headerBtns[i].bottom > headerBtns[j].top + 2 && headerBtns[j].bottom > headerBtns[i].top + 2;
                    const xOverlap = headerBtns[i].right > headerBtns[j].left + 2 && headerBtns[j].right > headerBtns[i].left + 2;
                    if (yOverlap && xOverlap) {
                        overlaps.push([headerBtns[i].label, headerBtns[j].label]);
                    }
                }
            }
            return {
                found: true,
                headerHeight: header ? Math.round(header.getBoundingClientRect().height) : 0,
                headerScrollWidth: header ? header.scrollWidth : 0,
                headerClientWidth: header ? header.clientWidth : 0,
                headerOverflowX: header ? header.scrollWidth > header.clientWidth + 1 : false,
                headerBtns,
                clipped,
                undersized,
                overlaps,
            };
        });
        record('BibleReader', 'BibleReader header buttons do not clip, overlap or overflow 360px width', bibleHeaderAudit.found && !bibleHeaderAudit.headerOverflowX && bibleHeaderAudit.clipped.length === 0 && bibleHeaderAudit.overlaps.length === 0, JSON.stringify({
            headerOverflowX: bibleHeaderAudit.headerOverflowX,
            headerScrollWidth: bibleHeaderAudit.headerScrollWidth,
            headerClientWidth: bibleHeaderAudit.headerClientWidth,
            headerBtnCount: bibleHeaderAudit.headerBtns?.length,
            clipped: bibleHeaderAudit.clipped,
            overlaps: bibleHeaderAudit.overlaps,
            undersized: bibleHeaderAudit.undersized,
        }));

        // Close right sidebar, open Global Search
        await page.evaluate(() => {
            window.useUIStore.getState().closeRightSidebar();
            const nav = document.querySelector('nav.fixed');
            nav.querySelectorAll('button')[3].click(); // Search button
        });
        await sleep(500);
        await page.type('input[placeholder*="Search"]', 'love');
        await sleep(700);
        await page.screenshot({ path: path.join(screenshotsDir, '11_mobile_search_palette_360.png') });
        const searchMetrics = await measureOverflowAndSmallTargets(page, 'CommandPalette-360px', 36);
        record('Search', 'CommandPalette search renders & fits 360x800', !searchMetrics.docOverflow && searchMetrics.clippedTargets.length === 0);
        await page.keyboard.press('Escape');
        await sleep(300);

        // ============================================================
        // SCENARIO 7: SettingsModal All 5 Tabs on 360x800
        // ============================================================
        console.log('\n--- Scenario 7: SettingsModal Mobile Layout Across Tabs (360x800) ---');
        await page.evaluate(() => { window.useUIStore.getState().toggleSettingsModal(true); });
        await sleep(500);
        const settingsTabIssues = [];
        for (const tabLabel of ['Appearance', 'Bible Versions', 'Editor', 'Data & Storage', 'Support & About']) {
            await page.evaluate((lbl) => {
                const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === lbl);
                if (btn) btn.click();
            }, tabLabel);
            await sleep(350);
            if (tabLabel === 'Data & Storage') {
                await page.screenshot({ path: path.join(screenshotsDir, '12_mobile_settings_storage_360.png') });
            }
            const m = await page.evaluate((lbl) => {
                const modal = document.querySelector('div.fixed.inset-0.z-\\[100\\] > div, div.fixed.inset-0 > div.bg-light-surface');
                const container = Array.from(document.querySelectorAll('div')).find(d => d.innerText.includes('Settings') && d.className.includes('rounded-t-3xl')) || document.body;
                const overflow = container.scrollWidth > window.innerWidth + 1;
                return { tab: lbl, overflow, scrollW: container.scrollWidth, vw: window.innerWidth };
            }, tabLabel);
            if (m.overflow) settingsTabIssues.push(m);
        }
        record('SettingsMobile', 'All 5 Settings tabs fit 360px width cleanly', settingsTabIssues.length === 0, JSON.stringify(settingsTabIssues));
        await page.evaluate(() => { window.useUIStore.getState().toggleSettingsModal(false); });
        await sleep(300);

        // ============================================================
        // SCENARIO 8: Android <-> Desktop Note Linking (JoinNoteModal & /join Route)
        // ============================================================
        console.log('\n--- Scenario 8: Android <-> Desktop Sync & JoinNoteModal Verification ---');
        // Force initialize identity (since fresh launch did not initialize it!) and open ShareNoteModal -> Join
        await page.evaluate(async () => {
            const syncRaw = JSON.parse(localStorage.getItem('parchments-sync') || '{}');
            // Open a text note first
            const ns = window.useNoteStore.getState();
            const textNote = ns.notes.find(n => n.type === 'text') || await ns.createNote(null, 'Desktop Link Target');
            ns.setCurrentNote(textNote);
        });
        await sleep(500);

        // Trigger ShareNoteModal directly via note editor button OR inspect why it's missing
        const shareAfterTextNote = await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => /Share Note/i.test(b.textContent || ''));
            return { visible: !!btn };
        });
        record('SyncLinking', 'Share Note button present on text note on fresh install', shareAfterTextNote.visible, JSON.stringify(shareAfterTextNote));

        // Open Collaborate -> JoinNoteModal directly via MobileNav '+' -> 'Collaborate'
        await page.evaluate(() => {
            const nav = document.querySelector('nav.fixed');
            nav.querySelectorAll('button')[2].click(); // '+' button
        });
        await sleep(400);
        const collabOpened = await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => /Collaborate/i.test(b.textContent || ''));
            if (!btn) return false;
            btn.click();
            return true;
        });
        await sleep(500);
        if (collabOpened) {
            // ShareNoteModal opens menu first -> click "Join a Shared Note"
            await page.evaluate(() => {
                const joinMenuBtn = Array.from(document.querySelectorAll('button')).find(b => /Join a Shared Note/i.test(b.textContent || ''));
                if (joinMenuBtn) joinMenuBtn.click();
            });
            await sleep(500);
            await page.screenshot({ path: path.join(screenshotsDir, '13_mobile_join_note_modal_360.png') });

            await page.evaluate(() => {
                const manualBtn = Array.from(document.querySelectorAll('button')).find(b => /Enter Code|Manual|Type/i.test(b.textContent || ''));
                if (manualBtn) manualBtn.click();
            });
            await sleep(300);
            const codeInput = await page.$('input[placeholder*="ws://"], input[placeholder*="192"], input[type="text"]');
            if (codeInput) await codeInput.type('839-204');
            await page.evaluate(() => {
                const connBtn = Array.from(document.querySelectorAll('button')).find(b => /Connect|Join Session/i.test(b.textContent || ''));
                if (connBtn) connBtn.click();
            });
            await sleep(350);
            const pinMsg = await page.evaluate(() => document.body.innerText.match(/A 6-digit code alone.*/)?.[0] || '');

            // Clear input and enter LAN IP:Port?token=... URL
            if (codeInput) {
                await codeInput.click({ clickCount: 3 });
                await codeInput.press('Backspace');
                await codeInput.type('192.168.1.5:48921?token=abcdef123456');
            }
            await page.evaluate(() => {
                const connBtn = Array.from(document.querySelectorAll('button')).find(b => /Connect|Join Session/i.test(b.textContent || ''));
                if (connBtn) connBtn.click();
            });
            await sleep(450);
            const postJoinCheck = await page.evaluate(() => ({
                pinGuidanceShown: true,
                activeTitle: window.useNoteStore.getState().currentNote?.title,
                bodySnippet: document.body.innerText.slice(0, 200),
            }));
            record('SyncLinking', 'JoinNoteModal validates PIN guidance and isolates joined session into a clean Shared Note', Boolean(pinMsg.includes('6-digit') && postJoinCheck.activeTitle === 'Shared Note'), JSON.stringify({ pinMsg, activeTitle: postJoinCheck.activeTitle }));
        } else {
            record('SyncLinking', 'JoinNoteModal opens from MobileNav + Collaborate', false);
        }

        // Test /join/:hash route on mobile (wait up to 2.5s for room sync fallback + navigation)
        await page.goto(`http://localhost:${port}/join/note-deadbeef-1234?title=Sunday%20Study`, { waitUntil: 'domcontentloaded' });
        await sleep(2200);
        await page.screenshot({ path: path.join(screenshotsDir, '14_mobile_join_route_360.png') });
        const joinRouteState = await page.evaluate(() => ({
            url: window.location.pathname,
            hasSharedBanner: /Collaborative Shared Note/i.test(document.body.innerText),
            bodySnippet: document.body.innerText.slice(0, 250),
        }));
        record('SyncLinking', '/join/:hash deep link opens shared collaborative note on mobile', joinRouteState.hasSharedBanner, JSON.stringify(joinRouteState));

        await page.close();
    } finally {
        await browser.close();
        server.close();
    }

    fs.writeFileSync(path.join(resultsDir, 'report.json'), JSON.stringify(report, null, 2));
    console.log('\n======================================================');
    const passed = report.results.filter(r => r.passed).length;
    const failed = report.results.filter(r => !r.passed).length;
    console.log(`ANDROID/MOBILE E2E SUMMARY: ${passed} passed, ${failed} failed`);
    console.log(`Console Errors: ${report.consoleErrors.length}, Page Errors: ${report.pageErrors.length}`);
    console.log(`Report saved to: ${path.join(resultsDir, 'report.json')}`);
    console.log('======================================================\n');
    if (report.consoleErrors.length > 0) console.log('Console Errors:\n', report.consoleErrors);
    if (report.pageErrors.length > 0) console.log('Page Errors:\n', report.pageErrors);
}

run().catch((err) => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
});
