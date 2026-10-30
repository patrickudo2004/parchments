import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const MODELS_DIR = path.resolve(ROOT_DIR, 'public', 'models');

const MODELS = [
    {
        repo: 'onnx-community/whisper-tiny.en',
        targetDir: path.join(MODELS_DIR, 'onnx-community', 'whisper-tiny.en'),
        files: [
            'config.json',
            'generation_config.json',
            'preprocessor_config.json',
            'tokenizer.json',
            'tokenizer_config.json',
            'vocab.json',
            'merges.txt',
            'normalizer.json',
            'onnx/encoder_model_quantized.onnx',
            'onnx/decoder_model_merged_quantized.onnx'
        ]
    },
    {
        repo: 'Xenova/all-MiniLM-L6-v2',
        targetDir: path.join(MODELS_DIR, 'Xenova', 'all-MiniLM-L6-v2'),
        files: [
            'config.json',
            'tokenizer.json',
            'tokenizer_config.json',
            'special_tokens_map.json',
            'vocab.txt',
            'onnx/model_quantized.onnx'
        ]
    }
];

function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });

        // If file already exists and has size > 0, skip
        if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
            console.log(`[Cache Hit] Already present: ${path.basename(destPath)}`);
            return resolve();
        }

        const makeRequest = (targetUrl) => {
            https.get(targetUrl, { headers: { 'User-Agent': 'Parchments-Model-Downloader/1.0' } }, (res) => {
                // Follow redirects (Hugging Face CDN redirects resolve to cdn-lfs)
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    const nextUrl = new URL(res.headers.location, targetUrl).toString();
                    return makeRequest(nextUrl);
                }

                if (res.statusCode !== 200) {
                    return reject(new Error(`HTTP ${res.statusCode} for ${targetUrl}`));
                }

                const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
                let downloadedBytes = 0;
                let lastLog = Date.now();

                const fileStream = fs.createWriteStream(destPath);
                res.on('data', (chunk) => {
                    downloadedBytes += chunk.length;
                    const now = Date.now();
                    if (now - lastLog > 1000) {
                        lastLog = now;
                        const mb = (downloadedBytes / (1024 * 1024)).toFixed(1);
                        const totalMb = totalBytes ? (totalBytes / (1024 * 1024)).toFixed(1) : '?';
                        process.stdout.write(`  -> ${path.basename(destPath)}: ${mb}MB / ${totalMb}MB\r`);
                    }
                });

                res.pipe(fileStream);

                fileStream.on('finish', () => {
                    fileStream.close();
                    const mb = (downloadedBytes / (1024 * 1024)).toFixed(1);
                    console.log(`  -> ${path.basename(destPath)}: Completed (${mb} MB)`);
                    resolve();
                });
            }).on('error', (err) => {
                if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
                reject(err);
            });
        };

        makeRequest(url);
    });
}

async function run() {
    console.log('[Model Downloader] Pre-bundling AI models into public/models/...');
    fs.mkdirSync(MODELS_DIR, { recursive: true });

    for (const model of MODELS) {
        console.log(`\nFetching ${model.repo}...`);
        for (const file of model.files) {
            const url = `https://huggingface.co/${model.repo}/resolve/main/${file}`;
            const dest = path.join(model.targetDir, file);
            try {
                await downloadFile(url, dest);
            } catch (err) {
                console.error(`Failed to download ${file}:`, err.message);
                throw err;
            }
        }
    }

    console.log('\n[Model Downloader] All ONNX AI models successfully pre-bundled!');
}

run().catch((err) => {
    console.error('[Model Downloader] Fatal error:', err);
    process.exit(1);
});
