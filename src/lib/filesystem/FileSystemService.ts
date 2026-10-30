import { Capacitor } from '@capacitor/core';

export function checkIsTauri(): boolean {
    try {
        return typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__);
    } catch {
        return false;
    }
}

export function isWebFileSystemSupported(): boolean {
    try {
        return typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function';
    } catch {
        return false;
    }
}

// Backwards-compatible runtime flags
export const isTauri = checkIsTauri();
export const isCapacitor = Capacitor.isNativePlatform();

const IGNORED_FS_ENTRIES = new Set([
    '.assets',
    '.git',
    '.obsidian',
    '.vscode',
    '.idea',
    '.trash',
    '.ds_store',
    'node_modules',
    'thumbs.db',
    'desktop.ini',
]);

function getMimeTypeFromName(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'webm': return 'audio/webm';
        case 'mp4': case 'm4a': return 'audio/mp4';
        case 'ogg': return 'audio/ogg';
        case 'wav': return 'audio/wav';
        case 'mp3': return 'audio/mpeg';
        case 'aac': return 'audio/aac';
        case 'png': return 'image/png';
        case 'jpg': case 'jpeg': return 'image/jpeg';
        case 'webp': return 'image/webp';
        case 'gif': return 'image/gif';
        default: return 'application/octet-stream';
    }
}

function shouldIgnoreEntry(name: string): boolean {
    if (!name) return true;
    if (name.startsWith('.')) return true;
    return IGNORED_FS_ENTRIES.has(name.toLowerCase());
}

export interface FileSystemHandle {
    kind: 'file' | 'directory';
    name: string;
    path?: string; // Used for Native (Tauri / Capacitor)
    rawHandle?: any; // Used for Browser (File System Access API)
}

export interface FileSystemFileHandle extends FileSystemHandle {
    kind: 'file';
}

export interface FileSystemDirectoryHandle extends FileSystemHandle {
    kind: 'directory';
}

export class FileSystemService {
    /**
     * Opens a directory picker and returns a handle.
     */
    async openDirectory(): Promise<FileSystemDirectoryHandle> {
        if (checkIsTauri()) {
            const { open } = await import('@tauri-apps/plugin-dialog');
            const selected = await open({
                directory: true,
                multiple: false,
            });

            if (selected) {
                const path = typeof selected === 'string' ? selected : selected[0];
                const name = path.split(/[/\\]/).pop() || 'Studyspace';
                return {
                    kind: 'directory',
                    name,
                    path
                };
            }
            const abortErr = new Error('No directory selected');
            abortErr.name = 'AbortError';
            throw abortErr;
        }

        if (isCapacitor) {
            const { Filesystem, Directory } = await import('@capacitor/filesystem');
            try {
                const checkPerm = await Filesystem.checkPermissions();
                if (checkPerm.publicStorage !== 'granted') {
                    await Filesystem.requestPermissions();
                }
            } catch (permError) {
                console.warn('Failed to request filesystem permissions:', permError);
            }

            try {
                await Filesystem.mkdir({
                    path: 'Parchments',
                    directory: Directory.Documents,
                    recursive: true
                });
            } catch {
                // Already exists
            }

            return {
                kind: 'directory',
                name: 'Parchments',
                path: 'Parchments'
            };
        }

        // Browser File System Access API
        if (!isWebFileSystemSupported()) {
            const unsupportedErr: any = new Error(
                'Direct local folder access is not supported in this browser. Use Chrome, Edge, Opera, or the Parchments Desktop App.'
            );
            unsupportedErr.code = 'UNSUPPORTED_BROWSER';
            throw unsupportedErr;
        }

        let handle: any;
        try {
            handle = await (window as any).showDirectoryPicker({
                id: 'parchments-studyspace',
                mode: 'readwrite',
                startIn: 'documents',
            });
        } catch (err: any) {
            // Re-throw user cancellation or security blocks directly; only retry if options signature failed
            if (err?.name === 'TypeError') {
                handle = await (window as any).showDirectoryPicker({
                    mode: 'readwrite',
                });
            } else {
                throw err;
            }
        }

        return {
            kind: 'directory',
            name: handle.name,
            rawHandle: handle
        };
    }

