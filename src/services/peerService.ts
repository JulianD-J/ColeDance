import { Peer, DataConnection } from 'peerjs';

export interface PeerPlayer {
  id: string;
  name: string;
  avatarSeed: string;
  color: string;
  score: number;
  stars: number;
  lastFeedback: string;
  streak: number;
  isPhoneController: boolean;
  assignedCoachIndex?: number;
}

export type EventCallback = (...args: any[]) => void;

/**
 * PeerService: 100% client-side WebRTC P2P phone controller sync using PeerJS.
 * Compatible with GitHub Pages and static hosting without requiring a Node.js backend server.
 */
class PeerService {
  public peer: Peer | null = null;
  public roomId: string = '';
  public isHost: boolean = false;
  // Host maps connected phones: peerId -> DataConnection
  public connections: Map<string, DataConnection> = new Map();
  // Phone controller holds single connection to host
  public hostConnection: DataConnection | null = null;
  // Event listeners registry
  private listeners: Map<string, Set<EventCallback>> = new Map();

  // Backward-compatibility accessor so socketService.socket.on(...) works seamlessly
  public get socket() {
    return this;
  }

  initSocket(): PeerService {
    return this;
  }

  /**
   * Deterministic room ID on public PeerJS broker (with fallback STUN servers)
   */
  public getRoomPeerId(roomId: string): string {
    const cleanId = roomId.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    return `coledance-room-${cleanId}`;
  }

  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: EventCallback) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, ...args: any[]) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(...args);
        } catch (e) {
          console.error(`[PeerService] Error in callback for "${event}":`, e);
        }
      });
    }
  }

  /**
   * HOST: Host opens a peer with ID derived from roomId
   */
  hostRoom(roomId: string) {
    this.roomId = roomId;
    this.isHost = true;

    if (this.peer && !this.peer.destroyed) {
      this.peer.destroy();
      this.peer = null;
    }
    this.connections.clear();

    const targetPeerId = this.getRoomPeerId(roomId);
    console.log(`[PeerService Host] Registering Peer ID: ${targetPeerId}`);

    const peer = new Peer(targetPeerId, {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
        ],
      },
    });

    peer.on('open', (id) => {
      console.log(`[PeerService Host] Successfully bound to Peer ID: ${id}`);
      this.emit('host_ready', { peerId: id, roomId });
    });

    peer.on('connection', (conn) => {
      console.log(`[PeerService Host] Incoming controller connection from: ${conn.peer}`);

      conn.on('open', () => {
        this.connections.set(conn.peer, conn);
        console.log(`[PeerService Host] Controller ${conn.peer} data channel open`);
      });

      conn.on('data', (data: any) => {
        this.handleHostIncomingData(conn, data);
      });

      conn.on('close', () => {
        console.log(`[PeerService Host] Controller disconnected: ${conn.peer}`);
        this.connections.delete(conn.peer);
        this.emit('player_left', { playerId: conn.peer });
      });

      conn.on('error', (err) => {
        console.warn(`[PeerService Host] Connection error with ${conn.peer}:`, err);
        this.connections.delete(conn.peer);
        this.emit('player_left', { playerId: conn.peer });
      });
    });

    peer.on('error', (err: any) => {
      console.warn('[PeerService Host] Peer error:', err);
      // If room ID was already active on broker, we can generate a fresh ID
      if (err.type === 'unavailable-id') {
        console.warn('[PeerService Host] Peer ID collision on broker for room', roomId);
      }
      this.emit('error', err);
    });

    this.peer = peer;
  }

  private handleHostIncomingData(conn: DataConnection, data: any) {
    if (!data || typeof data !== 'object') return;

    switch (data.type) {
      case 'join_room': {
        const player = {
          id: conn.peer,
          name: data.name || 'Dancer',
          avatarSeed: data.avatarSeed || `P_${Date.now()}`,
          color: data.color || '#ff1493',
          score: 0,
          stars: 0,
          lastFeedback: 'READY',
          streak: 0,
          isPhoneController: true,
        };

        // Notify host application
        this.emit('player_joined', { player, room: { id: this.roomId } });

        // Confirm to controller
        conn.send({
          type: 'joined_successfully',
          player,
          room: { id: this.roomId },
        });
        break;
      }

      case 'motion_data': {
        const motionPayload = {
          playerId: conn.peer,
          intensity: data.intensity ?? 0,
          accel: data.accel || { x: 0, y: 0, z: 0 },
          rot: data.rot || { alpha: 0, beta: 0, gamma: 0 },
          gesture: data.gesture,
        };
        this.emit('motion_data_received', motionPayload);
        this.emit('player_motion', motionPayload);
        break;
      }

      default:
        console.log('[PeerService Host] Unrecognized data from controller:', data);
    }
  }

  /**
   * CONTROLLER: Connect to the host's room ID
   */
  joinRoom(roomId: string, name: string, avatarSeed: string, color: string) {
    this.roomId = roomId;
    this.isHost = false;

    if (this.peer && !this.peer.destroyed) {
      this.peer.destroy();
      this.peer = null;
    }

    const targetHostPeerId = this.getRoomPeerId(roomId);
    console.log(`[PeerService Controller] Connecting to Host: ${targetHostPeerId}`);

    const peer = new Peer({
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
        ],
      },
    });

    peer.on('open', (myPeerId) => {
      console.log(`[PeerService Controller] Controller peer initialized (${myPeerId}). Dialing host...`);
      const conn = peer.connect(targetHostPeerId, {
        reliable: true,
      });

      conn.on('open', () => {
        console.log(`[PeerService Controller] WebRTC channel open to host! Sending join packet...`);
        this.hostConnection = conn;
        conn.send({
          type: 'join_room',
          roomId,
          name,
          avatarSeed,
          color,
        });
      });

      conn.on('data', (data: any) => {
        this.handleControllerIncomingData(data);
      });

      conn.on('close', () => {
        console.log('[PeerService Controller] Host disconnected');
        this.hostConnection = null;
        this.emit('disconnected');
      });

      conn.on('error', (err) => {
        console.error('[PeerService Controller] Channel error:', err);
        this.emit('join_error', 'Connection to host interrupted. Please verify room code.');
      });
    });

    peer.on('error', (err: any) => {
      console.error('[PeerService Controller] Peer error:', err);
      if (err.type === 'peer-unavailable') {
        this.emit('join_error', `Dance room #${roomId} was not found. Please ensure the main screen has room #${roomId} open.`);
      } else {
        this.emit('join_error', `Could not connect to host (${err.type || 'network error'})`);
      }
    });

    this.peer = peer;
  }

  private handleControllerIncomingData(data: any) {
    if (!data || typeof data !== 'object') return;

    switch (data.type) {
      case 'joined_successfully':
        this.emit('joined_successfully', data);
        break;

      case 'haptic_feedback':
      case 'score_feedback':
        this.emit('haptic_feedback', {
          feedback: data.feedback,
          pointsAdded: data.pointsAdded,
          totalScore: data.totalScore,
        });
        break;

      case 'update_game_state':
        this.emit('update_game_state', data);
        break;

      default:
        console.log('[PeerService Controller] Unhandled message:', data);
    }
  }

  /**
   * CONTROLLER -> HOST: Stream motion & gyroscope data
   */
  sendMotionData(
    accel: { x: number; y: number; z: number },
    rot: { alpha: number; beta: number; gamma: number },
    intensity: number,
    gesture?: string
  ) {
    if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send({
        type: 'motion_data',
        accel,
        rot,
        intensity,
        gesture,
      });
    }
  }

  /**
   * HOST -> CONTROLLER: Send real-time score & haptics feedback
   */
  sendScoreFeedback(playerId: string, feedback: string, pointsAdded: number, totalScore: number) {
    const conn = this.connections.get(playerId);
    if (conn && conn.open) {
      conn.send({
        type: 'haptic_feedback',
        feedback,
        pointsAdded,
        totalScore,
      });
    }
  }

  /**
   * HOST -> ALL CONTROLLERS: Broadcast routine state (lobby, playing, results)
   */
  updateGameState(gameState: 'lobby' | 'playing' | 'results', currentSong?: any) {
    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send({
          type: 'update_game_state',
          gameState,
          currentSong,
        });
      }
    });
  }

  /**
   * Tear down connections
   */
  destroy() {
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    if (this.hostConnection) {
      this.hostConnection.close();
      this.hostConnection = null;
    }
    if (this.peer && !this.peer.destroyed) {
      this.peer.destroy();
      this.peer = null;
    }
    this.listeners.clear();
  }
}

export const peerService = new PeerService();
