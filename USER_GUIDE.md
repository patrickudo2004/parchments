# Parchments: The Complete User & Architectural Guide (v0.2.20)

Welcome to **Parchments**, the offline-first Bible study, exegesis, and sermon composition workspace crafted for pastors, theologians, teachers, and serious students of Scripture across Desktop, Android, and Web.

---

## 🏛️ Foundational Architecture & Privacy Covenant

Parchments is engineered on three uncompromising principles:
1. **Total Data Sovereignty**: Your research, sermons, voice recordings, and private reflections stay on your physical hardware or encrypted local IndexedDB storage—never locked into corporate cloud silos.
2. **100% Offline-First Resilience**: Full exegetical study, Bible search, Strong's concordance lookup, TSK cross-references, and Whisper AI voice dictation run directly on your device without requiring an internet connection.
3. **Ergonomic Precision**: A calm, distraction-free writing surface paired with rapid-access study sidebars on desktop and ergonomic bottom navigation sheets on mobile.

---

## 🚀 Getting Started

### 1. Storage Foundations: Local Folder vs. Browser Database
Upon first launch, choose how Parchments stores your notes and media assets:

* **Local Computer Folder (Windows, macOS, Linux & Desktop Web)**:
  * Notes and sermon manuscripts are stored directly on your hard drive as portable, open-standard **`.md` (Markdown)** files with YAML frontmatter (Speaker, Series, Date, Scripture, Tags).
  * Embedded images and diagrams are saved cleanly beside your notes in `.assets/images/`, and audio recordings sit alongside your voice notes.
  * Fully interoperable with **Obsidian**, **VS Code**, **Git**, and standard Markdown editors.
  * **Reload Recovery**: Under web browser security rules, after refreshing a browser tab, use **"Reconnect Folder"** in the sidebar or empty canvas to resume direct filesystem read/write access in one click.

* **Phone Local Folder (Android APK — `Documents/Parchments`)**:
  * In the native Android app, choose **"Use Phone Parchments Folder"** to read and write real `.md` files and folders on your device storage (`Documents/Parchments`, with automatic fallback to app-scoped `External` storage if Android 11–16 Scoped Storage restricts shared Documents access).
  * Your phone folder selection persists cleanly across app restarts.

* **Browser Database (Instant PWA & iOS/Web Mobile)**:
  * Notes, folders, and binary images/audio are stored offline inside your browser's client database (**IndexedDB**) with AES-GCM encryption (`ENC::v1::`) for bundled scripture datasets.
  * Works out of the box with zero filesystem prompts on mobile browsers and quick web sessions.

#### 🔄 1-Click Non-Destructive Migration Assistant
Start in Browser Database mode anytime and move to a physical folder later:
1. Open the left sidebar workspace switcher (`Study Journal`) and choose **"Open Local Folder..."**.
2. Select a folder on your drive.
3. When prompted **"Copy Browser Notes to Local Folder?"**, choose **"Copy Notes"** to export all notes and folder trees into portable `.md` files while keeping your original IndexedDB backup intact.

### 2. Navigation Across Desktop & Mobile
* **Desktop Tri-Pane Workspace**: **Explorer & Outline** on the left, **Rich Text / Markdown Editor** in the center, and the **Bible Reader & Study Bench** (Strong's Lexicon, TSK Cross-References, Commentary, Easton's Dictionary, Pinned Verses) on the right.
* **Android & Mobile Bottom Bar**: Switch cleanly between **Files**, **Bible**, **`+` Actions Sheet**, **Search**, and **Settings**. Tap **`+`** to launch **Voice Studio**, **New Text Note**, **Lectio Mode**, **Collaborate / Sync**, **TSK References**, **Strong's Lexicon**, **Commentary**, **Dictionary**, **Pinned Research**, **Dark/Light Mode**, or **Export (MD/PDF/DOCX)** with one tap.

---

## ⚡ Scripture Intelligence, Citations & Visual Notes

