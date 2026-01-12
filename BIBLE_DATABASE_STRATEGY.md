# Offline Bible Database Strategy

This document outlines the strategic plan for implementing the offline Bible database in Parchments, as discussed in January 2026.

## 1. Core Principles
- **Offline-First:** All Bible data must be stored locally in the user's browser (IndexedDB) to ensure functionality without an internet connection.
- **Privacy:** No scripture requests should be sent to external APIs (except for initial download).
- **Performance:** Instant verse lookup and chapter rendering (sub-10ms).
- **Universal Presentation:** Consistent features (like chapter summaries) across all translations.

## 2. Technical Stack
- **Local Storage:** [Dexie.js](file:///c:/Users/patri/Documents/parchments/TECHNICAL_ARCHITECTURE.md#L55) (IndexedDB wrapper).
- **Format Support:** **USFM** (Unified Standard Format Markers) for imports.
- **Data Ingestion:** A background Web Worker will handle the parsing and bulk-loading of verses into the database to avoid freezing the UI.

## 3. Database Schema (Proposed)
- **`bible_versions`**: Metadata for installed versions (ID, Name, Abbreviation, Language, Copyright).
- **`bible_verses`**: The actual text, indexed by a composite key of `[versionId+book+chapter+verse]` for instant retrieval.
- **`chapter_summaries` (Deferred)**: Global summaries for all 1,189 chapters. This feature is currently on the roadmap but not implemented in the MVP due to data sourcing requirements.

## 4. Distribution Strategy (GitHub-as-a-CDN)
- **Base Version:** The app ships with the King James Version (KJV) as the default base version. This is fetched as a processed JSON bundle from the [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases) repository.
- **Extra Versions:**
  - A `versions.json` catalog file is hosted on GitHub.
  - Users can select and "Download" additional versions via the **Offline Manager**.
  - The app fetches processed JSON bundles from a GitHub repository acting as a CDN.
- **Custom Import:** Users can manually import their own USFM or JSON files to add versions not provided by the app.

## 5. UI/UX Integration
- **Tooltip Popup:** Rapid lookup using the primary version's text.
- **Right Sidebar/Bible Reader:** Full chapter rendering with reactive updates when the version or focus changes.
- **Mini Bible Modal:** Floating, draggable reader that utilizes the same local database layer.

## 6. Sourcing Data
- **[EBible.org](https://ebible.org)**: Primary source for public-domain USFM/SFM files.
- **Open Bible Data Repositories**: Utilizing established JSON-formatted Bible datasets on GitHub for the "Official" Parchments catalog.
