import { useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { APP_VERSION, VERSION_INFO } from '@/lib/version';

export const CURRENT_VERSION = APP_VERSION;

/**
 * Robust semantic version comparison with support for 'v' prefix and prerelease tags
 */
export const compareVersions = (v1: string, v2: string): number => {
    const clean = (v: string) => v.trim().replace(/^v/i, '');
    const parse = (version: string) => {
        const match = clean(version).match(/^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z]+)(?:\.(\d+))?)?$/);
        if (!match) {
            const parts = clean(version).split('.').map(n => parseInt(n, 10) || 0);
            while (parts.length < 3) parts.push(0);
            return [parts[0], parts[1], parts[2], 9999];
        }
        const major = Number(match[1]);
        const minor = Number(match[2]);
        const patch = Number(match[3]);
        const prereleaseNum = match[5] ? Number(match[5]) : (match[4] ? 0 : 9999);
        return [major, minor, patch, prereleaseNum];
    };

    const parts1 = parse(v1);
    const parts2 = parse(v2);

    for (let i = 0; i < 4; i++) {
        if (parts1[i] > parts2[i]) return 1;
        if (parts1[i] < parts2[i]) return -1;
    }
    return 0;
};

/**
 * Resolves direct platform download asset URL from GitHub Release data
 */
function resolveDownloadUrl(releaseData: any): string {
    if (!releaseData.assets || !Array.isArray(releaseData.assets) || releaseData.assets.length === 0) {
        return releaseData.html_url || 'https://github.com/patrickudo2004/parchments/releases/latest';
    }

    const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
    const isWindows = ua.includes('win');
    const isMac = ua.includes('mac');
    const isAndroid = ua.includes('android');
    const isLinux = ua.includes('linux') && !isAndroid;

    let matchingAsset: any = null;
    if (isWindows) {
        matchingAsset = releaseData.assets.find((a: any) => a.name.endsWith('.exe') || a.name.endsWith('.msi'));
    } else if (isMac) {
        matchingAsset = releaseData.assets.find((a: any) => a.name.endsWith('.dmg'));
    } else if (isAndroid) {
        matchingAsset = releaseData.assets.find((a: any) => a.name.endsWith('.apk'));
    } else if (isLinux) {
        matchingAsset = releaseData.assets.find((a: any) => a.name.endsWith('.AppImage') || a.name.endsWith('.deb'));
    }

    return matchingAsset ? matchingAsset.browser_download_url : (releaseData.html_url || 'https://github.com/patrickudo2004/parchments/releases/latest');
}

export const fetchVersionInfo = async () => {
    // 1. Primary Source: Live GitHub Releases list.
    // NOTE: `/releases/latest` silently skips pre-releases, so a beta/pre-release tag was never
    // detected as an update. We list recent published releases and pick the highest semver instead.
    try {
        const ghResponse = await fetch('https://api.github.com/repos/patrickudo2004/parchments/releases?per_page=15', {
            cache: 'no-store',
            headers: {
                'Accept': 'application/vnd.github+json'
            }
        });
        if (ghResponse.ok) {
            const releases = await ghResponse.json();
            if (Array.isArray(releases)) {
                const published = releases.filter((r: any) => r && !r.draft && typeof r.tag_name === 'string');
                const newest = published.reduce((best: any, r: any) => {
                    if (!best) return r;
                    return compareVersions(r.tag_name, best.tag_name) > 0 ? r : best;
                }, null);
                if (newest) {
                    const cleanTag = newest.tag_name.replace(/^v/i, '');
                    return {
                        latest: cleanTag,
                        min_required: VERSION_INFO.min_required,
                        download_url: resolveDownloadUrl(newest),
                        message: newest.body ? newest.body.slice(0, 150).replace(/[#*_`]/g, '') : 'A new release is available.'
                    };
                }
            }
        }
    } catch (ghErr) {
        console.warn('[Version Check] GitHub Releases API unavailable, trying fallback manifest:', ghErr);
    }

    // 2. Secondary Source: Raw GitHub Version Manifest with Cache-Buster
    try {
        const rawResponse = await fetch(`https://raw.githubusercontent.com/patrickudo2004/parchments/main/public/version.json?t=${Date.now()}`, {
            cache: 'no-store'
        });
        if (rawResponse.ok) {
            return await rawResponse.json();
        }
    } catch (rawErr) {
        console.warn('[Version Check] Raw manifest fallback unavailable:', rawErr);
    }

    // 3. Tertiary Source: Local bundle version
    try {
        const localResponse = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (localResponse.ok) {
            return await localResponse.json();
        }
    } catch {}

    throw new Error('Unable to connect to update servers. Please check your network connection.');
};

export const checkAppVersion = async (manual = false): Promise<void> => {
    const { setVersionStatus, showToast } = useUIStore.getState();

    if (manual) {
        showToast('Checking for updates...', 'info');
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
            console.log(`[Version Check] New version available: ${latest} (current: ${CURRENT_VERSION})`);
            setVersionStatus('outdated', { latest, minRequired: min_required, downloadUrl: download_url, message });
            if (manual) showToast(`Parchments v${latest} is available!`, 'info');
            return;
        }

        // 3. Up to date
        setVersionStatus('up-to-date', null);
        if (manual) {
            showToast(`Parchments is up to date (v${CURRENT_VERSION})`, 'success');
        }
    } catch (err: any) {
        console.warn('[Version Check] Update check encountered an error:', err);
        setVersionStatus('up-to-date', null);
        if (manual) {
            showToast(err.message || 'Unable to reach update servers. Check your connection.', 'info');
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
