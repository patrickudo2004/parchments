# Parchments Privacy Policy

**Effective Date:** June 1, 2026  
**Status:** UK GDPR & PECR Compliant  

Welcome to **Parchments** ("we", "our", "us"). Parchments is a premium, offline-first study and sermon composition workspace. We are committed to protecting the privacy of our users ("you"). 

This Privacy Policy explains how we process information when you use the Parchments desktop application (built with Tauri), the mobile application (built with Capacitor), our web preview application, and when you visit our landing page.

---

## 1. Our Core Privacy Philosophy: Offline-First & Local-First
Parchments is designed from the ground up to respect your spiritual reflections and academic research. 
* **Zero Cloud Databases**: We do not host or operate a central cloud server to collect, index, or analyze your notes, folders, or audio recordings.
* **On-Device Storage**: Your study notes, sermon outlines, local folder structures, audio dictations, and translation databases reside exclusively in your own device's sandboxed browser storage (IndexedDB) or in physical folders on your local hard drive (e.g., your designated Studyspace or `Lectio Study Journals` directories).
* **You Own Your Data**: You have absolute sovereignty over your content. If your device is offline, Parchments is 100% functional because all computations occur locally on your machine.

---

## 2. What Information We Process & Why (UK Compliance Notice)
Under the **UK General Data Protection Regulation (UK GDPR)**, the **Data Protection Act 2018 (DPA 2018)**, and the **Privacy and Electronic Communications Regulations (PECR)**, we must disclose any processing of technical metrics, network protocols, or local storage.

### A. Terminal Local Storage (PECR Disclosure)
To deliver the core functionality of a research workspace, Parchments utilizes sandboxed terminal storage technologies (IndexedDB and browser `localStorage`):
* **IndexedDB**: Used to store your personal notes, folder layouts, custom daily study tracks, local Bible translation databases, and Strong's Concordance definitions.
* **LocalStorage**: Used to store minor UI preferences, such as your dark/light theme choice, active font size zoom levels, and layout styles (Zen Scroll vs. Page-by-Page).
* **Legal Basis**: The use of these local storage mechanisms is **strictly necessary** to provide the service explicitly requested by you (the offline-first study experience). No tracking cookies, advertising IDs, or behavioral profiling trackers are injected.

### B. Peer-to-Peer Collaborative Syncing (WebRTC)
When you choose to turn a folder into a collaborative "Study Space" or share a note across your devices, Parchments uses **WebRTC** (`y-webrtc`) to establish direct peer-to-peer real-time communication:
* **The Signaling Server Broker**: To connect your devices, Parchments utilizes a lightweight public signaling server (running at `wss://...` or equivalent). The signaling server is a broker; it processes your **IP address** solely to exchange connection handshakes (SDP and ICE candidates) so the two devices can find each other.
* **No Content Interception**: Once the direct connection is established, the signaling server drops out. All notes, edits, text changes, and collaborative cursors travel **directly between your devices** via secure peer-to-peer channels. No note content ever touches or is cached on the signaling server.
* **Data Retention**: Connection handshake logs are transitory and discarded instantly once the direct P2P socket connection is successfully negotiated.

### C. On-Device Voice Transcription & AI (Local AI Engine)
Parchments includes an advanced Voice-to-Text transcription tool for sermons and dictation, alongside an Exegesis Assistant:
* **100% Offline AI**: Audio recordings, transcribed text, and semantic connections are processed **entirely on your local CPU/GPU** using WebAssembly and local Web Workers (via Transformers.js/Whisper AI).
* **No Cloud AI APIs**: Unlike typical cloud tools, your voice reflections are **never** uploaded to OpenAI, Google, Microsoft, or any other third-party servers for analysis.

### D. Update Checks & External Downloads
* **Nag & Lock Version Check**: The application periodically makes a standard HTTP request to our GitHub releases endpoint to determine if an update is available.
* **Bible translation downloads**: When you explicitly choose to download a new Bible translation, a direct request is made to download the database package from our secure release channels.

---

## 3. Legal Basis for Processing
Our legal bases for processing technical network information under the UK GDPR are:
1. **Performance of a Contract**: To provide the direct peer-to-peer collaborative workspaces and translation downloads that you actively trigger.
2. **Legitimate Interests**: To ensure the security, integrity, and performance of our public WebRTC signaling infrastructure.

---

## 4. Where Your Technical Data Goes (International Transfers)
* The landing page and static web application are hosted on GitHub Pages or Vercel, which may process standard system connection logs (IP addresses) in accordance with their respective security policies.
* Any public signaling broker we host is located within the European Economic Area (EEA) or the United Kingdom.

---

## 5. Your Rights Under UK GDPR & DPA 2018
As a resident of the United Kingdom, you possess robust data protection rights:
* **Right of Access & Portability**: You have direct, immediate access to all your notes. You can export them at any time in multiple formats (PDF, Word, Markdown, HTML, Text) via the export button.
* **Right to Erasure ("Right to be Forgotten")**: Because all data is stored on your own device, you can exercise this right instantly and unilaterally. To delete all notes, simply clear your browser's site storage (IndexedDB) in your browser settings or delete the physical Markdown files from your hard drive.
* **Right to Restrict / Object**: You can object to signaling processing simply by leaving host collaborative sessions or disabling internet access.

---

## 6. Children's Privacy
Parchments is suitable for scriptural study by researchers of all ages. We do not knowingly collect, store, or solicit personal data from children under the age of 13.

---

## 7. Contact Information
If you have any questions about this Privacy Policy, your data sovereignty, or WebRTC signaling, please contact:

**Patrick Udoh**  
Developer & Data Controller  
United Kingdom  
Email: patrickudo2004@gmail.com  
GitHub: https://github.com/patrickudo2004/parchments
