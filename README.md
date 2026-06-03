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
| **Windows** | [**Download for Windows**](https://github.com/patrickudo2004/parchments/releases/latest/download/Parchments_0.1.0_x64_en-US.msi) | `.msi` Installer |
| **macOS** | [**Download for macOS**](https://github.com/patrickudo2004/parchments/releases/latest/download/Parchments_0.1.0_universal.dmg) | `.dmg` (Universal) |
| **Linux** | [**Download .deb**](https://github.com/patrickudo2004/parchments/releases/latest/download/parchments_0.1.0_amd64.deb) or [**.AppImage**](https://github.com/patrickudo2004/parchments/releases/latest/download/Parchments_0.1.0_amd64.AppImage) | `.deb` / `.AppImage` |
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

*Parchments is currently in **Phase 7: Public Launch & Marketing**. Verified stable release: `v0.2.0-beta.1`.*

## 🆕 What's New in Beta 2.0 (The Immersive Zen Release)
- **Immersive "Lectio Mode"**: Launch daily schedules inside beautiful 50/50 reading split-panes.
- **Zen Scrolling vs. Tap-to-Turn**: Settings toggle to choose between vertical reading stacks or classical paginated swiping.
- **P2P Progress Sharing**: Reading plans and cursor offsets automatically sync across paired mobile and desktop devices.
- **UK GDPR & PECR Privacy Compliance**: Transparent on-device consent notices and privacy pages protecting user data.
- **Stability Fixes**: Raised popover menu z-indexes and resolved dark mode text selection contrast overrides.

---

## 🛡️ License

Parchments is free and open-source software licensed under the **GNU General Public License v3**. This ensures that the application and its source code remain free forever, protecting the rights of users and contributors.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

---

Check the [Task Checklist](TASK_CHECKLIST.md) for detailed progress.
