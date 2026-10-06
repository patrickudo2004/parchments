# Zero-Server P2P Sync & Cryptographic Privacy

Parchments was architected with a strict privacy covenant: **You are the sole custodian of your research, sermons, and spiritual notes.**

---

## 🔒 The Privacy Covenant

Most modern note-taking apps rely on centralized cloud databases where your unpublished sermons and private journals are stored unencrypted on remote corporate servers. 

Parchments rejects this model:
* **No Mandatory Account**: You do not need to register, provide an email, or sign in to write.
* **No Central Telemetry or Scraping**: Your notes are never ingested into external training corpora or scanned by remote models.
* **Zero Cloud Lock-In**: Everything is stored locally on your device in standard open formats.

---

## 🌐 Local Peer-to-Peer (P2P) Synchronization

Synchronize your notes between your Laptop, Tablet, and Smartphone seamlessly without transmitting your data across third-party cloud servers.

### How It Works:
1. **Direct Local Network Mesh**: Devices communicate over your local Wi-Fi or local area network (LAN) using WebRTC data channels and local WebSocket signaling.
2. **Conflict-Free Replicated Data Types (CRDTs)**:
   - Built on top of **Yjs**.
   - Concurrent edits merge mathematically without data loss or conflicting file overwrites.
   - If you edit a sermon outline on your laptop while adding a scripture reference on your phone, both updates merge cleanly.

---

## 📱 QR Code Device Pairing

Pairing new devices is fast and effortless:
1. On your primary device, open **Settings > Sync & Devices** or tap **"Pair Device"**.
2. A secure one-time QR code containing ephemeral cryptographic connection parameters is displayed on the screen.
3. On your secondary device (e.g. tablet or phone), tap **"Scan QR Code"** and point your camera at the screen.
4. The two devices establish an authenticated peer connection within seconds and initiate local synchronization.

---

## 🔐 AES-GCM 256-Bit Scripture & Data Encryption

To protect copyrighted scripture modules and sensitive user journals in browser storage:
* All verse text in local storage is protected using AES-GCM encryption with prefix `ENC::v1::`.
* Decryption keys are managed client-side in secure browser memory.
* When exporting or viewing notes, text is decrypted dynamically on-the-fly, preserving both performance and security invariants.

---

## 💾 Physical File System Independence

When operating in Local Folder Mode:
* Every note is a real `.md` Markdown file located in your chosen directory.
* If you decide to stop using Parchments at any time, 100% of your notes remain accessible as plain human-readable text on your computer.
