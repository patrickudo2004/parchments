import { useEffect, useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import packageJson from '../../package.json';

const VERSION_URL = 'https://raw.githubusercontent.com/patrickudo2004/parchments/main/version.json';
const CURRENT_VERSION = packageJson.version; // e.g., "0.1.0"

// Helper to compare semantic versions (basic version for beta tags)
const compareVersions = (v1: string, v2: string) => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
        if (parts1[i] > parts2[i]) return 1;
        if (parts1[i] < parts2[i]) return -1;
    }
    return 0;
};

export const useVersionCheck = () => {
    const { setVersionStatus } = useUIStore();

    const checkVersion = useCallback(async () => {
        try {
            const response = await fetch(VERSION_URL);
            if (!response.ok) throw new Error('Failed to fetch version info');

            const data = await response.json();
            const { latest, min_required, download_url, message } = data;

            // 1. Check for Obsolescence (Lock)
            if (min_required && compareVersions(CURRENT_VERSION, min_required) === -1) {
                console.log(`[Version Check] App is obsolete: ${CURRENT_VERSION} < ${min_required}`);
                setVersionStatus('obsolete', { latest, minRequired: min_required, downloadUrl: download_url, message });
                return;
            }

            // 2. Check for Updates (Nag)
            if (latest && compareVersions(CURRENT_VERSION, latest) === -1) {
                console.log(`[Version Check] New version available: ${latest}`);
                setVersionStatus('outdated', { latest, minRequired: min_required, downloadUrl: download_url, message });
                return;
            }

            // 3. Up to date
            setVersionStatus('up-to-date', null);
        } catch (error) {
            console.error('[Version Check] Error checking version:', error);
            // Default to up-to-date if offline/failed to avoid blocking
            setVersionStatus('up-to-date', null);
        }
    }, [setVersionStatus]);

    useEffect(() => {
        // Run check on mount
        checkVersion();

        // Optionally check every 6 hours if the app stays open
        const interval = setInterval(checkVersion, 6 * 60 * 60 * 1000);
        return () => clearInterval(interval);
    }, [checkVersion]);
};
