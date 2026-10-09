import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const screenshotsDir = path.join(projectRoot, 'public', 'screenshots');
const featuresDir = path.join(screenshotsDir, 'features');

if (!fs.existsSync(featuresDir)) {
    fs.mkdirSync(featuresDir, { recursive: true });
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

function startServer(port = 4173) {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            let reqPath = decodeURI(req.url.split('?')[0]);
            if (reqPath === '/') reqPath = '/index.html';
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
            console.log(`[Server] Serving dist on http://localhost:${port}`);
            resolve(server);
        });
        server.on('error', reject);
    });
}

async function run() {
    const server = await startServer(4173);
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

    console.log('[Puppeteer] Launching Chrome...');
    const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--allow-file-access-from-files',
            '--force-device-scale-factor=2'
        ]
    });

    try {
        const page = await browser.newPage();

        // -------------------------------------------------------------
        // CAPTURE 1: Desktop - Storage Foundation Welcome Canvas
        // -------------------------------------------------------------
        console.log('[Capture 1] Desktop: Storage Foundation Welcome...');
        await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
        await page.goto('http://localhost:4173/app', { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => {
            localStorage.clear();
            localStorage.setItem('parchments-ui', JSON.stringify({
                state: { theme: 'dark', isLeftSidebarOpen: false, rightSidebarOpen: false }
            }));
        });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 1200));

        const welcomePath = path.join(screenshotsDir, 'storage_foundation_desktop.png');
        await page.screenshot({ path: welcomePath, fullPage: false });
        console.log(`Saved: ${welcomePath}`);

        // Crop: Storage Foundation Cards
        await sharp(welcomePath)
            .extract({ left: 360 * 2, top: 220 * 2, width: 720 * 2, height: 420 * 2 })
            .toFile(path.join(featuresDir, 'storage_foundation_cards.png'));
        console.log('Saved crop: features/storage_foundation_cards.png');

        // -------------------------------------------------------------
        // CAPTURE 2: Desktop - Zen Editor Workspace (Expository Note)
        // -------------------------------------------------------------
        console.log('[Capture 2] Desktop: Zen Workspace with Note...');
        await page.evaluate(() => {
            localStorage.setItem('parchments-storage-foundation', 'browser');
            localStorage.setItem('parchments-ui', JSON.stringify({
                state: {
                    theme: 'dark',
                    isLeftSidebarOpen: true,
                    leftSidebarContent: 'files',
                    rightSidebarOpen: false
                }
            }));
        });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 1500));

        // Create sample note if empty and populate with rich sermon content
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const btn = buttons.find(b => b.textContent && (b.textContent.includes('New Text Note') || b.textContent.includes('Note')));
            if (btn) btn.click();
        });
        await new Promise(r => setTimeout(r, 1200));

        // Inject sermon title and outline
        await page.evaluate(() => {
            const titleInput = document.querySelector('textarea[placeholder="Note Title"]');
            if (titleInput) {
                titleInput.value = "The Whole Armor of God (Ephesians 6:10-18)";
                titleInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            const editorEl = document.querySelector('.tiptap-editor .ProseMirror');
            if (editorEl) {
                editorEl.innerHTML = `
                    <h2>I. Strong in the Lord (v. 10-13)</h2>
                    <p>Our battle is not against flesh and blood, but spiritual forces of wickedness. We must stand firm with the full divine provision.</p>
                    <h2>II. The Defensive Pieces (v. 14-17)</h2>
                    <p><strong>Belt of Truth</strong>: Sincerity and doctrinal integrity.</p>
                    <p><strong>Breastplate of Righteousness</strong>: Christ's imputed righteousness guarding the heart.</p>
                    <p><strong>Shield of Faith</strong>: Extinguishing every fiery dart of temptation and doubt.</p>
                    <h2>III. The Sword and Supplication (v. 17-18)</h2>
                    <p>The Word of God spoken in prayer and perseverance for all saints.</p>
                `;
                editorEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        await new Promise(r => setTimeout(r, 1000));

        const workspacePath = path.join(screenshotsDir, 'workspace_editor_desktop.png');
        await page.screenshot({ path: workspacePath, fullPage: false });
        console.log(`Saved: ${workspacePath}`);

        // -------------------------------------------------------------
        // CAPTURE 3: Desktop - Sunday Pulpit Mode & Preaching Timer
        // -------------------------------------------------------------
        console.log('[Capture 3] Desktop: Sunday Pulpit Mode...');
        await page.evaluate(() => {
            const pulpitBtn = document.querySelector('button[title*="Pulpit Presentation Mode"]') ||
                Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Pulpit Mode'));
            if (pulpitBtn) {
                pulpitBtn.click();
            }
        });
        await new Promise(r => setTimeout(r, 1800));

        const pulpitPath = path.join(screenshotsDir, 'pulpit_mode_desktop.png');
        await page.screenshot({ path: pulpitPath, fullPage: false });
        console.log(`Saved: ${pulpitPath}`);

        // Crop: Pulpit Timer & Sunday Deck
        await sharp(pulpitPath)
            .extract({ left: 160 * 2, top: 0, width: 1120 * 2, height: 115 * 2 })
            .toFile(path.join(featuresDir, 'pulpit_timer_deck.png'));
        console.log('Saved crop: features/pulpit_timer_deck.png');

        // Exit Pulpit Mode
        await page.evaluate(() => {
            const exitBtn = document.querySelector('button[title*="Exit Pulpit Mode"]') ||
                document.querySelector('button[title*="Exit"]') ||
                Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Exit'));
            if (exitBtn) exitBtn.click();
        });
        await new Promise(r => setTimeout(r, 1000));

        // -------------------------------------------------------------
        // CAPTURE 4: Desktop - Parallel Bible Reader
        // -------------------------------------------------------------
        console.log('[Capture 4] Desktop: Parallel Bible Reader...');
        await page.evaluate(() => {
            localStorage.setItem('parchments-ui', JSON.stringify({
                state: {
                    theme: 'dark',
                    pulpitMode: false,
                    isLeftSidebarOpen: false,
                    rightSidebarOpen: true,
                    rightSidebarContent: 'bible'
                }
            }));
        });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 2000));

        const parallelPath = path.join(screenshotsDir, 'parallel_bible_desktop.png');
        await page.screenshot({ path: parallelPath, fullPage: false });
        console.log(`Saved: ${parallelPath}`);

        // Crop: Parallel Bible Header & Verse Column
        await sharp(parallelPath)
            .extract({ left: 600 * 2, top: 60 * 2, width: 840 * 2, height: 600 * 2 })
            .toFile(path.join(featuresDir, 'parallel_bible_comparison.png'));
        console.log('Saved crop: features/parallel_bible_comparison.png');

        // -------------------------------------------------------------
        // CAPTURE 5: Desktop - Lectio Divina Session
        // -------------------------------------------------------------
        console.log('[Capture 5] Desktop: Lectio Divina Session...');
        await page.evaluate(() => {
            // Click Lectio Mode button in TopBar
            const buttons = Array.from(document.querySelectorAll('button'));
            const lectioBtn = buttons.find(b => b.textContent && b.textContent.includes('Lectio Mode'));
            if (lectioBtn) lectioBtn.click();
        });
        await new Promise(r => setTimeout(r, 1500));

        const lectioPath = path.join(screenshotsDir, 'lectio_zen_desktop.png');
        await page.screenshot({ path: lectioPath, fullPage: false });
        console.log(`Saved: ${lectioPath}`);

        // -------------------------------------------------------------
        // CAPTURE 6: Tablet - Touch Optimized Workspace (1024x768)
        // -------------------------------------------------------------
        console.log('[Capture 6] Tablet: Touch Optimized View...');
        await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
        await page.goto('http://localhost:4173/app', { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => {
            localStorage.setItem('parchments-ui', JSON.stringify({
                state: {
                    theme: 'dark',
                    isLeftSidebarOpen: false,
                    rightSidebarOpen: false
                }
            }));
        });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 1500));

        const tabletPath = path.join(screenshotsDir, 'tablet_touch_workspace.png');
        await page.screenshot({ path: tabletPath, fullPage: false });
        console.log(`Saved: ${tabletPath}`);

        // -------------------------------------------------------------
        // CAPTURE 7: Mobile - Touch Navigation & Study Deck (412x915)
        // -------------------------------------------------------------
        console.log('[Capture 7] Mobile: Touch Navigation & Study Deck...');
        await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
        await page.goto('http://localhost:4173/app', { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 1500));

        const mobilePath = path.join(screenshotsDir, 'mobile_touch_study.png');
        await page.screenshot({ path: mobilePath, fullPage: false });
        console.log(`Saved: ${mobilePath}`);

        // Crop: Mobile Touch Navigation Sheet & Storage Card
        await sharp(mobilePath)
            .extract({ left: 20 * 2, top: 220 * 2, width: 372 * 2, height: 420 * 2 })
            .toFile(path.join(featuresDir, 'mobile_touch_cards.png'));
        console.log('Saved crop: features/mobile_touch_cards.png');

        console.log('\n[Done] All high-res screenshots and detail crops generated successfully!');
    } finally {
        await browser.close();
        server.close();
    }
}

run().catch(err => {
    console.error('[Error] Screenshot capture failed:', err);
    process.exit(1);
});
