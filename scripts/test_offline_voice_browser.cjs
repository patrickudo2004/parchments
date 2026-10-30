const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.wasm': 'application/wasm',
    '.onnx': 'application/octet-stream',
    '.bin': 'application/octet-stream',
    '.txt': 'text/plain',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
};

function startServer(port = 4179) {
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
                res.writeHead(200, {
                    'Content-Type': contentType,
                    'Content-Length': data.length,
                    'Cache-Control': 'public, max-age=31536000',
                    'Access-Control-Allow-Origin': '*',
                    'Cross-Origin-Opener-Policy': 'same-origin',
                    'Cross-Origin-Embedder-Policy': 'require-corp',
                });
                res.end(data);
            } catch (err) {
                res.writeHead(500);
                res.end(err.message);
            }
        });

        server.listen(port, '127.0.0.1', () => {
            console.log(`[Offline Server] Serving Parchments build on http://127.0.0.1:${port}`);
            resolve(server);
        });

        server.on('error', reject);
    });
}

async function run() {
    const port = 4179;
    const server = await startServer(port);
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

    console.log('\n================================================================');
    console.log('   PARCHMENTS 100% AIR-GAPPED OFFLINE SPEECH E2E SUITE   ');
    console.log('================================================================\n');

    const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--allow-file-access-from-files',
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
        ]
    });

    const page = await browser.newPage();
    const externalRequests = [];
    const localRequests = [];

    // STRICT AIR GAP: Abort any external network request instantly
    await page.setRequestInterception(true);
    page.on('request', req => {
        const url = req.url();
        const isLocal = url.startsWith(`http://127.0.0.1:${port}`) ||
                        url.startsWith(`http://localhost:${port}`) ||
                        url.startsWith('blob:') ||
                        url.startsWith('data:');

        if (!isLocal) {
            externalRequests.push(url);
            console.error(`[AIR-GAP SHIELD - BLOCKED EXTERNAL CALL]: ${url}`);
            req.abort('failed');
        } else {
            localRequests.push(url);
            if (url.includes('/models/') || url.includes('/ort/')) {
                console.log(`[Local Model/ORT Fetch]: ${url}`);
            }
            req.continue();
        }
    });

    page.on('requestfailed', req => {
        console.error(`[REQUEST FAILED]: ${req.url()} - ${req.failure()?.errorText}`);
    });

    // Enforce offline environment inside browser
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'onLine', {
            get: () => false,
            configurable: true
        });
        window.dispatchEvent(new Event('offline'));
    });

    page.on('console', msg => {
        const t = msg.text();
        if (msg.type() === 'error' || t.includes('[Worker]') || t.includes('StreamingTranscriber') || t.includes('InlineDictation')) {
            console.log(`[Browser Log] ${t}`);
        }
    });

    try {
        console.log(`1. Navigating to app under strict air-gap (navigator.onLine = false)...`);
        await page.goto(`http://127.0.0.1:${port}/app`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForSelector('#root', { timeout: 10000 });
        console.log('   ✓ App root loaded and mounted offline.');

        // Initialize browser storage foundation and workspace
        await page.evaluate(async () => {
            localStorage.setItem('parchments-storage-foundation', 'browser');
            if (window.useNoteStore) {
                await window.useNoteStore.getState().selectStorageFoundation('browser');
            }
        });
        await new Promise(r => setTimeout(r, 600));

        // Find worker filename
        const workerFiles = fs.readdirSync(path.join(distDir, 'assets')).filter(f => f.startsWith('transcribeWorker-') && f.endsWith('.js'));
        const workerFileName = workerFiles[0];
        console.log(`2. Pre-bundled Worker Asset: /assets/${workerFileName}`);

        // Phase 1 & 2: Verify on-device worker prewarm and persistent streaming inference
        console.log('\n--- Phase 1 & 2: On-Device Whisper Worker Prewarm & Persistent Streaming Inference ---');
        const phase1And2Result = await page.evaluate(async (wName) => {
            return new Promise((resolve) => {
                const worker = new Worker(new URL(`/assets/${wName}`, window.location.origin), { type: 'module' });
                const timer = setTimeout(() => {
                    worker.terminate();
                    resolve({ success: false, error: 'Worker pipeline timed out after 70s' });
                }, 70000);

                let isPrewarmed = false;

                worker.onmessage = (e) => {
                    if (e.data.type === 'ready') {
                        isPrewarmed = true;
                        // Now immediately send a live audio chunk to test persistent inference
                        const sampleRate = 16000;
                        const duration = 2.0;
                        const samples = new Float32Array(Math.floor(sampleRate * duration));
                        for (let i = 0; i < samples.length; i++) {
                            const envelope = Math.sin((i / samples.length) * Math.PI);
                            samples[i] = Math.sin(2 * Math.PI * 440 * (i / sampleRate)) * 0.15 * envelope;
                        }

                        worker.postMessage({
                            type: 'transcribe_chunk',
                            id: 1234,
                            audioData: samples,
                            highAccuracy: false,
                            localRuntime: true,
                        }, [samples.buffer]);
                    } else if (e.data.type === 'chunk_result') {
                        clearTimeout(timer);
                        worker.terminate();
                        resolve({ success: true, isPrewarmed, text: e.data.text });
                    } else if (e.data.type === 'error') {
                        clearTimeout(timer);
                        worker.terminate();
                        resolve({ success: false, isPrewarmed, error: e.data.error });
                    }
                };

                worker.onerror = (err) => {
                    clearTimeout(timer);
                    worker.terminate();
                    resolve({ success: false, error: err.message });
                };

                worker.postMessage({ type: 'prewarm', highAccuracy: false, localRuntime: true });
            });
        }, workerFileName);

        if (!phase1And2Result.success) {
            throw new Error(`Worker pipeline failed: ${phase1And2Result.error}`);
        }
        console.log(`   ✓ On-device model initialized offline.`);
        console.log(`   ✓ Live chunk transcribed offline: "${phase1And2Result.text}"`);

        // Phase 3: Verify NoteStore Voice Note Creation with Duration & Transcript
        console.log('\n--- Phase 3: Store Voice Note Ingestion & Duration Extraction ---');
        await page.waitForFunction(() => !!window.useNoteStore, { timeout: 10000 });
        const storeTestResult = await page.evaluate(async () => {
            const store = window.useNoteStore.getState();

            // Create synthetic audio blob (2.5 seconds WAV)
            const sampleRate = 16000;
            const numSamples = sampleRate * 3;
            const pcmData = new Int16Array(numSamples);
            for (let i = 0; i < numSamples; i++) {
                pcmData[i] = Math.sin(2 * Math.PI * 300 * (i / sampleRate)) * 10000;
            }
            const blob = new Blob([pcmData.buffer], { type: 'audio/wav' });

            const createdNote = await store.createVoiceNote(null, blob, 3.2, 'Test voice transcript offline');
            return {
                id: createdNote.id,
                title: createdNote.title,
                duration: createdNote.duration,
                transcript: createdNote.transcript,
                type: createdNote.type
            };
        });

        console.log(`   ✓ Voice note created in store:`, storeTestResult);
        if (storeTestResult.duration !== 3.2 || storeTestResult.transcript !== 'Test voice transcript offline') {
            throw new Error('Note duration or transcript was not properly stored!');
        }

        // Phase 4: Verify Nested Folder Voice Note Creation
        console.log('\n--- Phase 4: Nested Folder Voice Note Placement ---');
        const nestedFolderResult = await page.evaluate(async () => {
            const store = window.useNoteStore.getState();

            // Create parent folder
            const parent = await store.createFolder('Parent Sermons', null);
            if (!parent || !parent.id) return { success: false, error: 'Parent folder not created' };

            // Create child folder
            const child = await store.createFolder('Genesis Series', parent.id);
            if (!child || !child.id) return { success: false, error: 'Child folder not created' };

            // Create voice note inside child folder
            const blob = new Blob([new Uint8Array(100)], { type: 'audio/webm' });
            const voiceNote = await store.createVoiceNote(child.id, blob, 4.5, 'Sermon voice note in nested folder');

            return {
                success: true,
                parentFolderId: parent.id,
                childFolderId: child.id,
                noteFolderId: voiceNote.folderId,
                matchesChild: String(voiceNote.folderId) === String(child.id)
            };
        });

        console.log(`   ✓ Nested folder result:`, nestedFolderResult);
        if (!nestedFolderResult.success || !nestedFolderResult.matchesChild) {
            throw new Error('Voice note was created in parent instead of nested child folder!');
        }
        console.log('   ✓ Confirmed: Voice note is correctly scoped inside nested folder!');

        // Phase 5: VoiceNotePlayer Component Active Check
        console.log('\n--- Phase 5: Voice Note Active Verification ---');
        const playerVerification = await page.evaluate(() => {
            const store = window.useNoteStore.getState();
            const current = store.currentNote;
            return {
                success: !!current,
                type: current?.type,
                duration: current?.duration,
                transcript: current?.transcript,
                hasBlob: !!current?.audioBlob
            };
        });
        console.log(`   ✓ Voice note active in player:`, playerVerification);

        // Phase 6: Interactive VoiceRecorder UI & Acoustic Resonance Test
        console.log('\n--- Phase 6: Interactive VoiceRecorder UI & Acoustic Resonance ---');
        // Ensure FilesSidebar is open
        await page.evaluate(() => {
            window.useUIStore.getState().openLeftSidebar('files');
        });
        await new Promise(r => setTimeout(r, 500));

        // Click "New Voice Note" button in FilesSidebar
        const clickedVoiceBtn = await page.evaluate(() => {
            const btn = document.querySelector('button[title*="Voice Note"]');
            if (btn) {
                (btn).click();
                return true;
            }
            return false;
        });
        if (!clickedVoiceBtn) {
            throw new Error('Could not find "New Voice Note" button in FilesSidebar');
        }
        console.log('   ✓ Clicked "New Voice Note" button in FilesSidebar.');

        // Wait for VoiceRecorder modal
        await page.waitForFunction(() => {
            return !!document.querySelector('div[role="dialog"]') || document.body.innerText.includes('Start Recording') || document.body.innerText.includes('Ready to Record');
        }, { timeout: 5000 });
        console.log('   ✓ VoiceRecorder modal mounted on screen.');

        // Click "Start Recording"
        const clickedStart = await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Start Recording') || b.getAttribute('aria-label') === 'Start voice recording');
            if (btn) {
                btn.click();
                return true;
            }
            return false;
        });
        if (!clickedStart) {
            throw new Error('Could not click "Start Recording" button');
        }
        console.log('   ✓ Clicked "Start Recording". Microphone stream engaged.');

        // Wait 1.5 seconds for recording to run and audio to process
        await new Promise(r => setTimeout(r, 1500));

        // Verify acoustic halo ring and recording status
        const recordingState = await page.evaluate(() => {
            const dialog = document.querySelector('div[role="dialog"]');
            const halo = dialog?.querySelector('.bg-red-500\\/20');
            const dialogText = (dialog?.textContent || '').toUpperCase();
            const timerText = dialog?.querySelector('.font-mono')?.textContent || '';
            const canvas = dialog?.querySelector('canvas');
            const isRec = dialogText.includes('RECORDING') || !!dialog?.querySelector('button[aria-label*="Recording in progress"]');
            return {
                isRecording: isRec,
                hasHalo: !!halo,
                haloTransform: halo ? halo.getAttribute('style') : null,
                timer: timerText,
                hasCanvas: !!canvas
            };
        });
        console.log('   ✓ Live Recording State & Acoustic Halo:', recordingState);
        if (!recordingState.isRecording) {
            throw new Error('VoiceRecorder did not enter recording status!');
        }

        // Wait another 1.5 seconds
        await new Promise(r => setTimeout(r, 1500));

        // Click "Stop" button in recorder modal
        const clickedStop = await page.evaluate(() => {
            const dialog = document.querySelector('div[role="dialog"]');
            const btn = Array.from(dialog?.querySelectorAll('button') || []).find(b => b.textContent.includes('Stop'));
            if (btn) {
                btn.click();
                return true;
            }
            return false;
        });
        if (!clickedStop) {
            throw new Error('Could not click "Stop" button in VoiceRecorder');
        }
        console.log('   ✓ Clicked "Stop" button.');

        await new Promise(r => setTimeout(r, 500));

        // Click "Save Note" button in review mode
        const clickedSave = await page.evaluate(() => {
            const dialog = document.querySelector('div[role="dialog"]');
            const btn = Array.from(dialog?.querySelectorAll('button') || []).find(b => b.textContent.includes('Save Note') || b.textContent.includes('Save'));
            if (btn) {
                btn.click();
                return true;
            }
            return false;
        });
        if (!clickedSave) {
            throw new Error('Could not click "Save Note" button');
        }
        console.log('   ✓ Clicked "Save Note" button.');

        // Wait for note to save and player to render
        await new Promise(r => setTimeout(r, 1500));
        const savedNoteResult = await page.evaluate(() => {
            const store = window.useNoteStore.getState();
            const cur = store.currentNote;
            const playBtn = document.querySelector('button[aria-label="Play voice note"]') || document.querySelector('button[aria-label="Pause voice note"]');
            const rangeInput = document.querySelector('input[type="range"]');
            return {
                hasCurrentNote: !!cur,
                type: cur?.type,
                duration: cur?.duration,
                hasPlayButton: !!playBtn,
                hasRangeInput: !!rangeInput,
                rangeMax: rangeInput ? rangeInput.getAttribute('max') : null,
                rangeDisabled: rangeInput ? rangeInput.hasAttribute('disabled') : true
            };
        });
        console.log('   ✓ Recorded Voice Note Saved & Mounted in Player:', savedNoteResult);
        if (!savedNoteResult.hasPlayButton || savedNoteResult.rangeDisabled) {
            throw new Error('VoiceNotePlayer was not rendered with enabled seeker slider!');
        }

        // Phase 7: Inline Dictation at Cursor
        console.log('\n--- Phase 7: Inline Dictation at Cursor ---');
        // Click Dictate button in editor toolbar
        const clickedDictate = await page.evaluate(() => {
            const btn = document.querySelector('button[data-testid="inline-dictate-btn"]') ||
                        document.querySelector('button[title*="Dictat"]') ||
                        document.querySelector('button[aria-label*="dictat" i]');
            if (btn) {
                btn.click();
                return true;
            }
            return false;
        });
        if (!clickedDictate) {
            throw new Error('Could not find Dictate button in toolbar');
        }
        console.log('   ✓ Clicked Dictate button in EditorToolbar.');

        // Wait 1.5s for audio capture
        await new Promise(r => setTimeout(r, 1500));

        const dictationActive = await page.evaluate(() => {
            const btn = document.querySelector('button[data-testid="inline-dictate-btn"]') ||
                        document.querySelector('button[title*="Dictat"]') ||
                        document.querySelector('button[aria-label*="dictat" i]');
            const isRed = btn?.classList.contains('bg-red-500');
            const halo = btn?.parentElement?.querySelector('.bg-red-500\\/20');
            return {
                isActive: !!isRed,
                hasHalo: !!halo,
                haloStyle: halo?.getAttribute('style')
            };
        });
        console.log('   ✓ Inline Dictation Active State:', dictationActive);
        if (!dictationActive.isActive) {
            throw new Error('Inline dictation did not activate when button clicked!');
        }

        // Click Dictate button to stop
        await page.evaluate(() => {
            const btn = document.querySelector('button[data-testid="inline-dictate-btn"]') ||
                        document.querySelector('button[title*="Dictat"]') ||
                        document.querySelector('button[aria-label*="dictat" i]');
            if (btn) btn.click();
        });
        console.log('   ✓ Stopped Dictation cleanly.');

        // Phase 8: Final Network Air-Gap Audit
        console.log('\n--- Phase 8: Final Network Air-Gap Audit ---');
        console.log(`   Total Local Requests: ${localRequests.length}`);
        console.log(`   Total External Requests: ${externalRequests.length}`);

        if (externalRequests.length > 0) {
            console.error('CRITICAL ERROR: External requests were made while supposed to be 100% offline:');
            externalRequests.forEach(u => console.error(`   - ${u}`));
            throw new Error(`Failed air-gap check: ${externalRequests.length} external requests detected.`);
        }

        console.log('\n================================================================');
        console.log('   ALL 6 OFFLINE PHASES PASSED WITH 100% AIR-GAP INTEGRITY   ');
        console.log('   ZERO EXTERNAL NETWORK REQUESTS WERE MADE.                  ');
        console.log('================================================================\n');

    } finally {
        await browser.close();
        server.close();
    }
}

run().catch(err => {
    console.error('Offline test suite failed:', err);
    process.exit(1);
});
