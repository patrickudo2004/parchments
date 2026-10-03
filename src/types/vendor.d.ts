/**
 * Ambient type declarations for packages that either ship no types,
 * use the `typings` field instead of `types`, or have resolution issues
 * in certain build environments (e.g. Vercel CI).
 *
 * These are minimal stubs — just enough to satisfy TypeScript.
 * The real implementations come from node_modules at runtime.
 */

// ---------------------------------------------------------------------------
// html5-qrcode
// ---------------------------------------------------------------------------
declare module 'html5-qrcode' {
    export interface Html5QrcodeResult {
        decodedText: string;
        result: {
            text: string;
            format?: { format: number; formatName: string };
        };
    }

    export interface QrcodeSuccessCallback {
        (decodedText: string, result: Html5QrcodeResult): void;
    }

    export interface QrcodeErrorCallback {
        (errorMessage: string, error: unknown): void;
    }

    export interface Html5QrcodeScannerConfig {
        fps?: number;
        qrbox?: number | { width: number; height: number };
        aspectRatio?: number;
        disableFlip?: boolean;
        rememberLastUsedCamera?: boolean;
        supportedScanTypes?: number[];
        showTorchButtonIfSupported?: boolean;
        showZoomSliderIfSupported?: boolean;
    }

    export interface Html5QrcodeFullConfig {
        verbose?: boolean;
        experimentalFeatures?: { useBarCodeDetectorIfSupported?: boolean };
    }

    export class Html5Qrcode {
        constructor(elementId: string, config?: Html5QrcodeFullConfig | boolean);
        start(
            cameraIdOrConfig: string | { facingMode: string },
            config: Html5QrcodeScannerConfig,
            qrCodeSuccessCallback: QrcodeSuccessCallback,
            qrCodeErrorCallback?: QrcodeErrorCallback,
        ): Promise<void>;
        stop(): Promise<void>;
        clear(): void;
        getState(): number;
        static getCameras(): Promise<Array<{ id: string; label: string }>>;
    }

    export class Html5QrcodeScanner {
        constructor(
            elementId: string,
            config: Html5QrcodeScannerConfig,
            verbose?: boolean,
        );
        render(
            successCallback: QrcodeSuccessCallback,
            errorCallback?: QrcodeErrorCallback,
        ): void;
        clear(): Promise<void>;
    }

    export enum Html5QrcodeScanType {
        SCAN_TYPE_CAMERA = 0,
        SCAN_TYPE_FILE = 1,
    }
}

// ---------------------------------------------------------------------------
// y-websocket
// ---------------------------------------------------------------------------
declare module 'y-websocket' {
    import type * as Y from 'yjs';
    import type * as awareness from 'y-protocols/awareness';

    export interface WebsocketProviderOptions {
        connect?: boolean;
        awareness?: awareness.Awareness;
        params?: Record<string, string>;
        WebSocketPolyfill?: typeof WebSocket;
        resyncInterval?: number;
        maxBackoffTime?: number;
        disableBc?: boolean;
    }

    export class WebsocketProvider {
        doc: Y.Doc;
        awareness: awareness.Awareness;
        wsconnected: boolean;
        wsconnecting: boolean;
        bcconnected: boolean;
        synced: boolean;
        url: string;
        roomname: string;
        ws: WebSocket | null;

        constructor(
            serverUrl: string,
            roomname: string,
            doc: Y.Doc,
            options?: WebsocketProviderOptions,
        );

        connect(): void;
        disconnect(): void;
        destroy(): void;
        on(event: string, listener: (...args: any[]) => void): this;
        off(event: string, listener: (...args: any[]) => void): this;
        once(event: string, listener: (...args: any[]) => void): this;
        emit(event: string, ...args: any[]): boolean;
    }
}

// ---------------------------------------------------------------------------
// qrcode.react
// ---------------------------------------------------------------------------
declare module 'qrcode.react' {
    import * as React from 'react';

    export interface QRCodeProps extends React.SVGProps<SVGSVGElement> {
        value: string;
        size?: number;
        level?: 'L' | 'M' | 'Q' | 'H' | string;
        bgColor?: string;
        fgColor?: string;
        includeMargin?: boolean;
        marginSize?: number;
        title?: string;
        minVersion?: number;
        boostLevel?: boolean;
        imageSettings?: {
            src: string;
            height: number;
            width: number;
            excavate: boolean;
            x?: number;
            y?: number;
            crossOrigin?: string;
        };
    }

    export const QRCodeSVG: React.FC<QRCodeProps>;
    export const QRCodeCanvas: React.FC<any>;
}
