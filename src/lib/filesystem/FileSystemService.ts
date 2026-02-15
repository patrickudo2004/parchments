// Check if we are running in Tauri
export const isTauri = await (async () => {
    try {
        // @ts-ignore
        return !!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__;
    } catch {
        return false;
    }
})();

export interface FileSystemHandle {
    kind: 'file' | 'directory';
    name: string;
    path?: string; // Used for Native (Tauri)
    rawHandle?: any; // Used for Browser (showDirectoryPicker)
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
        if (isTauri) {
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
            throw new Error('No directory selected');
        }

        // Browser fallback
        // @ts-ignore
        const handle = await window.showDirectoryPicker({
            mode: 'readwrite'
        });
        return {
            kind: 'directory',
            name: handle.name,
            rawHandle: handle
        };
    }

    /**
     * Reads entries from a directory handle.
     */
    async readDirectory(handle: FileSystemDirectoryHandle): Promise<FileSystemHandle[]> {
        if (isTauri && handle.path) {
            const { readDir } = await import('@tauri-apps/plugin-fs');
            const entries = await readDir(handle.path);
            return entries.map(entry => ({
                kind: entry.isDirectory ? 'directory' : 'file',
                name: entry.name,
                path: `${handle.path}/${entry.name}`
            }));
        }

        if (handle.rawHandle) {
            const entries: FileSystemHandle[] = [];
            for await (const entry of handle.rawHandle.values()) {
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
        if (isTauri && handle.path) {
            const { readFile } = await import('@tauri-apps/plugin-fs');
            const data = await readFile(handle.path);
            return binary ? new Blob([data]) : new TextDecoder().decode(data);
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
        if (isTauri && parent.path) {
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
        if (isTauri && parent.path) {
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
        if (isTauri && handle.path) {
            const { stat } = await import('@tauri-apps/plugin-fs');
            const stats = await stat(handle.path);
            return {
                lastModified: stats.mtime ? new Date(stats.mtime).getTime() : Date.now(),
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
        if (isTauri && handle.path) {
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
        if (isTauri && parent.path) {
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
        if (isTauri && parent.path) {
            const path = `${parent.path}/${name}`;
            const { mkdir } = await import('@tauri-apps/plugin-fs');
            try {
                await mkdir(path);
            } catch (e) {
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
        if (isTauri && parent.path) {
            const { remove } = await import('@tauri-apps/plugin-fs');
            await remove(`${parent.path}/${name}`, { recursive: true });
            return;
        }

        if (parent.rawHandle) {
            await parent.rawHandle.removeEntry(name, { recursive: true });
            return;
        }

        throw new Error('Invalid parent handle');
    }

    /**
     * Renames an entry.
     */
    async renameEntry(handle: FileSystemHandle, newName: string): Promise<void> {
        if (isTauri && handle.path) {
            const { rename } = await import('@tauri-apps/plugin-fs');
            const lastSlash = Math.max(handle.path.lastIndexOf('/'), handle.path.lastIndexOf('\\'));
            const parentPath = handle.path.substring(0, lastSlash);
            await rename(handle.path, `${parentPath}/${newName}`);
            return;
        }

        if (handle.rawHandle && typeof handle.rawHandle.move === 'function') {
            await handle.rawHandle.move(newName);
            return;
        }

        throw new Error('Rename not supported or invalid handle');
    }

    /**
     * Reads a directory recursively.
     */
    async readDirectoryRecursive(dirHandle: FileSystemDirectoryHandle, parentId: string | null = null): Promise<{ handle: FileSystemHandle; parentId: string | null; id: string; kind: 'file' | 'directory'; name: string }[]> {
        let entries: { handle: FileSystemHandle; parentId: string | null; id: string; kind: 'file' | 'directory'; name: string }[] = [];

        if (isTauri && dirHandle.path) {
            const { readDir } = await import('@tauri-apps/plugin-fs');
            const tauriEntries = await readDir(dirHandle.path);

            for (const entry of tauriEntries) {
                const id = parentId ? `${parentId}/${entry.name}` : entry.name;
                const kind = entry.isDirectory ? 'directory' : 'file';
                const path = `${dirHandle.path}/${entry.name}`;
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
            for await (const entry of dirHandle.rawHandle.values()) {
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
        }

        return entries;
    }
}

export const fileSystem = new FileSystemService();
