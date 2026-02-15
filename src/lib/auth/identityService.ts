/**
 * IdentityService handles the generation and management of cryptographic keys
 * that represent a user's identity and their private "Vault".
 * 
 * Parchments uses a distributed identity model where your "account" is a set of
 * mathematically unique keys stored only on your device.
 */

export interface UserIdentity {
    publicKey: string; // Base64 public key for identification/sharing
    privateKey: string; // Base64 private key for signatures (never leaves device)
    vaultKey: string;   // Base64 symmetric key for E2EE content
    vaultHash: string;  // A non-reversible hash for discovery/room names
    mnemonic: string;  // Human-readable recovery phrase
}

export class IdentityService {
    /**
     * Generates a completely new identity for the user.
     * This includes a signing keypair and a symmetric vault key.
     */
    static async generateIdentity(): Promise<UserIdentity> {
        // 1. Generate a Signing Keypair (ED25519)
        const signKeyPair = await window.crypto.subtle.generateKey(
            {
                name: "ECDSA",
                namedCurve: "P-256", // Web Crypto standard asymmetric curve
            },
            true,
            ["sign", "verify"]
        );

        // 2. Generate a Symmetric Vault Key (AES-256)
        const vaultKey = await window.crypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: 256,
            },
            true,
            ["encrypt", "decrypt"]
        );

        // 3. Export keys to Base64 for storage/display
        const exportedPublic = await window.crypto.subtle.exportKey("spki", signKeyPair.publicKey);
        const exportedPrivate = await window.crypto.subtle.exportKey("pkcs8", signKeyPair.privateKey);
        const exportedVault = await window.crypto.subtle.exportKey("raw", vaultKey);

        // 4. Derive a Discovery Hash (SHA-256)
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", exportedVault);
        const vaultHash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));

        // 5. Generate a dummy mnemonic
        const mnemonic = this.generateRandomMnemonic();

        return {
            publicKey: btoa(String.fromCharCode(...new Uint8Array(exportedPublic))),
            privateKey: btoa(String.fromCharCode(...new Uint8Array(exportedPrivate))),
            vaultKey: btoa(String.fromCharCode(...new Uint8Array(exportedVault))),
            vaultHash: vaultHash,
            mnemonic: mnemonic
        };
    }

    private static generateRandomMnemonic(): string {
        const words = [
            "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "absurd", "abuse", "access", "accident", "account", "accuse", "achieve", "acid", "acoustic", "acquire", "across", "act", "action", "actor", "actress", "actual", "adapt", "add", "addict", "address", "adjust", "admit", "adult", "advance", "advice", "adviser", "affair", "afford", "afraid", "again", "age", "agent", "agree", "ahead", "aim", "air", "airport", "aisle", "alarm", "album", "alcohol", "alert", "alien", "all", "alley", "allow", "almost", "alone", "alpha", "already", "also", "alter", "always", "amateur", "amazing", "among", "amount", "amused", "analyst", "anchor", "ancient", "anger", "angle", "angry", "animal", "ankle", "announce", "annual", "another", "answer", "antenna", "antique", "anxiety", "any", "apart", "apology", "appear", "apple", "approve", "april", "arch", "arctic", "area", "arena", "argue", "arm", "armed", "armor", "army", "around", "arrange", "arrest", "arrive", "arrow", "art", "artefact", "artist", "artwork", "ask", "aspect", "assault", "asset", "assist", "assume", "asthma", "athlete", "atom", "attack", "attend", "attitude", "attract", "auction", "audit", "august", "aunt", "author", "auto", "autumn", "average", "avocado", "avoid", "awake", "aware", "away", "awesome", "awful", "awkward", "axis", "baby", "bachelor", "bacon", "badge", "bag", "balance", "balcony", "ball", "bamboo", "banana", "banner", "bar", "bare", "bargain", "barrel", "base", "basic", "basket", "battle", "beach", "beam", "bean", "beauty", "because", "become", "beef", "before", "begin", "behave", "behind", "believe", "below", "belt", "bench", "benefit", "best", "betray", "better", "between", "beyond", "bicycle", "bid", "bike", "bind", "biology", "bird", "birth", "bitter", "black", "blade", "blame", "blanket", "blast", "bleak", "bless", "blind", "blood", "blossom", "blouse", "blue", "blur", "blush", "board", "boat", "body", "boil", "bomb", "bone", "bonus", "book", "boost", "border", "boring", "borrow", "boss", "bottom", "bounce", "box", "boy", "bracket", "brain", "brand", "brass", "brave", "bread", "breeze", "brick", "bridge", "brief", "bright", "bring", "brisk", "broccoli", "broken", "bronze", "broom", "brother", "brown", "brush", "bubble", "buddy", "budget", "buffalo", "build", "bulb", "bulk", "bullet", "bundle", "burn", "burst", "bus", "business", "busy", "butter", "buyer", "buzz", "cabbage", "cabin", "cable", "cactus", "cage", "cake", "call", "calm", "camera", "camp"
        ];
        const indices = new Uint32Array(12);
        window.crypto.getRandomValues(indices);
        return Array.from(indices).map(i => words[i % words.length]).join(" ");
    }

    /**
     * Encrypts a string using the provided Vault Key.
     */
    static async encrypt(text: string, base64Key: string): Promise<{ ciphertext: string; iv: string }> {
        const keyData = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
        const key = await window.crypto.subtle.importKey(
            "raw",
            keyData,
            "AES-GCM",
            true,
            ["encrypt"]
        );

        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(text);

        const encrypted = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            encoded
        );

        return {
            ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
            iv: btoa(String.fromCharCode(...new Uint8Array(iv)))
        };
    }

    /**
     * Decrypts a ciphertext using the provided Vault Key.
     */
    static async decrypt(ciphertext: string, iv: string, base64Key: string): Promise<string> {
        const keyData = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
        const key = await window.crypto.subtle.importKey(
            "raw",
            keyData,
            "AES-GCM",
            true,
            ["decrypt"]
        );

        const cipherData = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
        const ivData = Uint8Array.from(atob(iv), c => c.charCodeAt(0));

        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: ivData },
            key,
            cipherData
        );

        return new TextDecoder().decode(decrypted);
    }
}
