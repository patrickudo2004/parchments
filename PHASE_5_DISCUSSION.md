# Phase 5: Sync & Collaboration - Architectural Discussion

This document records the deep-dive discussion regarding the implementation of **Sync & Collaboration** for Parchments.

## 1. Core Purpose & User Experience
The goal of Phase 5 is to move Parchments from a single-device silo to a seamless study ecosystem without compromising the "Local-First" promise.

### User Scenario: "The Sunday Morning Miracle"
- **Pastor captured** a voice note on an iPhone.
- **Auto-transcription** beams to the Desktop Studyspace via the Relay.
- **Collaborator (Sarah)** adds theological cross-refs from her own laptop.
- **Real-time merge** ensures both see changes in <500ms using CRDTs.
- **Final Note** is ready on the pulpit iPad by the time the service starts.

## 2. Technical Architecture: The "Encrypted Post Office"
To connect devices across different networks (not on the same WiFi), we implement a **Secure Relay Model**.

- **The Relay**: A global network that acts as a secure "locker" system.
- **Zero-Knowledge**: Every byte of data is encrypted with a locally-derived **Vault Key** (AES-256-GCM) *before* leaving the device. The server sees only "gibberish."
- **CRDTs (Conflict-free Replicated Data Types)**: We will use `Yjs` to merge changes mathematically, ensuring no "conflict files" ever occur.
- **Deltas**: Only character-level changes are synced, minimizing data usage and maximizing speed.

## 3. Identity & Account Management
Parchments rejects the traditional "Big Tech" login model in favor of **Distributed Identity**.

- **No Google/Microsoft Login**: Users are not forced to link an email.
- **Cryptographic Identity**: The app generates a Public/Private Keypair on the user's device.
- **Device Pairing**: New devices are added via QR code or a one-time secret phrase, transferring the encryption keys securely.
- **Hybrid Discovery (Opt-in)**: Users can optionally create a "Handle" (e.g., `@mark_gracechurch`) linked to their Public Key for easier collaboration discovery.

## 4. Performance & Resource Impact
- **Speed**: Instantaneous feel due to delta-syncing.
- **Efficiency**: Syncing runs on a background Web Worker to keep the UI at 60fps.
- **Memory**: A small "Transaction Log" in IndexedDB tracks changes; pruned automatically once peers confirm receipt.
- **Storage**: Small overhead (~15%) for encryption metadata.

## 5. Local Folder (Studyspace) Logic
Parchments remains a champion of local files.
- **Metadata-Only Sync**: By default, only the "Intelligence Layer" (AI indexes, pins, cross-refs) is synced for local folders.
- **Virtual Drive (Optional)**: Users can opt-in to mirror specific folder contents to the cloud for full availability across devices.

## 6. Philosophical Guardrails
1. **The "Delete Key" is Sovereign**: If sync is disabled, the Relay is wiped instantly.
2. **Identity $\neq$ Email**: Your account is a mathematical key, not an entry in a marketing database.
3. **Mobile-First Optimization**: Sync must be battery-aware and use native push notifications to wake up the app only when necessary.
