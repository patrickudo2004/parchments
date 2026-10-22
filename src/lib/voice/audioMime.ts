export interface AudioMimeInfo {
    mimeType: string;
    extension: string;
}

/**
 * Detects the highest quality supported audio recording MIME type across
 * Chromium, WebKit (Safari / iOS), Firefox, and Tauri / WebView2 runtimes.
 */
export function getSupportedAudioMimeType(): AudioMimeInfo {
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
        return { mimeType: 'audio/webm', extension: 'webm' };
    }

    const candidateTypes: AudioMimeInfo[] = [
        { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
        { mimeType: 'audio/webm', extension: 'webm' },
        { mimeType: 'audio/mp4', extension: 'mp4' },
        { mimeType: 'audio/aac', extension: 'aac' },
        { mimeType: 'audio/ogg;codecs=opus', extension: 'ogg' },
        { mimeType: 'audio/wav', extension: 'wav' },
    ];

    for (const candidate of candidateTypes) {
        if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(candidate.mimeType)) {
            return candidate;
        }
    }

    return { mimeType: '', extension: 'webm' };
}
