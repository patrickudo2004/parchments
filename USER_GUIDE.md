# Parchments: The Complete User & Architectural Guide

Welcome to **Parchments**, the ultimate offline-first study and sermon preparation environment crafted for scholars, pastors, teachers, and serious students of Scripture.

---

## 🏛️ Foundational Architecture & Privacy Covenant

Parchments is engineered on three uncompromising principles:
1. **Total Data Sovereignty**: Your research, sermons, and private reflections stay on your physical hardware or secure local browser database—never locked into centralized corporate cloud silos.
2. **Offline-First Resilience**: Full exegetical study, text editing, Strong's concordance lookup, and cross-referencing function seamlessly without an internet connection.
3. **Ergonomic Simplicity**: A clean, distraction-free writing surface surrounded by rapid-access intelligence panels when you need them.

---

## 🚀 Getting Started

### 1. Storage Foundations: Local Computer Folder vs. Browser Database
Parchments is a **100% offline-first and private** application. Zero notes or scripture data are ever sent to remote cloud servers. Upon initial launch, Parchments offers two foundation options:

* **Local Computer Folder (Recommended for PC & Mac)**:
  * Notes and sermon manuscripts are saved directly as portable, open-standard **`.md` (Markdown)** files in an actual directory on your computer's hard drive (e.g. `Documents/Sermons`).
  * Files are immediately readable and editable in Obsidian, VS Code, or Word.
  * Completely protected from browser history, cache, or cookie clearing.
  * **Browser Security Invariant**: Web browsers run in an isolated sandbox and cannot silently read your computer's drive on launch. You must click **"Choose Folder on PC/Mac"** and grant browser permission to link your folder.

* **Browser Database (Instant & Mobile-Ready)**:
  * Notes are saved securely inside your browser's private client database (**IndexedDB**) using client-side encryption.
  * Requires zero filesystem permissions or folder selection.
  * Works out-of-the-box on mobile smartphones (iOS Safari, Android Chrome) and tablets.
  * Ideal for quick devotional reflections, testing, and touch devices.

#### 🔄 1-Click Non-Destructive Migration Assistant
If you start in Browser Database mode and later decide to link a local folder on your computer:
1. Open the left sidebar workspace dropdown and click **"Open Local Folder..."**.
2. Select your desired folder on your PC or Mac.
3. Parchments automatically detects your existing browser notes and prompts: **"Copy Browser Notes to Local Folder?"**.
4. Selecting **"Copy Notes"** converts all your notes and folder hierarchies into `.md` Markdown files with YAML frontmatter inside your chosen folder.
5. **Zero Data Loss Guarantee**: Your original notes remain safely preserved in the Browser Database as a fail-safe backup.

#### 🔄 Reconnection Guard on Browser Reload
Under W3C web security rules, when you refresh your browser tab, physical drive read/write access pauses until you interact with the page. Parchments remembers your previous folder name (e.g. `'Sermons'`) and surfaces an instant **"Reconnect Folder"** action in the sidebar and canvas, ensuring your library is restored with a single click.

### 2. The Tri-Pane Workspace
* **Left Sidebar (Explorer & Outline)**: Manage your library with hierarchical folders, reorder headings via drag-and-drop, and capture voice notes.
* **Center (Editor)**: A distraction-free, professional writing surface supporting rich text, markdown shorthand, and live citation auto-detection.
* **Right Sidebar (Study Bench)**: Your modular research panel housing the Bible Reader, Lexicons, Strong's Concordance, TSK Cross-References, Commentaries, Dictionaries, and Persistent Verse Pins.

> [!TIP]
> Both sidebars can be resized by dragging their borders. On mobile and tablet devices, sidebars slide in smoothly and auto-dismiss upon note selection to maximize writing space.

---

## ⚡ Scripture Intelligence & Exegetical Research

Parchments bridges the gap between devotional reflection and deep academic exegesis by turning every scripture reference into an interactive research portal.

### 1. Smart Citation Recognition & Live Tooltips
* Simply type any biblical reference (e.g. `John 3:16`, `Romans 8:28-30`, `Psalm 23:1-4`).
* Parchments detects the reference automatically and converts it into a **Smart Scripture Tag**.
* **Hover Preview (Desktop)**: Hover your cursor to preview the decrypted passage text instantly.
* **Click to Inspect**: Tap or click the tag to inspect the passage in the Bible Study Panel or in-context sheet without losing your writing position.

### 2. Original Language Lexicon & Strong's Concordance
* Enable Interlinear or Strong's view in the Bible Reader to display Strong's numbers (e.g. `H430` for *Elohim*, `G26` for *Agape*) aligned with each word.
* Click any Strong's number to view root lemmas, transliterations, pronunciations, etymological derivations, and exhaustive canonical usage counts.
* Direct lookup: Press `Ctrl + K` and type `strongs:G26` or open **Tools > Strong's Lookup**.