### 1. Smart Citation Recognition, Hover Popovers & `[[Auto-Quote]]`
* Type any scripture reference (e.g., `John 3:16`, `Romans 8:28-30`, `1 Cor 14:4, 14-15`, `Gen 6:13; 7:4`, `Jude 4-8`) and Parchments converts it automatically into an interactive scripture link.
* **Hover / Tap Preview**: Hover on desktop or tap on touch devices to inspect the decrypted passage with its active translation badge.
* **Inline `[[Auto-Quote]]`**: Type **`[[John 3:16]]`** in your editor to expand and insert the full formatted verse blockquote automatically without switching windows.

### 2. Offline Bible Versions & Parallel Reader
* Built-in support for **12+ downloadable offline translations** (including KJV, BSB, ASV, WEB, YLT, Darby, Greek Textus Receptus, Septuagint LXX, and Westminster Leningrad Codex Hebrew) managed via **Settings > Bible Versions**.
* Compare up to **4 translations side-by-side** with synchronized verse scrolling and automatic KJV fallback when an original-language testament lacks a requested passage.
* Switch between **Verse Study Grid** and **Continuous Paragraph Flow** (with Masoretic versification markers such as `[MT v.2]`).

### 3. Greek & Hebrew Lexicon + 500k+ TSK Links
* Toggle **Strong's / Interlinear** view in the Bible Reader to inspect aligned Greek/Hebrew words, lemmas, transliterations, morphology, and exhaustive concordance occurrence counts.
* Open **TSK References** (31,102 verses / 500,000+ cross-reference links) to let Scripture interpret Scripture alongside Matthew Henry Commentary and Easton's Bible Dictionary.
* **Persistent Verse Pins (📌)**: Pin passages across books and testaments, then drag or insert formatted blockquotes (**Standard**, **SBL**, **Chicago**, or **Turabian** style) into your manuscript.

### 4. Study Diagrams & Image Persistence
* Paste screenshots (`Ctrl+V`), drag-and-drop image files, or click **Insert Image** in the formatting toolbar (and **`...`** expanded toolbar on mobile).
* In Local Folder mode, images save cleanly to `.assets/images/<uuid>.<ext>` and hydrate automatically when reopening notes; in Browser Database mode, images embed safely in IndexedDB.

### 5. Dark & Light Sanctuary Themes
* Switch seamlessly between **Warm Parchment Light** (paper daylight clarity) and **Deep Sanctuary Dark** (low-glare evening study) via **Appearance Settings** or the Mobile `+` Action Sheet.

---

## 🎙️ Offline Theological Voice AI & Voice Notes Studio

* **Voice Notes Studio (`+` Sheet or Explorer Microphone Button)**: Record full-length spoken sermon ideas, prayer reflections, or verbal outlines even offline. Review waveforms, scrub timelines, adjust playback speed, and run 1-click **On-Device Whisper Transcription** (`Tiny` or higher-accuracy `Base` models) directly inside the **VoiceNotePlayer**.
* **Live Inline Dictation (`Dictate` Toolbar Mic)**: Dictate hands-free at the cursor powered by local Whisper WebAssembly and the **Theological Speech Normalizer**, automatically resolving biblical terms (*Melchizedek*, *propitiation*, *Habakkuk*, *Thessalonians*, *sanctification*) and converting spoken scripture cues (`"John chapter 3 verse 16"`) into crisp interactive scripture links (`John 3:16`).
* **100% Private Audio**: Audio never leaves your device unless you choose optional cloud fallback while online.

---

## 🎤 Pulpit Mode & Stage Teleprompter

