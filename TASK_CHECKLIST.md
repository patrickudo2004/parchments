# Parchments - Development Task Checklist

> **Status:** In Progress - Phase 1, Week 1  
> **Current Phase:** Foundation & Core Editor  
> **Last Updated:** December 24, 2024

---

## Phase 1: Foundation & Core Editor (Weeks 1-3)

### Week 1: Project Setup & Infrastructure
- [ ] Initialize Vite + React + TypeScript project
- [ ] Configure Tailwind CSS with custom theme configuration
- [ ] Set up ESLint, Prettier, and Husky pre-commit hooks
- [ ] Configure path aliases (`@/components`, `@/lib`, `@/stores`, etc.)
- [ ] Install and configure Dexie.js for IndexedDB
- [ ] Define complete IndexedDB schema (notes, folders, voiceNotes, bibleVerses, bibleVersions, strongsEntries, settings)
- [ ] Create database migration system for future schema updates
- [ ] Write database utility functions and CRUD operations
- [ ] Set up Zustand stores (UI store, Notes store, Auth store, Bible store, Voice store)
- [ ] Create custom hooks for store access
- [ ] Implement persistence middleware for localStorage sync
- [ ] Create comprehensive color palette for light mode
- [ ] Create comprehensive color palette for dark mode
- [ ] Define typography scale (headings, body text, code, etc.)
- [ ] Build base UI components (Button, Input, Select, Modal, Dropdown)
- [ ] Implement ThemeProvider and theme toggle functionality
- [ ] Test theme switching between light and dark modes

### Week 2: Authentication & Layout
- [x] Build Login page with email and password inputs
- [/] Add social login placeholders (Google, Apple)
- [x] Build Signup page with full name, email, password, confirm password
- [x] Implement local authentication using bcryptjs for password hashing
- [x] Create AuthContext and protected route wrapper
- [x] Add session management using localStorage
- [x] Implement "Remember Me" functionality
- [x] Build TopBar component with logo and app name
- [x] Add current note title display in TopBar
- [x] Build user menu with thumbnail, name, and email
- [x] Add action buttons to TopBar (Note, Voice, Bible, Strong's)
- [x] Build MenuBar component with File, Edit, View, Insert, Format, Tools, Help menus
- [ ] Implement menu keyboard shortcuts
- [x] Build StatusBar component with save status indicator
- [x] Add page count, word count, and zoom controls to StatusBar
- [x] Implement responsive layout grid for main application
- [ ] Create user profile editing modal
- [ ] Add user thumbnail upload or initials display
- [x] Test authentication flow (signup → login → logout → session persistence)

### Week 3: Rich Text Editor & Basic Note-Taking
- [ ] Install TipTap and required extensions
- [ ] Configure basic formatting extensions (Bold, Italic, Underline, Strikethrough)
- [ ] Add heading extensions (H1, H2, H3, H4, H5, H6)
- [ ] Add list extensions (Bulleted lists, Numbered lists, Task lists)
- [ ] Implement text alignment (left, center, right, justify)
- [ ] Add text color and highlight color pickers
- [ ] Build FormattingToolbar component with all formatting options
- [ ] Implement keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+U, etc.)
- [ ] Add undo/redo functionality
- [ ] Build left sidebar container with resizable width
- [ ] Implement folder/note tree structure (using react-arborist or custom)
- [ ] Add "New Folder" button to left sidebar
- [ ] Add "New Note" button to left sidebar
- [ ] Add "New Voice Note" button to left sidebar
- [ ] Implement folder creation with inline naming
- [ ] Implement note creation with auto-generated title
- [ ] Add drag-and-drop for reorganizing folders and notes
- [ ] Implement active item highlighting in sidebar
- [ ] Add context menu for items (Rename, Delete, Move, Duplicate)
- [ ] Implement auto-save functionality with 2-second debounce
- [ ] Add save status indicator ("Saved", "Typing...", "Saving...")
- [ ] Implement delete note with confirmation dialog
- [ ] Add rename note functionality (inline editing)
- [ ] Build basic search/filter for notes by title
- [ ] Add search highlight in sidebar
- [ ] Test editor performance with large documents (10,000+ words)
- [ ] Test folder tree with 100+ items
- [ ] Verify data persistence in IndexedDB

---

## Progress Tracking

**Phase 1 - Week 1:** [ ] 0/17 tasks completed  
**Phase 1 - Week 2:** [ ] 0/19 tasks completed  
**Phase 1 - Week 3:** [ ] 0/28 tasks completed  

**Phase 1 Total:** [ ] 0/64 tasks completed (0%)

---

## Notes

- Mark tasks as `[/]` when in progress
- Mark tasks as `[x]` when completed
- Add notes or blockers below each task as needed
- Update progress tracking after each work session

---

## User Information

- **GitHub Repository:** https://github.com/patrickudo2004/parchments
- **Developer:** Patrick Udoh (patrickudo2004@gmail.com)
- **Development Port:** 3000

---

*This is a reference copy of the task checklist for the Parchments project.*
