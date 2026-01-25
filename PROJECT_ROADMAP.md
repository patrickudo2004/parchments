# Parchments: Project Roadmap & Phases

This document outlines the strategic journey of **Parchments**, from its initial foundation to a complete, multi-platform study ecosystem.

---

## 🏗️ Phase 1: Foundation (Current)
*Status: Complete / Final Polishing*

The goal was to build a rock-solid, local-first editor that works 100% offline and puts the user in control of their data.

- [x] **Studyspace-First Architecture**: IDE-like workflow saving directly to the local filesystem.
- [x] **Rich Text Editor**: Core Tiptap implementation with custom theme support.
- [x] **Bible Ingestion**: High-speed, offline Bible importing (JSON/USFM).
- [x] **AI Transcription**: GPU-accelerated (WebGPU) offline audio-to-text conversion.
- [x] **Global Search**: Command Palette for notes, files, and scripture.
- [x] **Scripture Auto-Linking**: Real-time detection of Bible references in text.

---

## 📖 Phase 2: Bible Intelligence
*Status: Complete*

We moved from "writing" to "studying," integrating advanced data layers directly into the workspace.

- [x] **Parallel Bible View**: View multiple versions side-by-side with synced scrolling.
- [x] **Strong’s Concordance**: Integrated Lexicon Sidebar with search and history.
- [x] **Cross-Reference Engine**: Link private notes to verses and view automated chains.

---

## ✍️ Phase 3: Study & Composition (Current)
*Goal: Optimize for sermon preparation and academic writing.*

Tools to help convert Bible research into structured messages and documents.

### 1. Sermon & Study Templates
- Pre-built structures for Inductive Study, Expository Sermons, and Simple Devotionals.
- "Guided Study" mode that prompts users through observation, interpretation, and application.

### 2. Research Sidebar
- A persistent "Pin" area where you can drag verses, dictionary entries, and transcription snippets while writing.
- Quick-copy from Bible reader to Editor with automatic citation.

### 3. Outlining Mode
- High-level view of your document structure.
- Ability to "Drill Down" into specific sections without losing sight of the whole sermon flow.

---

## 🤖 Phase 4: Advanced AI (Parchments Intelligence)
*Goal: Leverage on-device AI for semantic understanding.*

Moving beyond simple transcription into active research assistance.

### 1. Semantic Search
- Search by "Meaning" rather than just keywords. (e.g., searching for "Jesus healing" finds verses and notes about miracles even if those exact words aren't present).

### 2. AI-Assisted Outlining
- Let the AI suggest headings or summarize transcriptions into actionable sermon points.

### 3. Personal Knowledge Graph
- AI analyzes your existing notes to find links between different studies you've done months apart.

---

## ☁️ Phase 5: Sync & Collaboration
*Goal: Access your Studyspace anywhere, with anyone.*

Building a secure cloud layer that doesn't compromise the "Local-First" promise.

### 1. Encrypted Cloud Sync
- Sync your local Studyspace across devices (Desktop <-> Tablet <-> Web).
- Uses End-to-End Encryption (E2EE): Your notes are scrambled before they ever leave your computer.

### 2. Collaboration (Study Groups)
- Shared Studyspaces: Two or more people (e.g., a pastoral team) working on the same sermon in real-time.
- Commenting and review system within the editor.

---

## 📱 Phase 6: Multi-Platform Distribution
*Goal: Native performance on every screen.*

Transitioning from a browser-based app to native binaries for maximum power.

### 1. Desktop Apps (Tauri)
- Native Windows/macOS/Linux applications.
- Deeper system integration (Right-click menus, system tray, file associations).

### 2. Mobile & Tablet (Capacitor/React Native)
- Optimizing the "Parallel View" for vertical screens.
- Mobile-optimized recording and transcription for study "on the go."

---

## 🚀 The Future: Community Content
- **Plugin Marketplace**: Community-built study tools.
- **Library Manager**: Support for high-quality, copyrighted commentaries and theological works (with proper licensing).