    /**
     * Opens a file picker and returns a handle for a single loose file.
     */
    async openFile(): Promise<FileSystemFileHandle> {
        if (checkIsTauri()) {
            const { open } = await import('@tauri-apps/plugin-dialog');
            const selected = await open({
                directory: false,
                multiple: false,
                filters: [
                    { name: 'Parchments & Markdown Documents', extensions: ['md', 'markdown', 'html', 'txt'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (selected) {
                const path = typeof selected === 'string' ? selected : selected[0];
                const name = path.split(/[/\\]/).pop() || 'Untitled.md';
                return {
                    kind: 'file',
                    name,
                    path
                };
            }
            const abortErr = new Error('No file selected');
            abortErr.name = 'AbortError';
            throw abortErr;
        }

        // Browser fallback
        if (typeof window !== 'undefined' && typeof (window as any).showOpenFilePicker === 'function') {
            const [handle] = await (window as any).showOpenFilePicker({
                types: [
                    {
                        description: 'Markdown & Text Documents',
                        accept: {
                            'text/markdown': ['.md', '.markdown'],
                            'text/html': ['.html', '.htm'],
                            'text/plain': ['.txt']
                        }
                    }
                ],
                multiple: false
            });

            return {
                kind: 'file',
                name: handle.name,
                rawHandle: handle
            };
        }

        const unsupportedErr: any = new Error('File picker not supported in this browser');
        unsupportedErr.code = 'UNSUPPORTED_BROWSER';
        throw unsupportedErr;
    }

    /**
     * Checks whether a child file or directory already exists inside `parent`.
     */
    async entryExists(parent: FileSystemDirectoryHandle, name: string): Promise<boolean> {
        if (checkIsTauri() && parent.path) {
            const { exists } = await import('@tauri-apps/plugin-fs');
            try {
                return await exists(`${parent.path}/${name}`);
            } catch {
                return false;
            }
        }

        if (isCapacitor && parent.path) {
            const { Filesystem, Directory } = await import('@capacitor/filesystem');
            try {
                await Filesystem.stat({
                    path: `${parent.path}/${name}`,
                    directory: Directory.Documents
                });
                return true;
            } catch {
                return false;
            }
        }

        if (parent.rawHandle) {
            try {
                await parent.rawHandle.getFileHandle(name, { create: false });
                return true;
            } catch {
                try {
                    await parent.rawHandle.getDirectoryHandle(name, { create: false });
                    return true;
                } catch {
                    return false;
                }
            }
        }

        return false;
    }

    /**
     * Returns a non-colliding filename inside `parent` (e.g. `Untitled Note 2.md`)
     * so creating a new note never overwrites an existing file on disk.
     */
    async getUniqueFileName(parent: FileSystemDirectoryHandle, desiredName: string): Promise<string> {
        if (!(await this.entryExists(parent, desiredName))) {
            return desiredName;
        }
        const dotIdx = desiredName.lastIndexOf('.');
        const base = dotIdx > 0 ? desiredName.slice(0, dotIdx) : desiredName;
        const ext = dotIdx > 0 ? desiredName.slice(dotIdx) : '';

        for (let counter = 2; counter < 500; counter++) {
            const candidate = `${base} ${counter}${ext}`;
            if (!(await this.entryExists(parent, candidate))) {
                return candidate;
            }
        }
        return `${base} ${Date.now()}${ext}`;
    }

    /**
     * Reads entries from a directory handle.
     */
    async readDirectory(handle: FileSystemDirectoryHandle): Promise<FileSystemHandle[]> {
        if (checkIsTauri() && handle.path) {
            const { readDir } = await import('@tauri-apps/plugin-fs');
            const entries = await readDir(handle.path);
            return entries
                .filter(entry => !shouldIgnoreEntry(entry.name))
                .map(entry => ({
                    kind: entry.isDirectory ? 'directory' : 'file',
                    name: entry.name,
                    path: `${handle.path}/${entry.name}`
                }));
        }

        if (isCapacitor && handle.path) {
            const { Filesystem, Directory } = await import('@capacitor/filesystem');
            const res = await Filesystem.readdir({
                path: handle.path,
                directory: Directory.Documents
            });
            return res.files
                .filter(file => !shouldIgnoreEntry(file.name))
                .map(file => ({
                    kind: file.type === 'directory' ? 'directory' : 'file',
                    name: file.name,
                    path: `${handle.path}/${file.name}`
                }));
        }

        if (handle.rawHandle) {
            const entries: FileSystemHandle[] = [];
            for await (const entry of handle.rawHandle.values()) {
                if (shouldIgnoreEntry(entry.name)) continue;
                entries.push({
                    kind: entry.kind,
                    name: entry.name,
                    rawHandle: entry
                });
            }
            return entries;
        }

        return [];
    }

    /**
     * Reads the content of a file.
     */
    async readFile(handle: FileSystemFileHandle, binary: boolean = false): Promise<string | Blob> {
        if (checkIsTauri() && handle.path) {
            const { readFile } = await import('@tauri-apps/plugin-fs');
            const data = await readFile(handle.path);
            const mime = getMimeTypeFromName(handle.name || handle.path);
            return binary ? new Blob([data], { type: mime }) : new TextDecoder().decode(data);
        }

        if (isCapacitor && handle.path) {
            const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
            const res = await Filesystem.readFile({
                path: handle.path,
                directory: Directory.Documents,
                encoding: binary ? undefined : Encoding.UTF8
            });
            if (binary) {
                const byteCharacters = atob(res.data as string);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const mime = getMimeTypeFromName(handle.name || handle.path);
                return new Blob([byteArray], { type: mime });
            }
            return res.data as string;
        }

        if (handle.rawHandle) {
            const file = await handle.rawHandle.getFile();
            return binary ? file : await file.text();
        }

        throw new Error('Invalid file handle');
    }

    /**
     * Gets a file handle by name from a parent directory.
     */
    async getFileHandle(parent: FileSystemDirectoryHandle, name: string): Promise<FileSystemFileHandle> {
        if ((checkIsTauri() || isCapacitor) && parent.path) {
            return { kind: 'file', name, path: `${parent.path}/${name}` };
        }
        if (parent.rawHandle) {
            const handle = await parent.rawHandle.getFileHandle(name);
            return { kind: 'file', name, rawHandle: handle };
        }
        throw new Error('Invalid parent handle');
    }

    /**
     * Gets a directory handle by name from a parent directory.
     */
    async getDirectoryHandle(parent: FileSystemDirectoryHandle, name: string): Promise<FileSystemDirectoryHandle> {
        if ((checkIsTauri() || isCapacitor) && parent.path) {
            return { kind: 'directory', name, path: `${parent.path}/${name}` };
        }
        if (parent.rawHandle) {
            const handle = await parent.rawHandle.getDirectoryHandle(name);
            return { kind: 'directory', name, rawHandle: handle };
        }
        throw new Error('Invalid parent handle');
    }

    /**
     * Gets file metadata (like lastModified).
     */
    async getMetadata(handle: FileSystemFileHandle): Promise<{ lastModified: number; size: number }> {
        if (checkIsTauri() && handle.path) {
            const { stat } = await import('@tauri-apps/plugin-fs');
            const stats = await stat(handle.path);
            return {
                lastModified: stats.mtime ? new Date(stats.mtime).getTime() : Date.now(),
                size: stats.size
            };
        }

        if (isCapacitor && handle.path) {
            const { Filesystem, Directory } = await import('@capacitor/filesystem');
            const stats = await Filesystem.stat({
                path: handle.path,
                directory: Directory.Documents
            });
            return {
                lastModified: stats.mtime ? new Date(stats.mtime).getTime() : stats.ctime ? new Date(stats.ctime).getTime() : Date.now(),
                size: stats.size
            };
        }

        if (handle.rawHandle) {
            const file = await handle.rawHandle.getFile();
            return {
                lastModified: file.lastModified,
                size: file.size
            };
        }

        throw new Error('Invalid file handle');
    }

    /**
     * Writes content to a file.
     */
    async writeFile(handle: FileSystemFileHandle, content: string | Blob): Promise<void> {
        if (checkIsTauri() && handle.path) {
            if (typeof content === 'string') {
                const { writeTextFile } = await import('@tauri-apps/plugin-fs');
                await writeTextFile(handle.path, content);
            } else {
                const { writeFile } = await import('@tauri-apps/plugin-fs');
                const arrayBuffer = await content.arrayBuffer();
                await writeFile(handle.path, new Uint8Array(arrayBuffer));
            }
            return;
        }

        if (isCapacitor && handle.path) {
            const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
            let dataToSave: string;
            if (typeof content === 'string') {
                dataToSave = content;
            } else {
                const reader = new FileReader();
                dataToSave = await new Promise((resolve) => {
                    reader.onloadend = () => {
                        const base64data = (reader.result as string).split(',')[1];
                        resolve(base64data);
                    };
                    reader.readAsDataURL(content);
                });
            }
            await Filesystem.writeFile({
                path: handle.path,
                directory: Directory.Documents,
                data: dataToSave,
                encoding: typeof content === 'string' ? Encoding.UTF8 : undefined
            });
            return;
        }

        if (handle.rawHandle) {
            const writable = await handle.rawHandle.createWritable();
            await writable.write(content);
            await writable.close();
            return;
        }

        throw new Error('Invalid file handle');
    }

    /**
     * Creates a new file in a directory.
     */
    async createFile(parent: FileSystemDirectoryHandle, name: string, content: string | Blob): Promise<FileSystemFileHandle> {
        if ((checkIsTauri() || isCapacitor) && parent.path) {
            const path = `${parent.path}/${name}`;
            await this.writeFile({ kind: 'file', name, path }, content);
            return { kind: 'file', name, path };
        }

        if (parent.rawHandle) {
            const handle = await parent.rawHandle.getFileHandle(name, { create: true });
            const fileHandle: FileSystemFileHandle = { kind: 'file', name, rawHandle: handle };
            await this.writeFile(fileHandle, content);
            return fileHandle;
        }

        throw new Error('Invalid parent handle');
    }

    /**
     * Creates a new directory in a parent directory.
     */
    async createDirectory(parent: FileSystemDirectoryHandle, name: string): Promise<FileSystemDirectoryHandle> {
        if (checkIsTauri() && parent.path) {
            const path = `${parent.path}/${name}`;
            const { mkdir } = await import('@tauri-apps/plugin-fs');
            try {
                await mkdir(path);
            } catch {
                // Ignore if it already exists
            }
            return { kind: 'directory', name, path };
        }

        if (isCapacitor && parent.path) {
            const path = `${parent.path}/${name}`;
            const { Filesystem, Directory } = await import('@capacitor/filesystem');
            try {
                await Filesystem.mkdir({
                    path,
                    directory: Directory.Documents,
                    recursive: true
                });
            } catch {
                // Ignore if it already exists
            }
            return { kind: 'directory', name, path };
        }

        if (parent.rawHandle) {
            const handle = await parent.rawHandle.getDirectoryHandle(name, { create: true });
            return { kind: 'directory', name, rawHandle: handle };
        }

        throw new Error('Invalid parent handle');
    }

    /**
     * Deletes an entry from a directory.
     */
    async deleteEntry(parent: FileSystemDirectoryHandle, name: string): Promise<void> {
        if (checkIsTauri() && parent.path) {
            const { remove } = await import('@tauri-apps/plugin-fs');
            await remove(`${parent.path}/${name}`, { recursive: true });
            return;
        }

        if (isCapacitor && parent.path) {
            const path = `${parent.path}/${name}`;
            const { Filesystem, Directory } = await import('@capacitor/filesystem');
            try {
                await Filesystem.deleteFile({
                    path,
                    directory: Directory.Documents
                });
            } catch {
                await Filesystem.rmdir({
                    path,
                    directory: Directory.Documents,
                    recursive: true
                });
            }
            return;
        }

        if (parent.rawHandle) {
            await parent.rawHandle.removeEntry(name, { recursive: true });
            return;
        }

        throw new Error('Invalid parent handle');
    }

    /**
     * Recursively copies all files and subdirectories from `srcRawDir` into `destRawDir` (Browser File System Access API).
     */
    private async copyRawDirectoryContents(srcRawDir: any, destRawDir: any): Promise<void> {
        for await (const entry of srcRawDir.values()) {
            if (entry.kind === 'file') {
                const file = await entry.getFile();
                const newFileHandle = await destRawDir.getFileHandle(entry.name, { create: true });
                const writable = await newFileHandle.createWritable();
                await writable.write(file);
                await writable.close();
            } else if (entry.kind === 'directory') {
                const subDest = await destRawDir.getDirectoryHandle(entry.name, { create: true });
                await this.copyRawDirectoryContents(entry, subDest);
            }
        }
    }

    /**
     * Renames a file or directory and returns the updated FileSystemHandle.
     * Supports native rename in Tauri/Capacitor, `FileSystemFileHandle.move()` in Chromium,
     * and safe copy-and-remove fallback for web directories & browsers without `.move()`.
     */
    async renameEntry(
        handle: FileSystemHandle,
        newName: string,
        parentHandle?: FileSystemDirectoryHandle
    ): Promise<FileSystemHandle> {
        if (handle.name === newName) return handle;

        if (checkIsTauri() && handle.path) {
            const { rename } = await import('@tauri-apps/plugin-fs');
            const lastSlash = Math.max(handle.path.lastIndexOf('/'), handle.path.lastIndexOf('\\'));
            const parentPath = handle.path.substring(0, lastSlash);
            const newPath = `${parentPath}/${newName}`;
            await rename(handle.path, newPath);
            handle.path = newPath;
            handle.name = newName;
            return { ...handle, name: newName, path: newPath };
        }

        if (isCapacitor && handle.path) {
            const { Filesystem, Directory } = await import('@capacitor/filesystem');
            const lastSlash = Math.max(handle.path.lastIndexOf('/'), handle.path.lastIndexOf('\\'));
            const parentPath = lastSlash !== -1 ? handle.path.substring(0, lastSlash) : '';
            const toPath = parentPath ? `${parentPath}/${newName}` : newName;
            await Filesystem.rename({
                from: handle.path,
                to: toPath,
                directory: Directory.Documents
            });
            handle.path = toPath;
            handle.name = newName;
            return { ...handle, name: newName, path: toPath };
        }

        if (handle.rawHandle) {
            // Fast path: native FileSystemFileHandle.move() if supported by browser
            if (handle.kind === 'file' && typeof handle.rawHandle.move === 'function') {
                try {
                    await handle.rawHandle.move(newName);
                    handle.name = newName;
                    return { kind: 'file', name: newName, rawHandle: handle.rawHandle };
                } catch (moveErr) {
                    console.warn('[FileSystemService] rawHandle.move failed, falling back to copy+remove:', moveErr);
                }
            }

            // Universal Web fallback using parentHandle (works for both files AND directories in Chrome/Edge/Opera)
            if (parentHandle?.rawHandle) {
                const oldName = handle.name;
                if (handle.kind === 'file') {
                    const fileBlob = await handle.rawHandle.getFile();
                    const newRawFile = await parentHandle.rawHandle.getFileHandle(newName, { create: true });
                    const writable = await newRawFile.createWritable();
                    await writable.write(fileBlob);
                    await writable.close();
                    if (oldName !== newName) {
                        await parentHandle.rawHandle.removeEntry(oldName);
                    }
                    return { kind: 'file', name: newName, rawHandle: newRawFile };
                } else {
                    const newRawDir = await parentHandle.rawHandle.getDirectoryHandle(newName, { create: true });
                    await this.copyRawDirectoryContents(handle.rawHandle, newRawDir);
                    if (oldName !== newName) {
                        await parentHandle.rawHandle.removeEntry(oldName, { recursive: true });
                    }
                    return { kind: 'directory', name: newName, rawHandle: newRawDir };
                }
            }
        }

        throw new Error('Rename not supported or parent directory handle unavailable');
    }

    /**
     * Reads a directory recursively, skipping hidden dotfiles/system folders (`.assets`, `.git`, `node_modules`, etc.).
     */
    async readDirectoryRecursive(
        dirHandle: FileSystemDirectoryHandle,
        parentId: string | null = null
    ): Promise<{ handle: FileSystemHandle; parentId: string | null; id: string; kind: 'file' | 'directory'; name: string }[]> {
        let entries: { handle: FileSystemHandle; parentId: string | null; id: string; kind: 'file' | 'directory'; name: string }[] = [];

        if ((checkIsTauri() || isCapacitor) && dirHandle.path) {
            let rawEntries: FileSystemHandle[] = [];
            try {
                rawEntries = await this.readDirectory(dirHandle);
            } catch (err) {
                console.warn('[FileSystemService] Skipping unreadable directory:', dirHandle.path, err);
                return entries;
            }

            for (const entry of rawEntries) {
                if (shouldIgnoreEntry(entry.name)) continue;
                const id = parentId ? `${parentId}/${entry.name}` : entry.name;
                const kind = entry.kind;
                const path = entry.path!;
                const handle: FileSystemHandle = { kind, name: entry.name, path };

                entries.push({
                    handle,
                    parentId,
                    id,
                    kind,
                    name: entry.name
                });

                if (kind === 'directory') {
                    const subEntries = await this.readDirectoryRecursive(handle as FileSystemDirectoryHandle, id);
                    entries = [...entries, ...subEntries];
                }
            }
            return entries;
        }

        if (dirHandle.rawHandle) {
            try {
                for await (const entry of dirHandle.rawHandle.values()) {
                    if (shouldIgnoreEntry(entry.name)) continue;
                    const id = parentId ? `${parentId}/${entry.name}` : entry.name;
                    const kind = entry.kind;
                    const handle: FileSystemHandle = { kind, name: entry.name, rawHandle: entry };

                    entries.push({
                        handle,
                        parentId,
                        id,
                        kind,
                        name: entry.name
                    });

                    if (kind === 'directory') {
                        const subEntries = await this.readDirectoryRecursive(handle as FileSystemDirectoryHandle, id);
                        entries = [...entries, ...subEntries];
                    }
                }
            } catch (err) {
                console.warn('[FileSystemService] Error reading directory handle:', dirHandle.name, err);
                // Re-throw at root level if permission was revoked so callers know the handle is locked
                if (parentId === null) {
                    throw err;
                }
            }
        }

        return entries;
    }
}

export const fileSystem = new FileSystemService();