### 3. Treasury of Scripture Knowledge (TSK) Cross-References
* With over **31,102 verses indexed**, the built-in TSK cross-reference engine helps scripture interpret scripture.
* Open the **TSK References** sidebar tab (Cross icon ✝️) to view thematic parallel passages linked directly to your active reading or writing context.

### 4. Commentaries & Theological Dictionaries
* Synchronized chapter expositions from classic commentators (e.g. Matthew Henry).
* Instant doctrinal and historical lookups via Easton's Bible Dictionary.

### 5. Persistent Research Bench (Verse Pins)
* While studying, click the **Pin (📌)** icon on any verse to collect it to your Bench.
* Pins stay active as you navigate across different testaments and books.
* When writing, click **"Insert All"** or drag individual verses into your sermon notes as beautifully formatted blockquotes.

### 6. Academic Citation Engine & Scholarly Reading
* **Academic Citations**: Automatically formats quotes in **Standard**, **SBL Handbook of Style**, or **Chicago/Turabian Footnotes** with precise en-dash verse ranges (`vv. 1–11`).
* **Continuous Paragraph Flow Mode**: Toggle between traditional Verse Study Mode and Continuous Paragraph Flow to read narrative prose and Hebrew poetry naturally without artificial line breaks.
* **Masoretic Text Versification Divergence**: Displays traditional Hebrew markers (`[MT v.2]`) when Hebrew and English versification diverges (e.g. Malachi 3:19 / MT 4:1, Psalms 9–147).
* **Advanced Compound Scripture Parsing**: Seamlessly recognizes discontinuous verse groups (`1 Sam 17:1-11, 16`), single-chapter books without colons (`Jude 4-8`), and cross-chapter spans (`Gen 1:1-2:3`).

---

## 🎙️ Pulpit Mode & Stage Delivery

**Pulpit Mode** transforms Parchments into an advanced, distraction-free stage teleprompter and lectern presentation system designed for public delivery.

### 1. Launching & Exiting
* Click **Pulpit Mode** in the Top Bar, select **View > Pulpit Presentation Mode**, or tap the Pulpit icon in the mobile actions sheet.
* Exit anytime by clicking **Exit (X)** or pressing `Esc`.

### 2. Sunday "Pulpit Deck" & Note Switcher
Preaching a multi-part service (*Announcements*, *Main Homily*, *Scripture Reading*, *Communion*)?
* **Sunday Pulpit Deck**: The top bar displays direct quick-access tabs (`#1`, `#2`, `#3`, `#4`) for your active and recent notes. Switch between them instantly with a tap or press `Alt+1` through `Alt+4`.
* **Full Note Switcher**: Tap the `+ All Notes` button or sermon title pill to browse and switch to any note in your library without leaving presenter mode.

### 3. Stage Mini Bible & Strong's Concordance (`Alt+B`)
* Look up an inspired passage or cross-reference mid-sermon: Tap the **Bible** button or press `Alt+B` (or `Cmd+B` on macOS).
* A draggable, floating Mini Bible window appears directly over your notes without interrupting your preaching flow.
* Features keyword search, Strong's Concordance definitions (`G26`, `H7225`), and full interlinear support.
* **Presentation Remote Safety**: The single `b` key emitted by wireless presentation clickers for black-screen will never accidentally launch the Bible modal on stage.

### 4. In-Pulpit Scripture Quick-Sheet
* Tap or click any scripture reference in your sermon manuscript.
* A high-contrast, non-obtrusive **Scripture Modal / Bottom Sheet** slides up immediately with decrypted verse text and translation badges.
* Features a 1-tap **Copy** button and version switcher (with automatic fallback to KJV if unavailable in the selected version).
* Discontinuous passages (e.g. `1 Sam 17:1-11, 16`) display with clear omission dividers (`vv. 12–15 omitted`).
* Tap outside or press `Esc` to return immediately to your preaching notes with zero displacement.

### 5. Continuous Teleprompter vs. Paginated Cards
* **📜 Teleprompter (Scroll)**: Smooth, hands-free auto-scrolling with adjustable words/min pacing (`-` / `+`). Tap anywhere or press `Spacebar` to pause/resume.
* **📄 Paginated Cards (Paginate)**: Divides your sermon into clean section cards based on your headings. Advance with arrow keys or touch buttons.

### 6. Stage Lighting & Contrast Themes
* **Standard Dark**: Deep charcoal with crisp off-white text.
* **High-Contrast Amber**: Pure OLED pitch-black with radiant warm amber typography, eliminating pupil strain and stage backlight wash.
* **Clean Light**: High-contrast black on pure white paper texture for bright outdoor venues.

