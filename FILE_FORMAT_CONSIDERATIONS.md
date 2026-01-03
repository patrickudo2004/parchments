# Parchments: File Format Considerations

This document outlines the architectural discussion regarding the file formats used by the Parchments application for storage, portability, and native desktop integration.

## 1. Internal Format: JSON (ProseMirror / Tiptap)
*   **Primary Usage:** Active storage in IndexedDB.
*   **Strengths:**
    *   **Structured Data:** Allows storing specific attributes on text (e.g., Scripture Reference metadata like book, chapter, verse).
    *   **Performance:** Native format for the Tiptap editor; no conversion overhead during typing/saving.
*   **Verdict:** Essential for internal application state and complex data tracking.

## 2. Interchange Format: Markdown (.md)
*   **Primary Usage:** Exporting notes for use in other apps (Obsidian, Notepad, Word).
*   **Strengths:**
    *   **Future-Proof:** Human-readable plain text that will be accessible decades from now.
    *   **Portability:** The industry standard for modern note-taking.
*   **Verdict:** Strongly recommended as a default "Save As" option for text-only notes.

## 3. Native Format: Parchment Bundle (.prch)
*   **Primary Usage:** Proprietary container for complex notes, especially those with audio attachments or rich metadata.
*   **Mechanism:** A renaming of a standard **ZIP archive**.
*   **Internal Structure:**
    *   `content.json` or `note.md`: The primary text content.
    *   `recordings/`: A directory containing voice note audio files (MP3/WAV).
    *   `metadata.json`: Stores tags, Bible versions used, and specific scripture cross-references.
*   **Strengths:**
    *   **Encapsulation:** Keeps audio and text together in a single file on the user's hard drive.
    *   **Professionalism:** Allows for OS-level file associations (double-clicking a `.prch` opens the app).
*   **Verdict:** Recommended as the "Signature" file format for the application.

## 4. Bulk Data: JSON (.json)
*   **Primary Usage:** Full database backups and library migrations.
*   **Verdict:** Best for "Export All" functionality.

---

## Strategic Recommendations
1.  **Phase 1:** Maintain **JSON** internally for performance.
2.  **Phase 2:** Implement **Markdown Export** to ensure user data portability.
3.  **Phase 3:** Develop the **.prch Bundle** system to handle voice notes and complex sermon packages as single local files.
