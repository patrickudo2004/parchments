import { useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { APP_VERSION, VERSION_INFO } from '@/lib/version';
import { Capacitor } from '@capacitor/core';

const REMOTE_VERSION_URLS = [
    'https://raw.githubusercontent.com/patrickudo2004/parchments/main/public/version.json',
    'https://raw.githubusercontent.com/patrickudo2004/parchments/main/version.json',
    'https://api.github.com/repos/patrickudo2004/parchments/releases/latest'
];

export const CURRENT_VERSION = APP_VERSION;

// Helper to compare semantic versions (basic version for beta tags)
export const compareVersions = (v1: string, v2: string) => {
    const parse = (version: string) => {
        const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-beta\.(\d+))?$/);
        if (!match) return [0, 0, 0, 0];
        return [
            Number(match[1]),
            Number(match[2]),
            Number(match[3]),
            match[4] ? Number(match[4]) : 9999
        ];
    };

    const parts1 = parse(v1);
    const parts2 = parse(v2);

    for (let i = 0; i < 4; i++) {
        if (parts1[i] > parts2[i]) return 1;
        if (parts1[i] < parts2[i]) return -1;
    }
    return 0;
};

export const fetchVersionInfo = async () => {
    const isNative = typeof window !== 'undefined' && (
        !!(window as any).__TAURI__ || 
        !!(window as any).__TAURI_INTERNALS__ || 
        Capacitor.isNativePlatform()
    );

    // In web browsers, checking local /version.json first is fine as it's served by the host
    // In native Desktop/Mobile, /version.json resolves to the internal package assets, so we query live GitHub
    const urls = isNative ? REMOTE_VERSION_URLS : ['/version.json', ...REMOTE_VERSION_URLS];

    for (const url of urls) {
        try {
            const response = await fetch(url, { cache: 'no-store' });
            if (response.ok) {
                const data = await response.json();
                // Handle GitHub Releases API format if hit directly
                if (data.tag_name && !data.latest) {
                    const cleanTag = data.tag_name.replace(/^v/, '');
                    return {
                        latest: cleanTag,
                        min_required: CURRENT_VERSION,
                        download_url: data.html_url || 'https://github.com/patrickudo2004/parchments/releases',
                        message: data.body || 'A new release is available.'
                    };
                }
                return data;
            }
        } catch {
            // Try next source
        }
    }

    return VERSION_INFO;
};

export const checkAppVersion = async (manual = false): Promise<void> => {
    const { setVersionStatus, showToast } = useUIStore.getState();
    const isTauri = typeof window !== 'undefined' && (!!(window as any).__TAURI__ || !!(window as any).__TAURI_INTERNALS__);

    if (manual) {
        showToast('Checking for updates...', 'info');
    }

    // In desktop Tauri, try native plugin updater (runs both on launch and manually)
    if (isTauri) {
        try {
            const { check } = await import('@tauri-apps/plugin-updater');
            const update = await check();
            if (update) {
                setVersionStatus('outdated', {
                    latest: update.version,
                    minRequired: CURRENT_VERSION,
                    downloadUrl: 'https://github.com/patrickudo2004/parchments/releases',
                    message: update.body || 'A new desktop update is available.'
                });
                if (manual) {
                    showToast(`Parchments v${update.version} is available!`, 'info');
                }
                return;
            }
        } catch (tauriErr) {
            console.warn('[Version Check] Tauri updater check fallback to live metadata:', tauriErr);
        }
    }

    try {
        const data = await fetchVersionInfo();
        const { latest, min_required, download_url, message } = data;

        // 1. Check for Obsolescence (Lock)
        if (min_required && compareVersions(CURRENT_VERSION, min_required) === -1) {
            console.log(`[Version Check] App is obsolete: ${CURRENT_VERSION} < ${min_required}`);
            setVersionStatus('obsolete', { latest, minRequired: min_required, downloadUrl: download_url, message });
            if (manual) showToast('This version has expired. Please update.', 'error');
            return;
        }

        // 2. Check for Updates (Nag)
        if (latest && compareVersions(CURRENT_VERSION, latest) === -1) {
            console.log(`[Version Check] New version available: ${latest}`);
            setVersionStatus('outdated', { latest, minRequired: min_required, downloadUrl: download_url, message });
            if (manual) showToast(`Parchments v${latest} is available!`, 'info');
            return;
        }

        // 3. Up to date
        setVersionStatus('up-to-date', null);
        if (manual) {
            showToast(`Parchments is up to date (v${CURRENT_VERSION})`, 'success');
        }
    } catch (err) {
        console.error('[Version Check] Failed:', err);
        setVersionStatus('up-to-date', null);
        if (manual) {
            showToast('Unable to reach update server. Check your connection.', 'info');
        }
    }
};

export const useVersionCheck = () => {
    useEffect(() => {
        // Run silent check 3 seconds after mount so app boot remains instantaneous
        const bootTimer = setTimeout(() => {
            checkAppVersion(false);
        }, 3000);

        // Check periodically every 4 hours if the app stays open
        const interval = setInterval(() => {
            checkAppVersion(false);
        }, 4 * 60 * 60 * 1000);

        return () => {
            clearTimeout(bootTimer);
            clearInterval(interval);
        };
    }, []);
};
