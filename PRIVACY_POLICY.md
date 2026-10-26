# Parchments Privacy Policy

**Effective Date:** June 1, 2026  
**Status:** UK GDPR, EU GDPR & PECR Compliant  
**Application Scope:** Parchments Desktop (Tauri), Mobile (Capacitor/PWA), Web Workspace (`/app`), and Website (`/`)

Welcome to **Parchments** ("we", "our", "us"). Parchments is a premium, offline-first study, sermon composition, and exegesis workspace. We are wholeheartedly committed to protecting the privacy, sanctity, and security of our users ("you"). 

This Privacy Policy explains how technical information is handled when you use the Parchments software or visit our website.

---

## 1. Our Core Architectural Pledge: 100% Local-First
Parchments was created specifically as an antidote to intrusive, cloud-locked software:
* **Zero Central Cloud Databases**: We do not operate a centralized user database or cloud backend that collects, indexes, reads, or profiles your sermon notes, personal prayers, or exegesis research.
* **On-Device Storage & Encryption**: Your notes, folder hierarchies, and custom study spaces reside exclusively on your physical hardware—either inside your designated local file system folder (as physical `.md` Markdown files) or inside your browser's sandboxed IndexedDB database encrypted with AES-GCM (`ENC::v1::`).
* **Absolute Data Ownership**: You own your data in its entirety. When your device is disconnected from the internet, Parchments remains 100% functional because all text rendering, concordance searches, and note editing execute locally on your machine.

---

## 2. What Technical Information We Process & Why

### A. Terminal Local Storage (PECR & GDPR Disclosure)
To deliver a fully functional offline workspace without requiring a cloud user account, Parchments utilizes sandboxed browser storage technologies on your device:
* **IndexedDB (`db.notes`, `db.folders`, `db.bibleVerses`)**: Stores your study notes, folder tree, scripture search indices, and Bible translation texts locally. All Bible verse text is stored encrypted with AES-GCM.
* **`localStorage`**: Stores basic interface preferences (such as dark/light mode, typography sizing zoom, active reading pane layouts, and local storage consent confirmation).
* **Legal Basis under PECR**: The use of these local storage mechanisms is **strictly necessary** under Regulation 6 of the Privacy and Electronic Communications Regulations (PECR) to deliver the offline-first study service explicitly requested by you. No marketing or cross-site tracking cookies are stored.

### B. Cookieless, Privacy-Preserving Web Analytics (Vercel Analytics)
When you visit the public website or web application, we utilize **Vercel Web Analytics** to understand general site traffic and monitor release stability:
* **Zero Cookies**: Vercel Analytics does not store cookies or persistent identifiers on your computer.
* **Privacy by Design**: Visitors are identified solely by a daily rotating cryptographic hash of incoming network request headers. IP addresses are never recorded or stored in plain text.
* **Aggregate Metrics Only**: We receive only high-level aggregate data (e.g., total visitors per day, country of origin, operating system, and browser version).
* **Zero Content Telemetry**: Your sermon outlines, personal notes, biblical searches, voice transcripts, and study activities are **never** tracked, transmitted, or accessible to Vercel or any other third party.

### C. On-Device Voice Transcription & AI (Whisper WebAssembly)
Parchments includes an on-device Voice-to-Text dictation feature for rapid sermon composition:
* **100% Local Execution**: Audio capture and speech-to-text processing occur entirely on your local CPU/GPU using WebAssembly (Transformers.js and Whisper models) within an isolated browser Web Worker.
* **No Cloud AI APIs**: Unlike typical cloud transcription tools, your voice reflections are **never streamed, transmitted, or uploaded** to OpenAI, Google, Microsoft, or any cloud API.

### D. Peer-to-Peer Collaborative Syncing (WebRTC)
If you actively choose to enable a collaborative Study Space to share notes between your own devices or with study partners:
* **The Signaling Broker**: Parchments utilizes a lightweight public WebRTC signaling broker solely to negotiate initial network handshakes (SDP and ICE candidates) so your devices can establish a direct connection.
* **End-to-End Direct Routing**: Once the handshake is complete, the broker disconnects. All note edits and collaborative cursors travel **directly between your devices** via encrypted peer-to-peer WebRTC channels. No note content ever touches or is retained on the signaling server.
* **Ephemerality**: Connection handshake logs are transitory and discarded immediately upon session establishment.

### E. Version Checks & Translation Downloads
* **Release Check**: The application periodically checks the public GitHub Releases API to notify you when a new software version is available.
* **Translation Downloads**: When you explicitly choose to download an offline Bible translation, your device initiates a direct HTTPS download from our verified release repositories.

---

## 3. Legal Bases for Processing under UK / EU GDPR
Where applicable under the UK General Data Protection Regulation and EU GDPR, our legal bases are:
1. **Contractual Necessity (Article 6(1)(b))**: To deliver the offline study workspace, local storage persistence, and collaborative peer-to-peer synchronization features you actively request.
2. **Legitimate Interests (Article 6(1)(f))**: To maintain the security, uptime, and technical performance of our public download distribution and WebRTC signaling infrastructure.

---

## 4. Your Rights Under Data Protection Law (UK / EU / CCPA)
Because Parchments is engineered around local data sovereignty, exercising your privacy rights is instantaneous:
* **Right of Access & Portability**: You have direct access to your notes at all times. You can export your entire library in standard formats (Markdown, PDF, HTML, Plain Text) with a single click.
* **Right to Erasure ("Right to be Forgotten")**: Because all data is stored on your own device, you have immediate and unilateral control. You can permanently erase all data at any time by clearing your browser's site data / IndexedDB or by deleting the physical Markdown files from your hard drive.
* **Right to Restrict Processing**: You can disable collaborative sync simply by closing the shared space or operating in offline mode.

---

## 5. Children's Privacy
Parchments is designed for biblical scholarship and devotional study for users of all ages. We do not knowingly solicit, collect, or retain personal data from children under the age of 13.

---

## 6. International Data Transfers
Our static web assets are hosted on globally distributed content delivery networks (GitHub Pages / Vercel), which process standard server connection logs in compliance with international data privacy frameworks. We do not operate external international databases for user content.

---

## 7. Contact Information
If you have questions regarding this Privacy Policy or your data sovereignty, please contact:

**Patrick Udoh**  
Developer & Data Controller  
United Kingdom  
Email: patrickudo2004@gmail.com  
GitHub: https://github.com/patrickudo2004/parchments
