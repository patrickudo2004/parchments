const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const PORT = 4182;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

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

function startServer(port = PORT) {
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

const results = [];
function assertTest(name, condition, details = '') {
    results.push({ name, passed: Boolean(condition), details });
    const status = condition ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${name}${details ? ` -> ${details}` : ''}`);
}

async function run() {
    const server = await startServer(PORT);
    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
        ],
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 900 });

        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`[Browser Error] ${msg.text()}`);
            }
        });

        // Inject in-memory Web File System Access API mock before page scripts run
        await page.evaluateOnNewDocument(() => {
            class MockFileSystemFileHandle {
                constructor(name, parent = null, initialData = '') {
                    this.kind = 'file';
                    this.name = name;
                    this._parent = parent;
                    this._data = initialData;
                    this._lastModified = Date.now();
                }

                getMimeType() {
                    const ext = (this.name.split('.').pop() || '').toLowerCase();
                    if (ext === 'png') return 'image/png';
                    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
                    if (ext === 'md') return 'text/markdown';
                    if (ext === 'html') return 'text/html';
                    return 'application/octet-stream';
                }

                async getFile() {
                    const part = this._data instanceof Blob || this._data instanceof Uint8Array || typeof this._data === 'string'
                        ? [this._data]
                        : [String(this._data)];
                    return new File(part, this.name, {
                        type: this.getMimeType(),
                        lastModified: this._lastModified,
                    });
                }

                async createWritable() {
                    const self = this;
                    let buffer = this._data;
                    return {
                        async write(data) {
                            buffer = data;
                        },
                        async close() {
                            self._data = buffer;
                            self._lastModified = Date.now();
                        },
                    };
                }

                async move(newName) {
                    if (this._parent && newName !== this.name) {
                        this._parent._entries.delete(this.name);
                        this.name = newName;
                        this._parent._entries.set(newName, this);
                    } else {
                        this.name = newName;
                    }
                }

                async queryPermission() {
                    return 'granted';
                }

                async requestPermission() {
                    return 'granted';
                }
            }

            class MockFileSystemDirectoryHandle {
                constructor(name, parent = null) {
                    this.kind = 'directory';
                    this.name = name;
                    this._parent = parent;
                    this._entries = new Map();
                }

                async getFileHandle(name, options = {}) {
                    const existing = this._entries.get(name);
                    if (existing) {
                        if (existing.kind !== 'file') throw new Error('TypeMismatchError');
                        return existing;
                    }
                    if (options.create) {
                        const created = new MockFileSystemFileHandle(name, this, '');
                        this._entries.set(name, created);
                        return created;
                    }
                    const err = new Error(`File not found: ${name}`);
                    err.name = 'NotFoundError';
                    throw err;
                }

                async getDirectoryHandle(name, options = {}) {
                    const existing = this._entries.get(name);
                    if (existing) {
                        if (existing.kind !== 'directory') throw new Error('TypeMismatchError');
                        return existing;
                    }
                    if (options.create) {
                        const created = new MockFileSystemDirectoryHandle(name, this);
                        this._entries.set(name, created);
                        return created;
                    }
                    const err = new Error(`Directory not found: ${name}`);
                    err.name = 'NotFoundError';
                    throw err;
                }

                async removeEntry(name) {
                    if (!this._entries.has(name)) {
                        const err = new Error(`Entry not found: ${name}`);
                        err.name = 'NotFoundError';
                        throw err;
                    }
                    this._entries.delete(name);
                }

                async *values() {
                    for (const entry of this._entries.values()) {
                        yield entry;
                    }
                }

                async queryPermission() {
                    return 'granted';
                }

                async requestPermission() {
                    return 'granted';
                }
            }

            const rootVault = new MockFileSystemDirectoryHandle('TestStudyVault');
            window.__mockVaultRoot = rootVault;
            window.FileSystemDirectoryHandle = MockFileSystemDirectoryHandle;
            window.FileSystemFileHandle = MockFileSystemFileHandle;
            window.showDirectoryPicker = async () => rootVault;
        });

        console.log('\n==============================================================');
        console.log('   IMAGE & MARKDOWN PERSISTENCE E2E TEST SUITE (PORT 4182)   ');
        console.log('==============================================================\n');

        await page.goto(`http://localhost:${PORT}/app`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !!window.useNoteStore && !!window.useUIStore, { timeout: 15000 });
        await new Promise(r => setTimeout(r, 1000));

        // =========================================================================
        // PART 1: LOCAL FOLDER MODE (.md File System Persistence)
        // =========================================================================
        console.log('--- Part 1: Local Folder Mode (.md File System Persistence) ---');

        // 1. Connect local folder and create a .md note
        const setupLocalResult = await page.evaluate(async () => {
            const noteStore = window.useNoteStore.getState();
            await noteStore.openLocalFolder();
            await noteStore.createNote(null, 'Sermon Image Diagram');
            const state = window.useNoteStore.getState();
            return {
                isLocalMode: state.isLocalMode,
                noteId: state.currentNote?.id,
                noteTitle: state.currentNote?.title,
                fileName: state.currentFileHandle?.name,
            };
        });

        await page.waitForSelector('.ProseMirror', { timeout: 10000 });
        await new Promise(r => setTimeout(r, 500));

        assertTest(
            'Setup: Connected Local Folder & created .md note',
            setupLocalResult.isLocalMode && setupLocalResult.fileName === 'Sermon Image Diagram.md',
            `fileName="${setupLocalResult.fileName}", isLocalMode=${setupLocalResult.isLocalMode}`
        );

        // 2. Insert a test 1x1 PNG image via clipboard paste event on .ProseMirror
        const pasteResult = await page.evaluate(async () => {
            // 1x1 transparent PNG bytes
            const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
            const binStr = atob(pngBase64);
            const bytes = new Uint8Array(binStr.length);
            for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
            const pngFile = new File([bytes], 'diagram.png', { type: 'image/png' });

            const pm = document.querySelector('.ProseMirror');
            if (!pm) throw new Error('.ProseMirror not found');
            pm.focus();

            // Type initial paragraph text before pasting image
            const editor = window.useUIStore.getState().activeEditor;
            editor.commands.insertContent('<p>Sanctuary Blueprint Overview:</p>');

            const dt = new DataTransfer();
            dt.items.add(pngFile);
            const pasteEvent = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: dt,
            });
            pm.dispatchEvent(pasteEvent);

            // Wait for async saveLocalAsset + view.dispatch
            for (let i = 0; i < 30; i++) {
                await new Promise(r => setTimeout(r, 100));
                const img = pm.querySelector('img');
                if (img && img.getAttribute('src')) break;
            }

            const img = pm.querySelector('img');
            return {
                hasImg: !!img,
                src: img ? img.getAttribute('src') : null,
                assetName: img ? img.getAttribute('data-asset-name') : null,
                editorHtml: editor.getHTML(),
            };
        });

        const uuidPngRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/i;

        // Assertion 1: Verify <img> inside .ProseMirror renders with valid blob: src AND data-asset-name attribute in DOM
        assertTest(
            'Assertion 1: <img> in .ProseMirror has blob: src AND data-asset-name attribute in DOM',
            pasteResult.hasImg &&
                typeof pasteResult.src === 'string' &&
                pasteResult.src.startsWith('blob:') &&
                typeof pasteResult.assetName === 'string' &&
                uuidPngRegex.test(pasteResult.assetName),
            `src="${pasteResult.src}", data-asset-name="${pasteResult.assetName}"`
        );

        // Assertion 2: Trigger note save via Save Now button (and saveCurrentNote) and inspect raw .md file
        const save1Result = await page.evaluate(async () => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const saveNowBtn = buttons.find(b => b.textContent && b.textContent.includes('Save Now'));
            if (saveNowBtn) {
                saveNowBtn.click();
                await new Promise(r => setTimeout(r, 300));
            } else {
                const editor = window.useUIStore.getState().activeEditor;
                const noteStore = window.useNoteStore.getState();
                await noteStore.saveCurrentNote(noteStore.currentNote.title, editor.getHTML());
            }

            const rootVault = window.__mockVaultRoot;
            const mdFileHandle = await rootVault.getFileHandle('Sermon Image Diagram.md');
            const mdFile = await mdFileHandle.getFile();
            const rawMarkdown = await mdFile.text();

            // Check that the binary file also exists inside .assets/images/
            const assetsDir = await rootVault.getDirectoryHandle('.assets');
            const imagesDir = await assetsDir.getDirectoryHandle('images');
            const imageEntries = [];
            for await (const entry of imagesDir.values()) {
                const f = await entry.getFile();
                imageEntries.push({ name: entry.name, size: f.size });
            }

            return {
                rawMarkdown,
                imageEntries,
            };
        });

        const expectedMarkdownImagePath = `.assets/images/${pasteResult.assetName}`;
        const hasCleanMarkdownImage = save1Result.rawMarkdown.includes(`](${expectedMarkdownImagePath})`);
        const hasNoBlobUrlInMd = !save1Result.rawMarkdown.includes('blob:');
        const hasNoHtmlImgTagInMd = !save1Result.rawMarkdown.includes('<img');
        const assetSavedOnDisk = save1Result.imageEntries.some(e => e.name === pasteResult.assetName && e.size > 0);

        assertTest(
            'Assertion 2: Saved .md file contains ![...](.assets/images/<uuid>.png) and NO blob: or raw HTML <img>',
            hasCleanMarkdownImage && hasNoBlobUrlInMd && hasNoHtmlImgTagInMd && assetSavedOnDisk,
            `rawMarkdown=${JSON.stringify(save1Result.rawMarkdown)}, diskAssets=${JSON.stringify(save1Result.imageEntries)}`
        );

        // Assertion 3 (Hydration on Reopen): Reopen the .md note via openLocalFile
        const reopenResult = await page.evaluate(async (prevBlobUrl) => {
            const noteStore = window.useNoteStore.getState();
            // Switch to another note first to simulate closing/switching away and reopening
            await noteStore.createNote(null, 'Other Temporary Note');
            await new Promise(r => setTimeout(r, 300));

            const stateAfterSwitch = window.useNoteStore.getState();
            const targetItem = stateAfterSwitch.localFiles.find(f => f.name === 'Sermon Image Diagram.md');
            if (!targetItem) throw new Error('Sermon Image Diagram.md not found in localFiles');

            await stateAfterSwitch.openLocalFile(targetItem);

            // Wait for editor to render reopened note
            for (let i = 0; i < 30; i++) {
                await new Promise(r => setTimeout(r, 100));
                const pm = document.querySelector('.ProseMirror');
                const img = pm ? pm.querySelector('img') : null;
                if (img && img.getAttribute('src')) break;
            }

            const pm = document.querySelector('.ProseMirror');
            const img = pm ? pm.querySelector('img') : null;
            const currentNoteContent = window.useNoteStore.getState().currentNote?.content || '';
            const editorHtml = window.useUIStore.getState().activeEditor?.getHTML() || '';

            // Verify the hydrated blob URL can actually be fetched in browser memory
            let blobFetchOk = false;
            let blobSize = 0;
            if (img && img.src && img.src.startsWith('blob:')) {
                try {
                    const res = await fetch(img.src);
                    blobFetchOk = res.ok;
                    const b = await res.blob();
                    blobSize = b.size;
                } catch {}
            }

            return {
                hasImg: !!img,
                src: img ? img.getAttribute('src') : null,
                assetName: img ? img.getAttribute('data-asset-name') : null,
                blobFetchOk,
                blobSize,
                isNewHydratedBlob: img ? img.getAttribute('src') !== prevBlobUrl : false,
                currentNoteContent,
                editorHtml,
            };
        }, pasteResult.src);

        assertTest(
            'Assertion 3 (Hydration on Reopen): openLocalFile hydrates .assets/images/<uuid>.png to live blob: URL and restores data-asset-name on <img>',
            reopenResult.hasImg &&
                typeof reopenResult.src === 'string' &&
                reopenResult.src.startsWith('blob:') &&
                reopenResult.blobFetchOk &&
                reopenResult.blobSize > 0 &&
                reopenResult.assetName === pasteResult.assetName,
            `src="${reopenResult.src}", blobFetchOk=${reopenResult.blobFetchOk} (${reopenResult.blobSize}B), data-asset-name="${reopenResult.assetName}"`
        );

        // Assertion 4 (Re-Save After Reload): Type additional text in the editor after reopening and save again.
        await page.evaluate(() => {
            const editor = window.useUIStore.getState().activeEditor;
            editor.commands.focus('end');
        });
        await page.keyboard.press('Enter');
        await page.keyboard.type('Second paragraph typed after reopening note.');
        await new Promise(r => setTimeout(r, 200));

        const resaveResult = await page.evaluate(async () => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const saveNowBtn = buttons.find(b => b.textContent && b.textContent.includes('Save Now'));
            if (saveNowBtn) {
                saveNowBtn.click();
            } else {
                const editor = window.useUIStore.getState().activeEditor;
                const ns = window.useNoteStore.getState();
                await ns.saveCurrentNote(ns.currentNote.title, editor.getHTML());
            }

            await new Promise(r => setTimeout(r, 400));

            const rootVault = window.__mockVaultRoot;
            const mdFileHandle = await rootVault.getFileHandle('Sermon Image Diagram.md');
            const mdFile = await mdFileHandle.getFile();
            const rawMarkdownAfterResave = await mdFile.text();

            return {
                rawMarkdownAfterResave,
            };
        });

        const stillHasCleanAssetPath = resaveResult.rawMarkdownAfterResave.includes(`](${expectedMarkdownImagePath})`);
        const stillHasNoBlob = !resaveResult.rawMarkdownAfterResave.includes('blob:');
        const hasNewTypedText = resaveResult.rawMarkdownAfterResave.includes('Second paragraph typed after reopening note.');

        assertTest(
            'Assertion 4 (Re-Save After Reload): Re-saving after typing additional text preserves .assets/images/<uuid>.png and NEVER writes blob:',
            stillHasCleanAssetPath && stillHasNoBlob && hasNewTypedText,
            `rawMarkdownAfterResave=${JSON.stringify(resaveResult.rawMarkdownAfterResave)}`
        );

        // =========================================================================
        // PART 2: BROWSER DATABASE MODE (Base64 Fallback)
        // =========================================================================
        console.log('\n--- Part 2: Browser Database Mode (Base64 Fallback) ---');

        const browserDbResult = await page.evaluate(async () => {
            const noteStore = window.useNoteStore.getState();
            await noteStore.selectStorageFoundation('browser');
            await noteStore.createNote(null, 'Browser DB Image Note');

            await new Promise(r => setTimeout(r, 500));

            const pm = document.querySelector('.ProseMirror');
            if (!pm) throw new Error('.ProseMirror not found in Browser DB mode');
            pm.focus();

            // Confirm saveLocalAsset returns null in Browser DB mode
            const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
            const binStr = atob(pngBase64);
            const bytes = new Uint8Array(binStr.length);
            for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
            const pngFile = new File([bytes], 'fallback.png', { type: 'image/png' });

            const localAssetReturn = await window.useNoteStore.getState().saveLocalAsset(pngFile);

            // Paste PNG into .ProseMirror
            const dt = new DataTransfer();
            dt.items.add(pngFile);
            const pasteEvent = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: dt,
            });
            pm.dispatchEvent(pasteEvent);

            // Wait for FileReader onload + dispatch
            for (let i = 0; i < 30; i++) {
                await new Promise(r => setTimeout(r, 100));
                const img = pm.querySelector('img');
                if (img && img.getAttribute('src')) break;
            }

            const img = pm.querySelector('img');
            const imgSrc = img ? img.getAttribute('src') : null;

            // Save to IndexedDB and read back from db.notes
            const editor = window.useUIStore.getState().activeEditor;
            const currentNote = window.useNoteStore.getState().currentNote;
            await window.useNoteStore.getState().saveCurrentNote(currentNote.title, editor.getHTML());

            // Reload notes from IndexedDB to confirm persistence
            await window.useNoteStore.getState().loadNotes();
            const savedNote = window.useNoteStore.getState().notes.find(n => n.id === currentNote.id);

            return {
                isLocalMode: window.useNoteStore.getState().isLocalMode,
                localAssetReturn,
                hasImg: !!img,
                imgSrc,
                persistedInIndexedDB: savedNote ? savedNote.content.includes('data:image/png;base64,') : false,
                savedNoteContentSnippet: savedNote ? savedNote.content.slice(0, 120) : null,
            };
        });

        assertTest(
            'Assertion 5 (Browser DB Base64 Fallback): saveLocalAsset returns null, <img> renders with data:image/png;base64,... and persists in IndexedDB',
            !browserDbResult.isLocalMode &&
                browserDbResult.localAssetReturn === null &&
                browserDbResult.hasImg &&
                typeof browserDbResult.imgSrc === 'string' &&
                browserDbResult.imgSrc.startsWith('data:image/png;base64,') &&
                browserDbResult.persistedInIndexedDB,
            `isLocalMode=${browserDbResult.isLocalMode}, localAssetReturn=${browserDbResult.localAssetReturn}, imgSrc="${browserDbResult.imgSrc?.slice(0, 45)}...", persistedInIndexedDB=${browserDbResult.persistedInIndexedDB}`
        );

        console.log('\n==============================================================');
        const passedCount = results.filter(r => r.passed).length;
        console.log(`SUMMARY: ${passedCount}/${results.length} assertions passed.`);
        console.log('==============================================================\n');

        if (passedCount !== results.length) {
            process.exitCode = 1;
        }
    } finally {
        await browser.close();
        server.close();
    }
}

run().catch(err => {
    console.error('Fatal E2E test error:', err);
    process.exit(1);
});
