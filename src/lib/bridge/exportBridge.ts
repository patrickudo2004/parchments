/**
 * exportBridge.ts
 * High-performance document export bridge.
 * Uses native desktop file dialogs and Rust filesystem persistence when running in Tauri,
 * with automatic fallback to browser Blob downloads.
 */

import { isTauri, safeInvoke } from './runtimeBridge';
import { saveAs } from 'file-saver';

export interface NativeExportOptions {
    defaultPath?: string;
    filters?: Array<{
        name: string;
        extensions: string[];
    }>;
}

/**
 * Saves text content natively on desktop or falls back to browser download
 */
export async function saveExportedFile(
    filename: string,
    content: string,
    mimeType: string,
    options?: NativeExportOptions
): Promise<boolean> {
    if (isTauri) {
        try {
            const { save } = await import('@tauri-apps/plugin-dialog');
            const targetPath = await save({
                defaultPath: options?.defaultPath || filename,
                filters: options?.filters || [
                    { name: 'Document', extensions: [filename.split('.').pop() || 'txt'] }
                ]
            });

            if (!targetPath) {
                // User cancelled the native save dialog
                return false;
            }

            const saved = await safeInvoke<boolean>('native_save_file_direct', {
                path: targetPath,
                content
            });

            if (saved) {
                return true;
            }

            // Fallback to plugin-fs if direct command didn't complete
            const { writeTextFile } = await import('@tauri-apps/plugin-fs');
            await writeTextFile(targetPath, content);
            return true;
        } catch (tauriErr) {
            console.warn('[ExportBridge] Native export failed, falling back to browser download:', tauriErr);
        }
    }

    // Universal web/mobile fallback
    const blob = new Blob([content], { type: mimeType });
    saveAs(blob, filename);
    return true;
}
