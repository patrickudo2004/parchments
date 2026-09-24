# Parchments Developer & Architecture Rules

## 1. Scripture Text Encryption & Decryption Invariant
- **Storage**: All Bible verse text in IndexedDB (`db.bibleVerses`) is AES-GCM encrypted with prefix `ENC::v1::`.
- **Decryption Rule**: Any UI surface, tool, or export routine reading verse text from `db.bibleVerses` or `dbHelpers.getVerseText()` MUST decrypt the text before display, pinning, or inserting into notes.
  - Single text: `const { decryptVerseText } = await import('@/lib/bible/bibleCryptoService'); const plainText = await decryptVerseText(rawText);`
  - Array of verses: `const { decryptVerses } = await import('@/lib/bible/bibleCryptoService'); const plainVerses = await decryptVerses(verses);`
- **Fallback Rule**: When fetching verses for tooltips, previews, or cross-references, if the active translation lacks the requested book/testament (e.g. Greek TR for OT passages), gracefully fall back to KJV and update the version badge accordingly.

## 2. Reference Datasets & Large IndexedDB Ingestion
- **Batching**: Never execute single `bulkPut` calls on large datasets (> 1,000 records, such as TSK's 31,102 entries) on the UI thread.
- Always chunk insertions into safe batches (e.g. `CHUNK_SIZE = 2500`) with progress callback updates to avoid locking the UI or exhausting WebView2 transaction quotas.

## 3. Study Sidebar UX & Contextual Fallbacks
- **No Blank Dead Ends**: Study and reference sidebars (TSK Cross-References, Commentary, Dictionary) must never present a dead-end "No Verse Selected" empty screen when opened from the activity bar.
- **Contextual Default**: If `selectedVerseId` is null, automatically fall back to the user's active reading passage in the reader (`bibleFocus.book`, `chapter`, `verse || 1`).
- **Direct Access**: Always provide a direct verse search/lookup input and quick-suggestion pills so users can explore cross-references independently of reader navigation.
- **Clear Navigation Labels**: Use descriptive, specific labels in activity bars and panel headers (e.g. "TSK References" rather than ambiguous labels like "References").

## 4. Verification & Release Protocol
- **Compilation Check**: Run `.\node_modules\.bin\tsc.cmd -b` (or `npx tsc -b`) to verify composite TypeScript project builds before committing.
- **Production Asset Build**: Run `npm run build` to confirm Vite bundling succeeds.
- **Releases**: Tagging with `v*` triggers the multi-platform GitHub Actions release workflow. Always verify local build integrity before pushing tags.
