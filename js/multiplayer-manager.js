// ===================================
// MULTIPLAYER MANAGER
// WebRTC Peer-to-Peer Real-time Multiplayer using PeerJS
// ===================================

const MultiplayerManager = {
    peer: null,
    connection: null,
    isHost: false,
    isConnected: false,
    roomCode: '',
    localPlayerName: '',
    remotePlayerName: 'Opponent',
    listeners: {},

    // Protocol Event Types
    EVENTS: {
        ROOM_JOINED: 'ROOM_JOINED',
        LOBBY_READY: 'LOBBY_READY',
        START_TOSS: 'START_TOSS',
        TOSS_CHOICE: 'TOSS_CHOICE',
        TOSS_RESULT: 'TOSS_RESULT',
        DELIVERY_START: 'DELIVERY_START',
        BAT_ACTION: 'BAT_ACTION',
        DELIVERY_RESOLVED: 'DELIVERY_RESOLVED',
        INNINGS_BREAK: 'INNINGS_BREAK',
        INNINGS_2_START: 'INNINGS_2_START',
        MATCH_END: 'MATCH_END',
        REMATCH_REQUEST: 'REMATCH_REQUEST',
        REMATCH_ACCEPT: 'REMATCH_ACCEPT',
        OPPONENT_DISCONNECTED: 'OPPONENT_DISCONNECTED'
    },

    init() {
        this.listeners = {};
    },

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    },

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => {
                try { cb(data); } catch (err) { console.error('Multiplayer listener error:', err); }
            });
        }
    },

    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 5; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    },

    getPeerIdFromRoomCode(code) {
        return `cricket-oddeven-room-${code.toUpperCase().trim()}`;
    },

    /**
     * Host a new multiplayer room
     */
    hostRoom(playerName, onReadyCallback, onErrorCallback) {
        this.cleanup();
        this.isHost = true;
        this.localPlayerName = playerName || 'Host';
        this.roomCode = this.generateRoomCode();
        const peerId = this.getPeerIdFromRoomCode(this.roomCode);

        try {
            if (typeof Peer === 'undefined') {
                if (onErrorCallback) onErrorCallback('PeerJS library not loaded. Check internet connection.');
                return;
            }

            this.peer = new Peer(peerId, {
                debug: 1,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        { urls: 'stun:stun2.l.google.com:19302' },
                        { urls: 'stun:stun3.l.google.com:19302' },
                        { urls: 'stun:stun4.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                }
            });

            this.peer.on('open', (id) => {
                console.log('PeerJS Host opened with ID:', id, 'Room:', this.roomCode);
                if (onReadyCallback) onReadyCallback(this.roomCode);
            });

            this.peer.on('connection', (conn) => {
                console.log('Incoming connection from opponent...');
                this.setupConnection(conn);
            });

            this.peer.on('error', (err) => {
                console.error('PeerJS Host Error:', err);
                if (err.type === 'unavailable-id') {
                    // Regenerate room code if collision occurs
                    this.hostRoom(playerName, onReadyCallback, onErrorCallback);
                } else {
                    if (onErrorCallback) onErrorCallback(err.message || 'Connection error');
                }
            });
        } catch (e) {
            console.error('Host Room Exception:', e);
            if (onErrorCallback) onErrorCallback(e.message);
        }
    },

    /**
     * Join an existing room with code
     */
    joinRoom(roomCode, playerName, onConnectedCallback, onErrorCallback) {
        this.cleanup();
        this.isHost = false;
        this.localPlayerName = playerName || 'Challenger';
        this.roomCode = roomCode.toUpperCase().trim();
        const targetPeerId = this.getPeerIdFromRoomCode(this.roomCode);

        try {
            if (typeof Peer === 'undefined') {
                if (onErrorCallback) onErrorCallback('PeerJS library not loaded. Check internet connection.');
                return;
            }

            this.peer = new Peer(undefined, {
                debug: 1,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        { urls: 'stun:stun2.l.google.com:19302' },
                        { urls: 'stun:stun3.l.google.com:19302' },
                        { urls: 'stun:stun4.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                }
            });

            this.peer.on('open', () => {
                console.log('PeerJS Joiner opened. Connecting to target:', targetPeerId);
                const conn = this.peer.connect(targetPeerId, {
                    reliable: true
                });
                this.setupConnection(conn, onConnectedCallback, onErrorCallback);
            });

            this.peer.on('error', (err) => {
                console.error('PeerJS Joiner Error:', err);
                if (onErrorCallback) onErrorCallback(err.message || 'Could not find room');
            });
        } catch (e) {
            console.error('Join Room Exception:', e);
            if (onErrorCallback) onErrorCallback(e.message);
        }
    },

    setupConnection(conn, onConnectedCallback, onErrorCallback) {
        this.connection = conn;

        conn.on('open', () => {
            console.log('WebRTC Connection established successfully!');
            this.isConnected = true;

            // Send handshake
            this.send(this.EVENTS.ROOM_JOINED, {
                name: this.localPlayerName,
                isHost: this.isHost
            });

            if (onConnectedCallback) onConnectedCallback();
        });

        conn.on('data', (payload) => {
            this.handleIncomingData(payload);
        });

        conn.on('close', () => {
            console.warn('WebRTC connection closed by remote peer');
            this.isConnected = false;
            this.emit(this.EVENTS.OPPONENT_DISCONNECTED, {});
        });

        conn.on('error', (err) => {
            console.error('WebRTC DataChannel Error:', err);
            if (onErrorCallback) onErrorCallback(err);
        });
    },

    send(type, payload = {}) {
        if (this.connection && this.isConnected) {
            try {
                this.connection.send({
                    type,
                    payload,
                    sender: this.localPlayerName,
                    timestamp: performance.now()
                });
            } catch (err) {
                console.error('Failed to send packet:', err);
            }
        }
    },

    handleIncomingData(data) {
        if (!data || !data.type) return;

        const { type, payload } = data;

        if (type === this.EVENTS.ROOM_JOINED) {
            this.remotePlayerName = payload.name || 'Opponent';
            // Host sends confirmation back with its own name
            if (this.isHost) {
                this.send(this.EVENTS.LOBBY_READY, {
                    hostName: this.localPlayerName,
                    joinerName: this.remotePlayerName
                });
            }
            this.emit(this.EVENTS.ROOM_JOINED, payload);
        } else if (type === this.EVENTS.LOBBY_READY) {
            this.remotePlayerName = payload.hostName || 'Host';
            this.emit(this.EVENTS.LOBBY_READY, payload);
        } else {
            this.emit(type, payload);
        }
    },

    cleanup() {
        if (this.connection) {
            try { this.connection.close(); } catch (e) {}
            this.connection = null;
        }
        if (this.peer) {
            try { this.peer.destroy(); } catch (e) {}
            this.peer = null;
        }
        this.isConnected = false;
        this.isHost = false;
        this.roomCode = '';
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiplayerManager;
}
