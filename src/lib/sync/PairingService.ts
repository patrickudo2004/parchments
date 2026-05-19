import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';

/**
 * PairingService establishes a temporary WebRTC tunnel using a 6-digit code.
 * It is used to quickly hand off complex sync room hashes from a host (desktop)
 * to a client (mobile) without requiring the user to copy-paste long URLs.
 */
export class PairingService {
    private static provider: WebrtcProvider | null = null;
    private static doc: Y.Doc | null = null;
    
    public static SIGNALING_SERVERS = [
        'wss://parchments-signaling.patrickudo2004.deno.net'
    ];

    /**
     * Starts a hosting session. Generates a 6-digit code and waits for a client.
     */
    static async startHostSession(
        hashes: string[], 
        hostDeviceName: string, 
        onClientAcknowledged: (clientDeviceName: string) => void
    ): Promise<{ code: string, destroy: () => void }> {
        this.destroySession();

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const roomName = `parchments-pairing-${code}`;
        
        this.doc = new Y.Doc();
        this.provider = new WebrtcProvider(roomName, this.doc, {
            signaling: this.SIGNALING_SERVERS
        });

        const pairingMap = this.doc.getMap('pairing');
        
        // Write the host's hashes and device name to the room
        pairingMap.set('host_hashes', hashes);
        pairingMap.set('host_device_name', hostDeviceName);

        // Listen for the client to acknowledge receipt
        pairingMap.observe(() => {
            if (pairingMap.get('client_success')) {
                const clientName = pairingMap.get('client_device_name') as string || 'Mobile Device';
                onClientAcknowledged(clientName);
            }
        });

        return {
            code,
            destroy: () => this.destroySession()
        };
    }

    /**
     * Connects to a hosting session using a 6-digit code.
     */
    static async joinClientSession(code: string, clientDeviceName: string): Promise<{ hashes: string[], hostDeviceName: string }> {
        this.destroySession();
        
        const roomName = `parchments-pairing-${code}`;
        
        return new Promise((resolve, reject) => {
            this.doc = new Y.Doc();
            this.provider = new WebrtcProvider(roomName, this.doc, {
                signaling: this.SIGNALING_SERVERS
            });

            const pairingMap = this.doc!.getMap('pairing');
            
            // Timeout after 30 seconds
            const timeout = setTimeout(() => {
                this.destroySession();
                reject(new Error('Pairing timeout. Please check the code and try again.'));
            }, 30000);

            const handleSuccess = (hashes: string[], hostName: string) => {
                clearTimeout(timeout);
                // Ping the host that we succeeded
                pairingMap.set('client_device_name', clientDeviceName);
                pairingMap.set('client_success', true);
                
                // Allow the Yjs WebRTC provider time to flush the map update before destroying
                setTimeout(() => this.destroySession(), 1500); 
                resolve({ hashes, hostDeviceName: hostName });
            };

            // Check immediately in case it's already there
            const initialHashes = pairingMap.get('host_hashes') as string[] | undefined;
            const initialHostName = pairingMap.get('host_device_name') as string | undefined;
            if (initialHashes && initialHashes.length > 0 && initialHostName) {
                handleSuccess(initialHashes, initialHostName);
                return;
            }

            // Observe for changes
            pairingMap.observe(() => {
                const hashes = pairingMap.get('host_hashes') as string[] | undefined;
                const hostName = pairingMap.get('host_device_name') as string | undefined;
                if (hashes && hashes.length > 0 && hostName) {
                    handleSuccess(hashes, hostName);
                }
            });
        });
    }

    static destroySession() {
        if (this.provider) {
            try {
                this.provider.destroy();
            } catch (e) {
                // Ignore destruction errors
            }
            this.provider = null;
        }
        if (this.doc) {
            this.doc.destroy();
            this.doc = null;
        }
    }
}
