import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(express.json());

// In-memory room store for mobile phone controllers
interface PlayerInfo {
  id: string;
  name: string;
  avatarSeed: string;
  color: string;
  score: number;
  stars: number;
  lastMoveFeedback: string;
  connectedAt: number;
}

interface RoomData {
  hostId: string | null;
  players: Record<string, PlayerInfo>;
  currentSong: any | null;
  gameState: 'lobby' | 'playing' | 'results';
}

const rooms: Record<string, RoomData> = {};

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // Host creates or joins a room
  socket.on('host_room', (data: { roomId: string }) => {
    const { roomId } = data;
    socket.join(roomId);
    if (!rooms[roomId]) {
      rooms[roomId] = {
        hostId: socket.id,
        players: {},
        currentSong: null,
        gameState: 'lobby',
      };
    } else {
      rooms[roomId].hostId = socket.id;
    }
    console.log(`[Socket] Host ${socket.id} created/joined room ${roomId}`);
    socket.emit('room_state', rooms[roomId]);
  });

  // Mobile controller joins room
  socket.on('join_room', (data: { roomId: string; name: string; avatarSeed: string; color: string }) => {
    const { roomId, name, avatarSeed, color } = data;
    if (!rooms[roomId]) {
      socket.emit('join_error', 'Room not found. Please check room code on host screen.');
      return;
    }

    socket.join(roomId);
    const player: PlayerInfo = {
      id: socket.id,
      name: name || `Dancer ${Object.keys(rooms[roomId].players).length + 1}`,
      avatarSeed: avatarSeed || `P${Date.now()}`,
      color: color || '#ff1493',
      score: 0,
      stars: 0,
      lastMoveFeedback: 'READY',
      connectedAt: Date.now(),
    };

    rooms[roomId].players[socket.id] = player;
    console.log(`[Socket] Mobile controller ${name} (${socket.id}) joined room ${roomId}`);

    socket.emit('joined_successfully', { player, room: rooms[roomId] });
    io.to(roomId).emit('player_joined', { player, room: rooms[roomId] });
  });

  // Mobile controller streams motion data
  socket.on('motion_data', (data: { roomId: string; accel: { x: number; y: number; z: number }; rot: { alpha: number; beta: number; gamma: number }; intensity: number; gesture?: string }) => {
    const { roomId, accel, rot, intensity, gesture } = data;
    if (rooms[roomId]) {
      // Forward motion payload to the room host
      io.to(roomId).emit('player_motion', {
        playerId: socket.id,
        accel,
        rot,
        intensity,
        gesture,
      });
    }
  });

  // Host broadcasts game state or score update
  socket.on('update_game_state', (data: { roomId: string; gameState: 'lobby' | 'playing' | 'results'; currentSong?: any }) => {
    const { roomId, gameState, currentSong } = data;
    if (rooms[roomId]) {
      rooms[roomId].gameState = gameState;
      if (currentSong !== undefined) rooms[roomId].currentSong = currentSong;
      io.to(roomId).emit('game_state_changed', { gameState, currentSong });
    }
  });

  // Host sends score feedback back to controller for haptic vibration
  socket.on('score_feedback', (data: { roomId: string; playerId: string; feedback: string; pointsAdded: number; totalScore: number }) => {
    const { playerId, feedback, pointsAdded, totalScore } = data;
    io.to(playerId).emit('haptic_feedback', { feedback, pointsAdded, totalScore });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    for (const roomId in rooms) {
      if (rooms[roomId].players[socket.id]) {
        delete rooms[roomId].players[socket.id];
        io.to(roomId).emit('player_left', { playerId: socket.id, room: rooms[roomId] });
      }
      if (rooms[roomId].hostId === socket.id) {
        rooms[roomId].hostId = null;
      }
    }
  });
});

// API endpoint for health check or room query
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', activeRooms: Object.keys(rooms).length });
});

const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = await vite.transformIndexHtml(
          url,
          `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>ColeDance - Ultimate Motion Dance Experience</title>
    <meta name="description" content="Play ColeDance with webcam AI pose detection or phone controllers!" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,600;0,700;0,800;0,900;1,800;1,900&family=Rajdhani:wght@600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  </head>
  <body class="bg-[#0b051b] text-white selection:bg-pink-500 selection:text-white overflow-x-hidden font-sans">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
        );
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[ColeDance Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
