/**
 * runtimeBridge.ts
 * Centralized, isomorphic runtime detection and safe IPC bridge between
 * React presentation layer and native Tauri (Rust) / Capacitor / Web layers.
 */

import { Capacitor } from '@capacitor/core';

export type PlatformType = 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'web';

/**
 * Universal runtime environment checks
 */
export const isTauri = typeof window !== 'undefined' &&
    Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__);

export const isCapacitor = Capacitor.isNativePlatform();

export const isWeb = !isTauri && !isCapacitor;

/**
 * Detects the specific OS platform
 */
export function getPlatform(): PlatformType {
    if (typeof window === 'undefined') return 'web';

    const ua = navigator.userAgent.toLowerCase();
    if (Capacitor.isNativePlatform()) {
        return Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
    }

    if (ua.includes('win')) return 'windows';
    if (ua.includes('mac')) return 'macos';
    if (ua.includes('android')) return 'android';
    if (ua.includes('linux')) return 'linux';
    return 'web';
}

/**
 * Safely invokes a Tauri Rust command with automatic fallback handling.
 * Returns null if running in web/mobile or if command is not implemented.
 */
export async function safeInvoke<T>(command: string, args: Record<string, any> = {}): Promise<T | null> {
    if (!isTauri) return null;

    try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<T>(command, args);
    } catch (err: any) {
        // If command is unknown or rejected, log warning and return null for transparent fallback
        console.warn(`[RuntimeBridge] Safe invoke failed for '${command}':`, err?.message || err);
        return null;
    }
}

/**
 * Opens an external URL. WebViews ignore target="_blank", so on desktop we route through a
 * Rust command that launches the system browser (allow-listed to Parchments release URLs).
 */
export async function openExternalUrl(url: string): Promise<void> {
    if (isTauri) {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('open_external_url', { url });
            return;
        } catch (err: any) {
            console.warn('[RuntimeBridge] open_external_url failed, falling back to window.open:', err?.message || err);
        }
    }
    window.open(url, '_blank', 'noopener,noreferrer');
}

