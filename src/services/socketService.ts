import { io, Socket } from 'socket.io-client';

class SocketService {
  public socket: Socket | null = null;
  public roomId: string = '';

  initSocket(): Socket {
    if (!this.socket) {
      // Connects to current host domain
      const serverUrl = window.location.origin;
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        console.log('[SocketService] Connected with ID:', this.socket?.id);
      });
    }
    return this.socket;
  }

  hostRoom(roomId: string) {
    this.roomId = roomId;
    const socket = this.initSocket();
    socket.emit('host_room', { roomId });
  }

  joinRoom(roomId: string, name: string, avatarSeed: string, color: string) {
    this.roomId = roomId;
    const socket = this.initSocket();
    socket.emit('join_room', { roomId, name, avatarSeed, color });
  }

  sendMotionData(accel: { x: number; y: number; z: number }, rot: { alpha: number; beta: number; gamma: number }, intensity: number, gesture?: string) {
    if (this.socket && this.roomId) {
      this.socket.emit('motion_data', {
        roomId: this.roomId,
        accel,
        rot,
        intensity,
        gesture,
      });
    }
  }

  sendScoreFeedback(playerId: string, feedback: string, pointsAdded: number, totalScore: number) {
    if (this.socket && this.roomId) {
      this.socket.emit('score_feedback', {
        roomId: this.roomId,
        playerId,
        feedback,
        pointsAdded,
        totalScore,
      });
    }
  }

  updateGameState(gameState: 'lobby' | 'playing' | 'results', currentSong?: any) {
    if (this.socket && this.roomId) {
      this.socket.emit('update_game_state', { roomId: this.roomId, gameState, currentSong });
    }
  }
}

export const socketService = new SocketService();
