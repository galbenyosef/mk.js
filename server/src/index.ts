import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupLobby } from './lobby.js';

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

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 55555;

app.use(express.static(path.resolve(__dirname, '../../client/dist')));

setupLobby(io);

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
