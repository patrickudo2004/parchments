# Scripture Intelligence Architecture

This document outlines the architectural decisions for the "Scripture Intelligence" features in Parchments, specifically focusing on performance, user experience, and technical implementation details.

## Core Features
1.  **Automatic Recognition:** Detects Bible verses (e.g., "John 3:16") as you type.
2.  **Smart Highlighting:** Styles references distinctly without breaking the typing flow.
3.  **Hover Tooltip:** Displays the verse text in a floating popup on `mouseover`.
4.  **Deep Dive Navigation:** Opens the selected chapter in the Right Sidebar on `dblclick`, focused on the specific verse.

## Technical Strategy

### 1. The Brain: `scriptureParser.ts`
*   **Role:** Pure utility library for string analysis.
*   **Responsibility:** 
    *   Contains the strict Regex patterns for detection.
    *   Parses strings into structured data: `{ book: "John", chapter: 3, verse_start: 16, verse_end: null }`.
    *   Handles common abbreviations (`Jn`, `Gen`, `1 Cor`).

### 2. The Body: `ScriptureExtension.ts` (Tiptap Mark)
*   **Role:** Editor integration.
*   **Type:** `Mark` (like Bold/Italic), NOT a Node.
*   **Mechanism:** **`InputRule`**.
    *   **Why:** To prevent "cursor jumping" and "backward typing" bugs.
    *   **Logic:** Listens for typing sequences (e.g., `Book Chapter:Verse `). When confirmed, it applies the mark to the specific range *without* rewriting the entire document.
*   **Event Handling:**
    *   **Hover:** Unlocks the tooltip.
    *   **Double Click:** Triggers the `OPEN_BIBLE_SIDEBAR` action.

### 3. The Face: `ScriptureTooltip.tsx`
*   **Role:** Floating UI.
*   **Implementation:** React component using `@radix-ui/react-tooltip` or similar positioning logic.
*   **Data:** Initially uses mock data/placeholder text; will later connect to local DB or API.

### 4. The Navigation: `uiStore.ts` Updates
*   **New Action:** `setBibleFocus(location: { book, chapter, verse })`.
*   **Interaction:**
    *   User double-clicks "John 3:16".
    *   Extension calls `openRightSidebar('bible')` AND `setBibleFocus(...)`.
    *   Right Sidebar mounts, loads "John 3", and auto-scrolls to verse 16.

## Critical UX Requirements
*   **Cursor Stability:** The parsing must happen "surgically" at the cursor position. **No full-document scanning** on every keystroke.
*   **Performance:** Regex must be optimized to avoid main-thread blocking on long documents.
*   **Offline First:** Architecture must support local lookup of verse text (Phase 2).
