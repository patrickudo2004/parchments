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
};

function startServer(port = 4178) {
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
            console.log(`[Server] Serving dist on http://127.0.0.1:${port}`);
            resolve(server);
        });

        server.on('error', reject);
    });
}

async function run() {
    const port = 4178;
    const server = await startServer(port);
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

    console.log('\n======================================================');
    console.log('   STRICT AIR-GAPPED OFFLINE SPEECH AI VERIFICATION   ');
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
            '--use-fake-device-for-media-stream',
        ]
    });

    const page = await browser.newPage();
    const externalRequests = [];
    const localRequests = [];

    await page.setRequestInterception(true);
    page.on('request', interceptedRequest => {
        const url = interceptedRequest.url();
        const isLocal = url.startsWith(`http://127.0.0.1:${port}`) ||
                        url.startsWith(`http://localhost:${port}`) ||
                        url.startsWith('blob:') ||
                        url.startsWith('data:');

        if (!isLocal) {
            externalRequests.push(url);
            console.error(`[ABORTED EXTERNAL CALL]: ${url}`);
            interceptedRequest.abort('failed'); // Hard block - 100% offline air-gap
        } else {
            localRequests.push(url);
            interceptedRequest.continue();
        }
    });

    page.on('console', msg => {
        const text = msg.text();
        const type = msg.type();
        if (type === 'error' || text.includes('[Worker]') || text.includes('onnx') || text.includes('transcri')) {
            console.log(`[Browser ${type}] ${text}`);
        }
    });

    // Enforce navigator.onLine = false in browser window
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'onLine', {
            get: () => false,
            configurable: true
        });
        window.dispatchEvent(new Event('offline'));
    });

    try {
        console.log(`Navigating to http://127.0.0.1:${port}/app while OFFLINE...`);
        await page.goto(`http://127.0.0.1:${port}/app`, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Verify navigator.onLine is false
        const isOnline = await page.evaluate(() => navigator.onLine);
        console.log(`Verified navigator.onLine === ${isOnline} (Expected: false)`);

        // Wait for app mount
        await page.waitForSelector('#root', { timeout: 10000 });
        console.log('App root mounted successfully offline.');

        // Find latest worker script dynamically
        const workerFiles = fs.readdirSync(path.join(distDir, 'assets')).filter(f => f.startsWith('transcribeWorker-') && f.endsWith('.js'));
        const workerFileName = workerFiles[0] || 'transcribeWorker.js';
        console.log(`Using worker script: /assets/${workerFileName}`);

        // Test worker directly via page evaluation
        console.log('\n--- Test 1: Testing On-Device Whisper Worker in 100% Offline Mode ---');
        const workerTestResult = await page.evaluate(async (wName) => {
            return new Promise((resolve) => {
                try {
                    const worker = new Worker(new URL(`/assets/${wName}`, window.location.origin), { type: 'module' });

                    const logs = [];
                    const timer = setTimeout(() => {
                        worker.terminate();
                        resolve({ success: false, error: 'Worker timed out after 45s', logs });
                    }, 45000);

                    worker.onmessage = (e) => {
                        logs.push(e.data);
                        if (e.data.type === 'ready') {
                            clearTimeout(timer);
                            resolve({ success: true, message: 'Worker prewarm ready', logs });
                        }
                    };

                    worker.onerror = (err) => {
                        clearTimeout(timer);
                        resolve({ success: false, error: err.message || 'Worker error event', logs });
                    };

                    worker.postMessage({ type: 'prewarm', highAccuracy: false, localRuntime: true });
                } catch (err) {
                    resolve({ success: false, error: err.message });
                }
            });
        }, workerFileName);

        console.log('Worker Prewarm Result:', JSON.stringify(workerTestResult, null, 2));

        // Test audio chunk transcription
        console.log('\n--- Test 2: Testing On-Device Speech Transcription with 16kHz audio ---');
        const chunkTestResult = await page.evaluate(async (wName) => {
            return new Promise((resolve) => {
                try {
                    const worker = new Worker(new URL(`/assets/${wName}`, window.location.origin), { type: 'module' });
                    const timer = setTimeout(() => {
                        worker.terminate();
                        resolve({ success: false, error: 'Chunk transcription timed out after 35s' });
                    }, 35000);

                    // Create 2.5 seconds of simulated 16kHz speech waveform (sine burst with envelope)
                    const sampleRate = 16000;
                    const duration = 2.5;
                    const samples = new Float32Array(Math.floor(sampleRate * duration));
                    for (let i = 0; i < samples.length; i++) {
                        // 220Hz speech fundamental modulated with envelope
                        const envelope = Math.sin((i / samples.length) * Math.PI);
                        samples[i] = Math.sin(2 * Math.PI * 220 * (i / sampleRate)) * 0.15 * envelope;
                    }

                    worker.onmessage = (e) => {
                        if (e.data.type === 'chunk_result') {
                            clearTimeout(timer);
                            worker.terminate();
                            resolve({ success: true, text: e.data.text });
                        } else if (e.data.type === 'error') {
                            clearTimeout(timer);
                            worker.terminate();
                            resolve({ success: false, error: e.data.error });
                        }
                    };

                    worker.onerror = (err) => {
                        clearTimeout(timer);
                        worker.terminate();
                        resolve({ success: false, error: err.message });
                    };

                    worker.postMessage({
                        type: 'transcribe_chunk',
                        id: 999,
                        audioData: samples,
                        highAccuracy: false,
                        localRuntime: true
                    }, [samples.buffer]);
                } catch (err) {
                    resolve({ success: false, error: err.message });
                }
            });
        }, workerFileName);

        console.log('Chunk Transcription Result:', JSON.stringify(chunkTestResult, null, 2));

        console.log('\n--- Network Audit Summary ---');
        console.log(`Total Local Requests: ${localRequests.length}`);
        console.log(`Total External Requests: ${externalRequests.length}`);
        if (externalRequests.length > 0) {
            console.error('EXTERNAL CALLS WERE ATTEMPTED:');
            externalRequests.forEach(url => console.error(`  - ${url}`));
        } else {
            console.log('SUCCESS: Zero external requests were made! 100% offline confirmed.');
        }

    } finally {
        await browser.close();
        server.close();
    }
}

run().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