### 7. Preacher's Timer, Target Countdown & Overtime Traffic Light
* **Clock & Elapsed Time**: Displays current wall clock and elapsed preaching duration.
* **Target Countdown Modal**: Click the timer to set custom target minutes (e.g. `35m`).
* **Traffic Light Warnings**:
  - Green / Normal: Approaching sermon target.
  - Amber (5-Minute Warning): Subtle amber warning pulse when 5 minutes remain.
  - Pulsing Red (Overtime Warning): Clear, non-jarring flashing red alert when exceeding target duration.
* Compatible with standard wireless presenter remotes and Bluetooth foot pedals (Spacebar, Left/Right arrow keys, Page Up/Down).

---

## 📖 Lectio Divina & Guided Study Plans

**Lectio Mode** is a sacred, distraction-free reading and contemplative environment inside Parchments.

### 1. The 5-Stage Guided Spiritual Workflow
```
[1. Lectio] ──> [2. Meditatio] ──> [3. Oratio] ──> [4. Contemplatio] ──> [5. Actio]
  (Reading)       (Meditation)       (Prayer)       (Contemplation)      (Action)
```
1. **Lectio (Reading)**: Attentive, reverent listening to Scripture.
2. **Meditatio (Meditation)**: Ruminating on illuminating words and truths.
3. **Oratio (Prayer)**: Honest dialogue responding to God's revelation.
4. **Contemplatio (Contemplation)**: Resting peacefully in God's presence.
5. **Actio (Action & Incarnation)**: Concrete commitment and practical life obedience.

### 2. 6 Supported Study Plan Paradigms
1. **Classical Canonical (One Year)**: Genesis to Revelation in 365 days.
2. **Lectio 24-Chapter Devotional**: 10 OT, 10 NT, 2 Psalms, 2 Proverbs daily.
3. **Single-Book Immersion**: Customized schedules with exact endpoints (e.g. *Romans in 16 Days*, *Hebrews in 14 Days*).
4. **Curated Topical Journeys**: Multi-day themed sequences (e.g. *30 Days on Faith*, *Grief & Hope*).
5. **Word & Theological Studies**: Cross-testament word investigations (e.g. *Hesed*, *Covenant*, *Grace*).
6. **Chronological Historical Sequence**: Historical sequence of biblical events.

### 3. Reading Layouts & Split Workspace
* **Zen Scroll vs. Page-by-Page**: Infinite vertical scroll or isolated one-chapter-at-a-time pagination.
* **Desktop Split-Pane**: Scripture reading on the left, auto-templated study journal on the right.
* **Mobile Sliding Sheets**: Swipe horizontally or tap `[Read]` / `[Journal]` headers with rich-text touch protection.

### 4. The "Grace" Catch-Up Engine
* Fell behind? Tap **"Catch Up"** on your plan overview.
* Unread backlogs are redistributed evenly across remaining plan days, ensuring sustainable progress without guilt.

### 5. Universal Calendar Export (.ics)
* Export any study plan to an RFC 5545 standard `.ics` file.
* Works seamlessly with **Google Calendar**, **Apple Calendar**, **Microsoft Outlook**, and **Samsung Calendar**.

---

## 🔒 Zero-Server P2P Sync & Privacy

* **Direct Local Wi-Fi Mesh**: Peer-to-peer sync via WebRTC and local WebSocket signaling without central servers.
* **Yjs CRDTs**: Automatic, conflict-free document merging.
* **Instant QR Pairing**: Secure device discovery between Phone, Tablet, and Desktop in seconds.
* **AES-GCM Encryption**: Client-side encrypted database storage (`ENC::v1::`) for all scripture text and personal entries.

---

## 📤 Multi-Format Exporting & Collaboration

* **Word (.docx)**: Microsoft Word documents with headers, scripture blockquotes, and author metadata.
* **PDF (.pdf)**: Print-ready documents with professional margins and page numbers.
* **Markdown (.md)**: CommonMark files with preserved YAML frontmatter.
* **HTML & Plain Text**: Web-ready markup and raw text formats.
* **Collaborative Study Spaces**: Host real-time group editing sessions using ephemeral Space Hashes.
* **Synchronized Voice Transcripts**: Group audio transcription shared live with all team members.

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
| `Alt + B` / `Cmd + B` | Toggle Stage Mini Bible & Strong's Concordance |
| `Alt + 1` .. `Alt + 4` | Switch Sunday Pulpit Deck Notes |
| `Arrow Right / Left` | Next / Previous Page or Adjust Pacing |
| `Esc` | Close Modals / Exit Pulpit Mode |
| `Ctrl + +` / `Ctrl + -` | Zoom Editor Font In / Out |
