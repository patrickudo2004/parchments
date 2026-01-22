export interface FileSystemHandle {
    kind: 'file' | 'directory';
    name: string;
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
    private directoryHandle: FileSystemDirectoryHandle | null = null;

    async openDirectory(): Promise<FileSystemDirectoryHandle> {
        // @ts-ignore - API might not be in all TS/window definitions by default
        const handle = await window.showDirectoryPicker({
            mode: 'readwrite'
        });
        this.directoryHandle = handle;
        return handle;
    }

    async readDirectory(handle: FileSystemDirectoryHandle): Promise<FileSystemHandle[]> {
        const entries: FileSystemHandle[] = [];
        // @ts-ignore
        for await (const entry of handle.values()) {
            entries.push(entry);
        }
        return entries;
    }

    async readFile(handle: FileSystemFileHandle): Promise<string> {
        const file = await handle.getFile();
        return await file.text();
    }

    async writeFile(handle: FileSystemFileHandle, content: string | Blob): Promise<void> {
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
    }

    async createFile(parent: FileSystemDirectoryHandle, name: string, content: string | Blob): Promise<FileSystemFileHandle> {
        const handle = await parent.getFileHandle(name, { create: true });
        await this.writeFile(handle, content);
        return handle;
    }

    async createDirectory(parent: FileSystemDirectoryHandle, name: string): Promise<FileSystemDirectoryHandle> {
        return await parent.getDirectoryHandle(name, { create: true });
    }
}

export const fileSystem = new FileSystemService();
