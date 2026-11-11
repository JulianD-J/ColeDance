import { peerService } from './peerService';

// Re-export peerService as socketService for 100% backward-compatibility across all screens
export const socketService = peerService;
export { peerService };

