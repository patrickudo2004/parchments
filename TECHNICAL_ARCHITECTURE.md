# Parchments - Technical Architecture Document

> **Version:** 1.1  
> **Date:** February 13, 2026  
> **Status:** Finalization Phase

---

## Executive Summary

**Parchments** is a free, offline-first Bible note-taking and sermon management application designed for Christians, theologians, pastors, and religious students worldwide. The application provides intelligent scripture reference linking, voice transcription, and comprehensive study tools—all available offline with optional cloud backup.

### Core Value Proposition
- **Unified Study Environment:** Bible references, notes, and study tools in one place
- **Intelligent Scripture Linking:** Auto-detect and link Bible references as you type
- **Offline-First:** Full functionality without internet connection
- **Cross-Platform:** Web, Desktop (Windows, macOS, Linux), Mobile (iOS, Android)
- **Free Forever:** No paywalls, no subscriptions, accessible to all

---

## Technology Stack

### Frontend Framework
```
Core: React 19+ with TypeScript
Build Tool: Vite 7+
State Management: Zustand (lightweight, perfect for offline-first)
Routing: React Router v7
```

### Rich Text Editor
```
Primary Choice: TipTap (ProseMirror-based)
Rationale:
  - Extensible node system (perfect for scripture references)
  - Excellent TypeScript support
  - Active community and maintenance
  - Custom extensions for scripture auto-linking
  - Collaborative editing support (future-proofing)
```

### Styling & UI
```
CSS Framework: Tailwind CSS 3+
Component Library: Headless UI (accessibility)
Icons: Google Material Design Icons (@mui/icons-material)
Animations: Framer Motion (smooth, performant)
```

### Data Layer

#### Local Storage (Primary)
```
IndexedDB Wrapper: Dexie.js 3+
Rationale:
  - Clean, Promise-based API
  - TypeScript support
  - Excellent query performance
  - Observable queries (reactive UI updates)
  - Versioning and migration support

Database Schema (Version 9):
  - notes: User-created text notes
  - folders: Hierarchical folder structure
  - voiceNotes: Audio recordings with metadata
  - bibleVerses: Indexed scripture storage
  - bibleVersions: Metadata for installed versions
  - strongsEntries: Hebrew/Greek dictionary
  - settings: User preferences and configuration
  - readingPlans: User-defined devotional study plans
  - readingPlanHistory: Daily progress checkpoints mapping completed dates
```

#### Cloud Sync (Optional)
```
Strategy: File-based sync to user's cloud storage
Supported Providers:
  - WebRTC P2P (Signaling via Deno)
  - Google Drive API (In-progress)
  - Microsoft OneDrive API (In-progress)

Sync Format: Encrypted JSON bundles & Yjs Updates (binary)
Conflict Resolution: Host-Dictatorship (Local Disk as Source of Truth)
```

### Collaboration Engine (Yjs)
```
Protocol: Yjs (CRDTs)
Networking: y-webrtc + Custom Signaling Server (wss)
Persistence: y-indexeddb (Local Cache)

Sync Pattern: Host-Dictatorship
  - The Host (owner of the local folder) is the "Dictator" of the manifest.
  - Hosts broadcast their local disk state to the shared space on change/startup.
  - Guests (Peers) hydrate "Ghost Placeholders" from the manifest.
  - Prevents race conditions and "Ghost File" reappearance by enforcing disk-level reality.

Voice Intelligence Sync:
  - Real-time distribution of transcripts via the Folder Manifest Map.
  - Voice metadata (duration, transcript) included as manifest fields.

Decentralized Study Plan Progress Sync:
  - Embeds daily study cursor offsets under `lectioProgress` inside note comment headers (`<!-- parchments-meta: ... -->`).
  - Synced automatically over WebRTC single-note communication channels.
  - Hydrated seamlessly into the local IndexedDB database upon file opening on secondary devices.
```
```

### Voice Transcription
```
Library: Transformers.js (Xenova)
Model: Whisper Tiny (~39MB) or Whisper Base (~74MB)
Rationale:
  - 100% offline, runs in browser via WebAssembly
  - Acceptable accuracy for note-taking
  - No API costs, privacy-preserving
  - Progressive enhancement (download on first use)

Fallback: Web Speech API (online, free, less accurate)
```

### Scripture Parsing
```
Custom Parser with Regex Engine
Supported Formats:
  - Single verse: "John 3:16"
  - Range: "John 3:16-20"
  - Multiple: "John 3:16,18,20"
  - Combined: "Genesis 4:11-15,20"
  - Short forms: "Jn. 3:16", "1 Cor. 13:4-7"
  - Version tags: "John 3:16 NKJV"

Implementation:
  - Tokenizer for book names (full + abbreviations)
  - Regex patterns for chapter:verse combinations
  - TipTap custom node for scripture references
  - Real-time parsing as user types
```

### Bible Data Management
```
Source Format: XML (user-provided)
Storage Format: SQLite (via sql.js in IndexedDB)
Converter: Custom XML → SQLite transformer

Schema:
  - books: Book metadata (name, testament, order)
  - verses: Individual verses (book_id, chapter, verse, text)
  - versions: Version metadata (name, abbreviation, copyright)

Indexing:
  - Composite index on (version, book, chapter, verse)
  - Full-text search index on verse text
  - Book name search index (fuzzy matching)
```

### Cross-Platform Strategy

#### Web Application (Primary)
```
Deployment: Static hosting (Vercel, Netlify, GitHub Pages)
PWA: Service Worker for offline caching
Features: Full feature parity
```

#### Desktop Applications
```
Framework: Tauri 2.0
Rationale:
  - Rust-based, lightweight (~3MB runtime vs 100MB+ Electron)
  - Native system integration
  - Better performance and security
  - Shared web codebase
  - Platform-specific features (file system, notifications)

Platforms: Windows, macOS, Linux
Distribution: Direct download, Microsoft Store, Mac App Store, Snap/Flatpak
```

#### Mobile Applications
```
Framework: React Native with Expo
Shared Logic: Core business logic via shared TypeScript modules
Platform-Specific:
  - iOS: Native file picker, iCloud integration
  - Android: Native file picker, Google Drive integration

Distribution: App Store, Google Play Store
```

---

## User Information

- **GitHub Repository:** https://github.com/patrickudo2004/parchments
- **Developer:** Patrick Udoh (patrickudo2004@gmail.com)
- **Development Port:** 3000

---

*This is a reference copy of the technical architecture document for the Parchments project.*
