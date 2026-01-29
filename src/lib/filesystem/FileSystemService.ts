// Check if we are running in Tauri
const isTauri = !!(window as any).__TAURI_INTERNALS__;

export interface FileSystemHandle {
    kind: 'file' | 'directory';
    name: string;
    path?: string; // Used for Tauri
}

export interface FileSystemFileHandle extends FileSystemHandle {
    kind: 'file';
    getFile(): Promise<File>;
    createWritable(): Promise<FileSystemWritableFileStream>;
}

export interface FileSystemDirectoryHandle extends FileSystemHandle {
    kind: 'directory';
    values(): AsyncIterableIterator<FileSystemHandle>;
    getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
}

export interface FileSystemWritableFileStream extends WritableStream {
    write(data: string | BufferSource | Blob): Promise<void>;
    seek(position: number): Promise<void>;
    truncate(size: number): Promise<void>;
    close(): Promise<void>;
}

export class FileSystemService {
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
                    path,
                    // Mocking expected browser handle methods for Tauri
                    values: async function* () {
                        const { readDir } = await import('@tauri-apps/plugin-fs');
                        const entries = await readDir(path);
                        for (const entry of entries) {
                            yield {
                                kind: entry.isDirectory ? 'directory' : 'file',
                                name: entry.name,
                                path: `${path}/${entry.name}`
                            } as any;
                        }
                    },
                    getDirectoryHandle: async (newName: string) => ({ kind: 'directory', name: newName, path: `${path}/${newName}` } as any),
                    getFileHandle: async (newName: string) => ({ kind: 'file', name: newName, path: `${path}/${newName}` } as any),
                } as any;
            }
            throw new Error('No directory selected');
        }

        // Browser fallback
        // @ts-ignore
        const handle = await window.showDirectoryPicker({
            mode: 'readwrite'
        });
        return handle;
    }

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

        const entries: FileSystemHandle[] = [];
        // @ts-ignore
        for await (const entry of handle.values()) {
            entries.push(entry);
        }
        return entries;
    }

    async readFile(handle: FileSystemFileHandle): Promise<string> {
        if (isTauri && (handle as any).path) {
            const { readTextFile } = await import('@tauri-apps/plugin-fs');
            return await readTextFile((handle as any).path);
        }

        const file = await handle.getFile();
        return await file.text();
    }

    async writeFile(handle: FileSystemFileHandle, content: string | Blob): Promise<void> {
        if (isTauri && (handle as any).path) {
            const { writeTextFile } = await import('@tauri-apps/plugin-fs');
            const textContent = typeof content === 'string' ? content : await (content as Blob).text();
            await writeTextFile((handle as any).path, textContent);
            return;
        }

        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
    }

    async createFile(parent: FileSystemDirectoryHandle, name: string, content: string | Blob): Promise<FileSystemFileHandle> {
        if (isTauri && parent.path) {
            const path = `${parent.path}/${name}`;
            const { writeTextFile } = await import('@tauri-apps/plugin-fs');
            const textContent = typeof content === 'string' ? content : await (content as Blob).text();
            await writeTextFile(path, textContent);
            return { kind: 'file', name, path } as any;
        }

        const handle = await parent.getFileHandle(name, { create: true });
        await this.writeFile(handle, content);
        return handle;
    }

    async createDirectory(parent: FileSystemDirectoryHandle, name: string): Promise<FileSystemDirectoryHandle> {
        if (isTauri && parent.path) {
            const path = `${parent.path}/${name}`;
            const { mkdir } = await import('@tauri-apps/plugin-fs');
            await mkdir(path);
            return { kind: 'directory', name, path } as any;
        }

        return await parent.getDirectoryHandle(name, { create: true });
    }

    async deleteEntry(parent: FileSystemDirectoryHandle, name: string): Promise<void> {
        if (isTauri && parent.path) {
            const { remove } = await import('@tauri-apps/plugin-fs');
            await remove(`${parent.path}/${name}`, { recursive: true });
            return;
        }

        // @ts-ignore
        return await parent.removeEntry(name, { recursive: true });
    }

    async renameEntry(handle: FileSystemHandle, newName: string): Promise<void> {
        if (isTauri && handle.path) {
            const { rename } = await import('@tauri-apps/plugin-fs');
            const lastSlash = Math.max(handle.path.lastIndexOf('/'), handle.path.lastIndexOf('\\'));
            const parentPath = handle.path.substring(0, lastSlash);
            await rename(handle.path, `${parentPath}/${newName}`);
            return;
        }

        // @ts-ignore - .move() is supported in modern Chromium
        if (typeof handle.move === 'function') {
            // @ts-ignore
            await handle.move(newName);
        } else {
            throw new Error('Rename not supported in this browser version');
        }
    }

    async readDirectoryRecursive(dirHandle: FileSystemDirectoryHandle, parentId: string | null = null): Promise<{ handle: FileSystemHandle; parentId: string | null; id: string; kind: 'file' | 'directory'; name: string }[]> {
        let entries: { handle: FileSystemHandle; parentId: string | null; id: string; kind: 'file' | 'directory'; name: string }[] = [];

        if (isTauri && dirHandle.path) {
            const { readDir } = await import('@tauri-apps/plugin-fs');
            const tauriEntries = await readDir(dirHandle.path);

            for (const entry of tauriEntries) {
                const id = parentId ? `${parentId}/${entry.name}` : entry.name;
                const kind = entry.isDirectory ? 'directory' : 'file';
                const path = `${dirHandle.path}/${entry.name}`;
                const handle = { kind, name: entry.name, path };

                entries.push({
                    handle: handle as any,
                    parentId: parentId,
                    id: id,
                    kind,
                    name: entry.name
                });

                if (kind === 'directory') {
                    const subEntries = await this.readDirectoryRecursive(handle as any, id);
                    entries = [...entries, ...subEntries];
                }
            }
            return entries;
        }

        // @ts-ignore
        for await (const entry of dirHandle.values()) {
            const id = parentId ? `${parentId}/${entry.name}` : entry.name;
            const kind = entry.kind;

            entries.push({
                handle: entry,
                parentId: parentId,
                id: id,
                kind: kind,
                name: entry.name
            });

            if (kind === 'directory') {
                const subEntries = await this.readDirectoryRecursive(entry as FileSystemDirectoryHandle, id);
                entries = [...entries, ...subEntries];
            }
        }
        return entries;
    }
}

export const fileSystem = new FileSystemService();
