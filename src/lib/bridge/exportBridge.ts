/**
 * exportBridge.ts
 * High-performance document export bridge.
 * Uses native desktop file dialogs and scoped filesystem persistence when running in Tauri,
 * with automatic fallback to browser Blob downloads.
 */

import { isTauri } from './runtimeBridge';
import { saveAs } from 'file-saver';

export interface NativeExportOptions {
    defaultPath?: string;
    filters?: Array<{
        name: string;
        extensions: string[];
    }>;
}

/**
 * Saves text or binary content natively on desktop or falls back to browser download
 */
export async function saveExportedFile(
    filename: string,
    content: string | Uint8Array | Blob,
    mimeType: string,
    options?: NativeExportOptions
): Promise<boolean> {
    if (isTauri) {
        try {
            const { save } = await import('@tauri-apps/plugin-dialog');
            const ext = filename.split('.').pop() || 'txt';
            const targetPath = await save({
                defaultPath: options?.defaultPath || filename,
                filters: options?.filters || [
                    { name: 'Document', extensions: [ext] }
                ]
            });

            if (!targetPath) {
                // User cancelled the native save dialog
                return false;
            }

            if (typeof content === 'string') {
                const { writeTextFile } = await import('@tauri-apps/plugin-fs');
                await writeTextFile(targetPath, content);
            } else {
                const { writeFile } = await import('@tauri-apps/plugin-fs');
                const bytes = content instanceof Blob
                    ? new Uint8Array(await content.arrayBuffer())
                    : content;
                await writeFile(targetPath, bytes);
            }
            return true;
        } catch (tauriErr) {
            console.warn('[ExportBridge] Native export failed, falling back to browser download:', tauriErr);
        }
    }

    // Universal web/mobile fallback
    const blob = content instanceof Blob ? content : new Blob([content as any], { type: mimeType });
    saveAs(blob, filename);
    return true;
}
