/**
 * Bible Database Content Protection Layer (DBS / Publisher Compliance)
 * Uses Web Crypto API (AES-GCM 256-bit) to encrypt Bible verse text stored locally in IndexedDB.
 * Verse text is encrypted prior to writing to IndexedDB and decrypted in-memory during reading.
 */

const APP_SECRET_SALT = new Uint8Array([80, 97, 114, 99, 104, 109, 101, 110, 116, 115, 66, 105, 98, 108, 101, 75]); // "ParchmentsBibleK"
const ENCRYPTION_PREFIX = 'ENC::v1::';

let cachedKey: CryptoKey | null = null;

async function getEncryptionKey(): Promise<CryptoKey> {
    if (cachedKey) return cachedKey;

    const encoder = new TextEncoder();
    const rawSecret = encoder.encode('Parchments-Internal-Protection-Key-2026');

    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        rawSecret,
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    cachedKey = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: APP_SECRET_SALT,
            iterations: 1000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );

    return cachedKey;
}

/**
 * Encrypts a string (verse text) into a base64 encoded payload with IV.
 */
export async function encryptVerseText(text: string): Promise<string> {
    if (!text) return text;
    if (text.startsWith(ENCRYPTION_PREFIX)) return text; // Already encrypted

    try {
        const key = await getEncryptionKey();
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const iv = crypto.getRandomValues(new Uint8Array(12));

        const encryptedBuffer = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            data
        );

        const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(encryptedBuffer), iv.length);

        // Convert to Base64 string
        let binary = '';
        for (let i = 0; i < combined.length; i++) {
            binary += String.fromCharCode(combined[i]);
        }
        return ENCRYPTION_PREFIX + btoa(binary);
    } catch (err) {
        console.error('[BibleCrypto] Encryption failed, storing fallback:', err);
        return text;
    }
}

/**
 * Decrypts an encrypted payload back into plaintext verse text.
 */
export async function decryptVerseText(ciphertext: string): Promise<string> {
    if (!ciphertext || !ciphertext.startsWith(ENCRYPTION_PREFIX)) {
        return ciphertext; // Plaintext or unencrypted fallback
    }

    try {
        const key = await getEncryptionKey();
        const base64Data = ciphertext.slice(ENCRYPTION_PREFIX.length);
        const binary = atob(base64Data);
        const combined = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            combined[i] = binary.charCodeAt(i);
        }

        const iv = combined.slice(0, 12);
        const data = combined.slice(12);

        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            data
        );

        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);
    } catch (err) {
        console.error('[BibleCrypto] Decryption failed:', err);
        return ciphertext;
    }
}

/**
 * Helper to sync-decrypt or bulk-decrypt an array of verses.
 */
export async function decryptVerses<T extends { text: string }>(verses: T[]): Promise<T[]> {
    return Promise.all(
        verses.map(async (v) => {
            if (!v.text) return v;
            const decryptedText = await decryptVerseText(v.text);
            return { ...v, text: decryptedText };
        })
    );
}