Transform your laptop, tablet, or Android phone into a calm stage teleprompter:
1. Click **Pulpit** in the editor toolbar (or open via **Command Palette** / **Mobile `+` Sheet**).
2. **Target Timer & Countdown Alerts**: Set your preaching duration; elapsed/remaining clock warns gently with **Amber (5 minutes left)** and **Pulsing Red (overtime)** cues.
3. **Sunday Pulpit Deck (`Alt+1` .. `Alt+4`)**: Switch rapidly between sermon outlines, scripture readings, announcements, and communion notes without exiting stage view.
4. **Stage Scripture Modal & Mini Bible (`Alt+B`)**: Tap any verse reference inside Pulpit Mode to open a high-contrast scripture sheet (with discontinuous omission dividers like `vv. 2–13 omitted`) without losing prompter scroll position. Presentation clicker `b` black-screen keys are safely ignored.
5. **Teleprompter Controls & Stage Lighting**: Smooth **Scroll** vs. **Paginate** modes, pace controls, `A- / A+` sizing, wireless pedal/remote support, and **Standard Dark**, **High-Contrast OLED Amber**, or **Clean Light** themes.

---

## 🤝 Desktop ↔ Android Wi-Fi & QR Collaboration

Collaborate across your own devices or with a teaching team on local Wi-Fi or mobile hotspots:
* **Zero Central Server Needed (LAN WebSocket + Yjs CRDTs)**: Click **Share Note** on Desktop to start a local sync host generating a **QR code**, copyable **`ws://` LAN URL**, and pairing code.
* **Scan or Paste to Join on Android**: Open **Collaborate / Sync → Join a Shared Note** on Android to scan the host QR code (or switch to **Enter Code** and paste the host **`ws://IP:PORT?token=...`** URL — a 6-digit PIN alone cannot locate a Wi-Fi host without its LAN IP).
* **Isolated Safe Joining**: Joined sessions open inside a clean **Shared Note** workspace with a persistent **Save to Folder** banner so incoming edits never overwrite your existing private notes.
* **Two Participant Roles**: **Co-Editor** (real-time CRDT co-authoring) or **Presentation Follower** (read-only stage/projector sync).

---

## 📖 Lectio Divina & Reading Plans

* **5-Stage Contemplative Flow**: `1. Lectio (Reading)` → `2. Meditatio (Meditation)` → `3. Oratio (Prayer)` → `4. Contemplatio (Contemplation)` → `5. Actio (Action)`.
* **6 Reading Plan Paradigms**: Canonical One-Year, 24-Chapter Devotional, Single-Book Immersion, Curated Topical Journeys, Theological Word Studies, and Chronological Sequence.
* **Grace Catch-Up & Calendar Export**: Redistribute missed readings evenly with **"Catch Up"** or export schedules to RFC 5545 `.ics` files for Google, Apple, or Outlook calendars.

---

## 📤 Multi-Format Exporting & Global Search

* **Command Palette (`Ctrl + K` / `Cmd + K` or Mobile Bottom Search)**: Search canonical Bible verses with **Group by Book** density bars, jump to Strong's codes (`strongs:G26`), search private notes semantically, and replay your recent 30-item search history.
* **Export Anywhere**: Generate crisp **Word (`.docx`)**, print-ready **PDF (`.pdf`)**, **Markdown (`.md`)**, **HTML**, and **Plain Text (`.txt`)** manuscripts.

---

## ⌨️ Global Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + K` / `Cmd + K` | Global Search & Command Palette |
| `F1` | Open In-App User Guide |
| `Ctrl + N` / `Cmd + N` | New Note |
| `Ctrl + S` / `Cmd + S` | Force Save Note |
| `Ctrl + B` / `Cmd + B` | Bold |
| `Ctrl + I` / `Cmd + I` | Italic |
| `Ctrl + ]` | Toggle Bible Study Panel |
| `Spacebar` (Pulpit Mode) | Pause / Resume Teleprompter Scroll |
| `Alt + B` (Desktop Pulpit) | Toggle Stage Mini Bible & Strong's Lookup |
| `Alt + 1` .. `Alt + 4` | Switch Sunday Pulpit Deck Notes |
| `Arrow Right / Left` | Next / Previous Page or Adjust Pacing |
| `Esc` | Close Modals / Exit Pulpit Mode |
| `Ctrl + +` / `Ctrl + -` | Zoom Editor Font In / Out |
