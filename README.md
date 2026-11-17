# Parchments

[![Latest Release](https://img.shields.io/github/v/release/patrickudo2004/parchments?label=latest%20release&color=blue)](https://github.com/patrickudo2004/parchments/releases/latest)
[![Build Status](https://github.com/patrickudo2004/parchments/actions/workflows/release.yml/badge.svg)](https://github.com/patrickudo2004/parchments/actions/workflows/release.yml)
[![License](https://img.shields.io/github/license/patrickudo2004/parchments)](LICENSE)
[![Total Downloads](https://img.shields.io/github/downloads/patrickudo2004/parchments/total?style=for-the-badge&color=primary)](https://github.com/patrickudo2004/parchments/releases)

<p>
  <a href="https://www.producthunt.com/products/parchments?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-parchments" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1274521&theme=dark&t=1793749276346" />
      <source media="(prefers-color-scheme: light)" srcset="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1274521&theme=light&t=1793749276346" />
      <img alt="Parchments - Parchments – An offline-first, Bible study workspace | Product Hunt" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1274521&theme=light&t=1793749276346" height="44" />
    </picture>
  </a>
  &nbsp;
  <a href="https://smoltop.com/projects/parchments?utm_source=badge" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://smoltop.com/smoltop/images/badges/featured-on-dark.svg" />
      <source media="(prefers-color-scheme: light)" srcset="https://smoltop.com/smoltop/images/badges/featured-on-light.svg" />
      <img src="https://smoltop.com/smoltop/images/badges/featured-on-light.svg" alt="Featured on Smol Top" height="44" />
    </picture>
  </a>
</p>

Parchments is a premium, offline-first Bible study and sermon composition workspace. Built for theologians, pastors, and scriptural researchers, it combines a high-performance rich text & Markdown editor with deep Bible intelligence, offline Whisper AI speech transcription, local-first storage, and live Sunday Pulpit delivery tools.

🌐 **Website & Guided Tour:** [https://parchments-rust.vercel.app](https://parchments-rust.vercel.app)  
⚡ **Zero-Install Web App:** [https://parchments-rust.vercel.app/app](https://parchments-rust.vercel.app/app)

---

## 📥 Download & Install (`v0.2.20`)

To get started with **Parchments v0.2.20**, download the native installer for your platform or launch instantly in your browser:

| Platform | Download Link | File Type |
| :--- | :--- | :--- |
| **Windows** | [**Download for Windows**](https://github.com/patrickudo2004/parchments/releases/latest) | `.msi` / `.exe` Setup |
| **macOS** | [**Download macOS Universal**](https://github.com/patrickudo2004/parchments/releases/latest) | `.dmg` (Apple Silicon & Intel) |
| **Linux** | [**Download Linux Binaries**](https://github.com/patrickudo2004/parchments/releases/latest) | `.AppImage` / `.deb` / `.rpm` |
| **Android** | [**Download Android APK**](https://github.com/patrickudo2004/parchments/releases/latest/download/parchments-android.apk) | `.apk` Package (Capacitor Native) |
| **Web / iOS (PWA)** | [**Launch Parchments Web App**](https://parchments-rust.vercel.app/app) | Instant Browser & Safari Home Screen PWA |

> [!TIP]
> **First-time Installation Help:**
> <details>
> <summary><b>Windows (SmartScreen Notice)</b></summary>
> Because Parchments is community-built open-source software without a paid Windows EV signing certificate, SmartScreen may show a "Windows protected your PC" prompt.
> 1. Click <b>"More Info"</b>.
> 2. Click <b>"Run Anyway"</b>.
> </details>
> <details>
> <summary><b>macOS (Gatekeeper Notice)</b></summary>
> 1. Open the `.dmg` and drag Parchments to your Applications folder.
> 2. **Right-Click** the Parchments icon in Applications and select **Open**.
> 3. If prompted, click **Open** again (or allow under **System Settings > Privacy & Security**).
> </details>
> <details>
> <summary><b>Android (APK Sideload Guidelines)</b></summary>
> Since the signed release APK is downloaded directly from GitHub Releases:
> 1. Open the downloaded `parchments-android.apk` file on your phone.
> 2. Enable **"Allow from this source"** when prompted by your browser or file manager.
> 3. Confirm and install Parchments, then grant Microphone, Camera (for QR sync pairing), and Storage access when prompted.
> </details>
> <details>
> <summary><b>iOS (Safari Home Screen PWA)</b></summary>
> 1. Open Safari and navigate to `https://parchments-rust.vercel.app/app`.
> 2. Tap the **Share** button in Safari's action bar.
> 3. Select **Add to Home Screen** from the actions list.
> </details>

---

## ✨ Core Features

- **Smart Scripture Auto-Detection & `[[Auto-Quote]]`**: Automatically links passages (including discontinuous verses like `1 Cor 14:4, 14-15` and chained chapters `Gen 6:13; 7:4`) with instant AES-GCM decrypted hover/tap popovers—or type `[[John 3:16]]` to insert formatted scripture blockquotes inline.
- **Original Language Lexicon & 500k+ TSK Cross-References**: Access aligned Greek/Hebrew interlinear words (`31,049` sequentially aligned verses), Strong's Concordance lemmas/counts, and **31,102 verses (500,000+ links)** from the Treasury of Scripture Knowledge alongside Matthew Henry Commentary and Easton's Dictionary.
- **Offline Theological Whisper AI & Voice Notes Studio**: Capture standalone voice notes with waveform visualizations and variable-speed playback, or dictate directly into sermons using pre-bundled on-device Whisper WebAssembly (`Tiny`/`Base`) paired with our **Theological Speech Normalizer** (*Melchizedek*, *propitiation*, *Habakkuk*, spoken citations).
- **Pulpit Presentation Prompter**: Transform laptops, iPads, and Android phones into a stage teleprompter with countdown pacing (amber 5-minute & pulsing red overtime warnings), `Alt+1..4` **Sunday Deck** note tabs, Stage Mini Bible (`Alt+B`), High-Contrast OLED Amber lighting, and presentation clicker protection.
- **Parallel Bible & 12+ Offline Translations**: Side-by-side comparison of up to 4 translations (KJV, BSB, ASV, WEB, YLT, Darby, Greek TR, LXX, Hebrew WLC, etc.) with synced scrolling, continuous paragraph mode, and graceful KJV fallback.
- **Local Folder Storage on Desktop & Android + Browser IndexedDB**: Store portable `.md` files with YAML frontmatter and `.assets/images/` diagrams directly on your hard drive, inside persistent `Documents/Parchments` (or automatic `External` Scoped Storage fallback) on Android, or in encrypted browser IndexedDB with 1-click non-destructive migration.
- **Zero-Server Desktop ↔ Android Wi-Fi & QR Collaboration**: Pair phones and desktop computers over local Wi-Fi or mobile hotspots via an embedded Rust WebSocket server (`tokio-tungstenite`) and Yjs CRDTs—supporting QR scanning, copyable `ws://` addresses, knock-to-join approval, and Co-Editor / Presentation Follower modes inside isolated `Shared Note` rooms.
- **Canonical Command Palette Search & Lectio Divina**: Instant global search with **Group by Book** canonical density maps, neural semantic search (`all-MiniLM-L6-v2` pre-bundled offline), 30-item query history, 5-stage **Lectio Divina** guided study plans, and RFC 5545 `.ics` calendar export.
- **Dark & Light Sanctuary Themes + Multi-Format Export**: Switch between warm daylight Parchment and deep OLED Dark themes, embed study diagrams/photos seamlessly, and export to **Markdown (`.md`)**, **Word (`.docx`)**, **PDF (`.pdf`)**, **HTML**, and **Plain Text**.

---

## 🛠️ Technology Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Desktop Runtime**: Tauri v2 (Rust + WebView2/WKWebView + Embedded `tokio-tungstenite` Local Sync Server)
- **Mobile Runtime**: Capacitor v8 Android (`@capacitor/filesystem`)
- **Offline AI & Speech**: Hugging Face `transformers.js` + ONNX Runtime WASM (Pre-bundled Whisper & MiniLM models)
- **Editor & Collaboration**: TipTap (ProseMirror) + Yjs CRDTs (`y-websocket` & `y-webrtc`)
- **Storage & Cryptography**: Dexie (IndexedDB) + WebCrypto AES-GCM (`ENC::v1::`) + Native Markdown/YAML FS
- **Styling & Animation**: Tailwind CSS + Framer Motion + Self-Hosted Inter & Merriweather Fonts

---

## 🚀 Getting Started

1. **Clone the Repo**:
   ```bash
   git clone https://github.com/patrickudo2004/parchments.git
   cd parchments
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

4. **Build TypeScript & Production Assets**:
   ```bash
   npx tsc -b && npm run build
   ```

5. **Download Bible Data**:
   Open **Settings > Bible Versions** inside the app to download additional offline translations.

### 📱 Android Development & Sync

1. **Build Web Assets and Sync Capacitor Android**:
   ```bash
   npm run build
   npx cap sync android
   ```

2. **Run on Connected Android Device / Emulator**:
   ```bash
   npx cap run android
   ```

---

## 📖 Documentation

- [User Guide (Web Interactive)](https://parchments-rust.vercel.app/guide) | [USER_GUIDE.md](USER_GUIDE.md)
- [Releases & Changelogs](https://parchments-rust.vercel.app/releases)
- [Accessibility Statement (WCAG 2.1 AA)](ACCESSIBILITY.md)
- [Privacy Policy](PRIVACY_POLICY.md) & [Terms of Service](TERMS_OF_SERVICE.md)
- [Project Roadmap](PROJECT_ROADMAP.md) & [Technical Architecture](TECHNICAL_ARCHITECTURE.md)

---

## 🆕 What's New in `v0.2.20`

- **Android Phone Local Folders That Persist**: Dynamic Capacitor detection + persisted directory preference with automatic `Directory.Documents` → `Directory.External` Scoped Storage `EACCES` fallback ensures phone Markdown folders survive restarts.
- **Desktop ↔ Android Wi-Fi & QR Collaboration Fixes**: Auto-initialized E2EE sync identity on startup, enabled Capacitor `allowMixedContent` + cleartext LAN WebSocket support, eliminated QR tab-switch camera crashes, added copyable `ws://` host address + 6-digit PIN guidance, and isolated joined rooms into clean `Shared Note` buffers.
- **Markdown Image & Study Diagram Persistence**: Paste, drag, or upload study diagrams stored cleanly under `.assets/images/<uuid>.<ext>` in Local Folder mode (with IndexedDB fallback) and hydrated automatically on reload.
- **Theological Speech & Voice UI Upgrades**: Improved English-only Whisper options, biblical term normalizer (*Melchizedek*, *propitiation*, *Habakkuk*), microphone alert deferral, and clean `<audio>` teardown on unmount.
- **360px Mobile Studio & Website Refresh**: Fixed responsive two-row `BibleReader` & `PulpitMode` headers, expanded mobile `+` tools bottom sheet, pinned editor advanced toggle, added the interactive 30-second product showcase video tour on both `/` and `/guide`, removed the top-right `Get Beta` badge, updated `/releases` to `v0.2.20`, fixed subpage anchor links, and resolved `/accessibility` LaTeX rendering.

---

## 🛡️ License

Parchments is free and open-source software licensed under the **GNU General Public License v3 (GPL-3.0-or-later)**. This guarantees the application and source code remain free forever, protecting the rights of users and contributors.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
