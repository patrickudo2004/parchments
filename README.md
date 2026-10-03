# Parchments

[![Latest Release](https://img.shields.io/github/v/release/patrickudo2004/parchments?label=latest%20beta&color=blue)](https://github.com/patrickudo2004/parchments/releases/latest)
[![Build Status](https://github.com/patrickudo2004/parchments/actions/workflows/release.yml/badge.svg)](https://github.com/patrickudo2004/parchments/actions/workflows/release.yml)
[![License](https://img.shields.io/github/license/patrickudo2004/parchments)](LICENSE)
[![Total Downloads](https://img.shields.io/github/downloads/patrickudo2004/parchments/total?style=for-the-badge&color=primary)](https://github.com/patrickudo2004/parchments/releases)

Parchments is a premium, offline-first Bible study and sermon composition workspace. Built for theologians, pastors, and scriptural researchers, it combines a high-performance rich text editor with deep Bible intelligence and structural editing tools.

---

## 📥 Download & Install (Beta)

To get started with the Parchments Beta, download the installer for your operating system below:

| Platform | Download Link | File Type |
| :--- | :--- | :--- |
| **Windows** | [**Download for Windows**](https://github.com/patrickudo2004/parchments/releases/latest) | `.msi` / `.exe` Setup |
| **macOS** | [**Download for macOS**](https://github.com/patrickudo2004/parchments/releases/latest) | `.dmg` (Universal) |
| **Linux** | [**Download Linux Binaries**](https://github.com/patrickudo2004/parchments/releases/latest) | `.AppImage` / `.deb` |
| **Android** | [**Download APK**](https://github.com/patrickudo2004/parchments/releases/latest/download/parchments-android.apk) | `.apk` Package |
| **iOS (PWA)** | [**Access Web App**](https://parchments.vercel.app) | Safari Web PWA |

> [!TIP]
> **First-time Installation Help:**
> <details>
> <summary><b>Windows (SmartScreen Warning)</b></summary>
> Since the app is in Beta and not yet signed with a paid developer certificate, Windows may show a "Protected your PC" box. 
> 1. Click <b>"More Info"</b>.
> 2. Click <b>"Run Anyway"</b>.
> </details>
> <details>
> <summary><b>macOS (Security Warning)</b></summary>
> 1. Open the `.dmg` and drag Parchments to your Applications folder.
> 2. **Right-Click** the Parchments icon in Applications and select **Open**.
> 3. If prompted, click **Open** again. (You can also go to System Settings > Privacy & Security and click "Open Anyway" at the bottom).
> </details>
> <details>
> <summary><b>Android (Installation Guidelines)</b></summary>
> Since the APK is downloaded directly from GitHub Releases:
> 1. Open the downloaded `.apk` file on your device.
> 2. Enable "Allow from this source" when prompted by your browser or file manager.
> 3. Confirm and install the application.
> </details>
> <details>
> <summary><b>iOS (Safari Home Screen Installation)</b></summary>
> To install the Web PWA on your home screen:
> 1. Open Safari and navigate to your hosted app (e.g. `https://parchments.vercel.app`).
> 2. Tap the **Share** button in Safari's action bar.
> 3. Select **Add to Home Screen** from the actions list.
> </details>

---

## ✨ Core Features

- **Parallel Bible Reader**: Side-by-side study of up to 4 translations with synced verse scrolling.
- **Immersive Lectio Reading Plans**: Set up canonical or customized reading plans in a gorgeous split-column Zen Workspace on desktop or swipe-sliding panels on mobile.
- **Interlinear & Lexicon**: Access original Greek/Hebrew lemmas and Strong's Concordance definitions directly in your study flow.
- **Smart Outline**: Reshuffle your sermon or study notes with **Drag-to-Reorder** and isolate sections with **Focus Mode**.
- **Research Bench**: Persistently pin scriptures and cross-references across sessions.
- **Study Spaces**: Real-time folder-level collaboration with **Host-Dictatorship** sync for pastoral teams.
- **Voice-to-Text**: High-accuracy real-time transcription for capturing oral reflections and sermon ideas.
- **Zero-Server Local Wi-Fi Sync**: Real-time collaboration over local Wi-Fi and mobile hotspots powered by an embedded Rust WebSocket server (tokio-tungstenite) with QR code pairing, host knock-to-join security, and Co-Editor vs. Presentation Follower modes.
- **Markdown & Frontmatter Properties**: Interactive document properties card (Speaker, Series, Date, Scripture, Tags) with seamless bidirectional HTML↔Markdown conversion and loose `.md` file opening.
- **Discontinuous Scripture Parsing**: Type compound references like `1 Cor 14:4, 14-15` or chained chapters `Gen 6:13; 7:4` with unified tooltip cards and Logos-style omission dividers.
- **Local-First & Multi-Workspace Architecture**: Your data stays on your machine. Access physical local files directly on Desktop & Mobile (Capacitor native wrappers write documents straight to your device `Documents/Parchments` folder), and fall back cleanly to IndexedDB virtual folders on browser PWAs.
- **Unified Switcher Dropdown**: Easily swap between physical local directories and sandboxed browser databases with a glassmorphic switcher at the top of the sidebar.

---

## 🛠️ Technology Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Routing**: React Router v7
- **State Management**: Zustand (+ Persist)
- **Editor Framework**: TipTap (ProseMirror)
- **Styling**: Tailwind CSS + Custom Design System
- **Animations**: Framer Motion
- **Storage**: IndexedDB (Local-First)

## 🚀 Getting Started

1.  **Clone the Repo**:
    ```bash
    git clone https://github.com/patrickudo2004/parchments.git
    cd parchments
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Start Development Server**:
    ```bash
    npm run dev
    ```

4.  **Download Bible Data**:
    Open the app, go to **Settings > Downloads**, and fetch the translations you need.

### 📱 Mobile Development & Compilation

To build, synchronize, or test mobile platform structures locally:

1. **Build and Sync Assets**:
   ```bash
   npm run build
   npx cap sync
   ```

2. **Run on Connected Android Device**:
   ```bash
   npx cap run android
   ```

3. **Run on iOS Simulator/Device (macOS Only)**:
   ```bash
   npx cap run ios
   ```

## 📖 Documentation

-   [User Guide](USER_GUIDE.md): How to use the app.
-   [Project Roadmap](PROJECT_ROADMAP.md): Current status and future phases.
-   [Technical Architecture](TECHNICAL_ARCHITECTURE.md): Deep dive into the system design.

---

*Parchments is currently in **Phase 7: Public Launch & Marketing**. Verified stable release: `v0.1.7`.*

## 🆕 What's New in v0.1.7 (Zero-Server Local Wi-Fi Sync & Markdown Frontmatter)
- **Zero-Server Local Wi-Fi Sync**: Replaced third-party Deno signaling servers with an embedded Rust WebSocket server (`tokio-tungstenite`) on port 48921.
- **Cross-Platform Multi-Device Collaboration**: Real-time cross-OS note sharing between Windows, macOS, Linux, Android, and iOS on local Wi-Fi or mobile hotspots with zero internet connection required.
- **Host Security Knock-to-Join**: QR codes with 32-character cryptographic tokens and manual 6-digit codes. Hosts approve each incoming connection via Allow/Deny prompts.
- **Co-Editor & Presentation Follower Modes**: Joining devices choose between full bidirectional CRDT editing or a read-only presentation follower view (ideal for teleprompters and preaching).
- **Markdown Frontmatter & Properties**: Interactive document properties card (Speaker, Series, Date, Scripture, Tags) with seamless bidirectional HTML↔Markdown conversion.
- **Discontinuous Verse Reference Parsing**: Complete support for discontinuous references (e.g. `1 Cor 14:4, 14-15`), chained chapters (`Gen 6:13; 7:4`), and Logos-style omission cards.

---

## 🛡️ License

Parchments is free and open-source software licensed under the **GNU General Public License v3**. This ensures that the application and its source code remain free forever, protecting the rights of users and contributors.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

---

Check the [Task Checklist](TASK_CHECKLIST.md) for detailed progress.
