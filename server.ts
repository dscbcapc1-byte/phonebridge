import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import multer from 'multer';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes default
const MAX_FILE_SIZE = 150 * 1024 * 1024; // 150MB per file

// Base temporary directory for all PhoneBridge sessions
const BASE_TEMP_DIR = path.join(os.tmpdir(), 'phonebridge-sessions');
if (!fs.existsSync(BASE_TEMP_DIR)) {
  fs.mkdirSync(BASE_TEMP_DIR, { recursive: true });
}

// Interfaces
export interface BridgeFile {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: number;
  filePath: string;
  downloadUrl: string;
  viewUrl: string;
  isImage: boolean;
  isVideo: boolean;
  isAudio: boolean;
}

export interface DevicePeer {
  id: string;
  role: 'desktop' | 'mobile';
  deviceName: string;
  connectedAt: number;
}

export interface SessionData {
  id: string;
  pairCode: string;
  createdAt: number;
  expiresAt: number;
  tempDir: string;
  files: BridgeFile[];
  devices: DevicePeer[];
}

interface ActiveSession extends SessionData {
  desktopSockets: Set<WebSocket>;
  mobileSockets: Set<WebSocket>;
  socketDeviceMap: Map<WebSocket, DevicePeer>;
}

// In-memory store of active sessions
const sessions = new Map<string, ActiveSession>();
const pairCodeToSessionId = new Map<string, string>();

// Clean up helper
function deleteSessionFiles(tempDir: string) {
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error(`Failed to remove temp dir ${tempDir}:`, err);
  }
}

function broadcastToSession(session: ActiveSession, message: any, excludeWs?: WebSocket) {
  const payload = JSON.stringify(message);
  const allSockets = [...session.desktopSockets, ...session.mobileSockets];
  for (const ws of allSockets) {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(payload);
      } catch (e) {
        // socket might be closing
      }
    }
  }
}

function broadcastToDesktop(session: ActiveSession, message: any) {
  const payload = JSON.stringify(message);
  for (const ws of session.desktopSockets) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(payload);
      } catch (e) {
        // ignore
      }
    }
  }
}

function wipeSession(sessionId: string, reason: string = 'closed') {
  const session = sessions.get(sessionId);
  if (!session) return;

  broadcastToSession(session, {
    type: 'session_terminated',
    reason,
    sessionId,
  });

  // Close all sockets
  for (const ws of [...session.desktopSockets, ...session.mobileSockets]) {
    try {
      ws.close(1000, reason);
    } catch {}
  }

  deleteSessionFiles(session.tempDir);
  pairCodeToSessionId.delete(session.pairCode);
  sessions.delete(sessionId);
}

// Periodic cleanup of expired sessions
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      wipeSession(id, 'expired');
    }
  }
}, 10000);

// Helper to format safe sanitized filenames
function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// Helper to generate 6-character user-friendly pairing code
function generatePairCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed confusing 0, 1, I, O
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

// Multer storage engine dynamically resolving session directory
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const sessionId = req.params.sessionId;
    const session = sessions.get(sessionId);
    if (!session) {
      return cb(new Error('Invalid or expired session'), '');
    }
    cb(null, session.tempDir);
  },
  filename: (_req, file, cb) => {
    const safeName = sanitizeFileName(file.originalname);
    const uniqueId = crypto.randomBytes(6).toString('hex');
    cb(null, `${uniqueId}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
});

// Middleware
app.use(express.json());

// API: Create new transfer session
app.post('/api/sessions/create', async (req, res) => {
  try {
    const sessionId = crypto.randomUUID();
    let pairCode = generatePairCode();
    while (pairCodeToSessionId.has(pairCode)) {
      pairCode = generatePairCode();
    }

    const sessionDir = path.join(BASE_TEMP_DIR, sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    const now = Date.now();
    const expiresAt = now + SESSION_TTL_MS;

    // Detect app origin / base URL
    const host = req.get('host') || `localhost:${PORT}`;
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const baseUrl = process.env.APP_URL || `${protocol}://${host}`;
    const mobileUrl = `${baseUrl}/m/${sessionId}`;

    // Generate high resolution QR code data URL
    const qrDataUrl = await QRCode.toDataURL(mobileUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 8,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    const activeSession: ActiveSession = {
      id: sessionId,
      pairCode,
      createdAt: now,
      expiresAt,
      tempDir: sessionDir,
      files: [],
      devices: [],
      desktopSockets: new Set(),
      mobileSockets: new Set(),
      socketDeviceMap: new Map(),
    };

    sessions.set(sessionId, activeSession);
    pairCodeToSessionId.set(pairCode, sessionId);

    res.json({
      sessionId,
      pairCode,
      createdAt: now,
      expiresAt,
      mobileUrl,
      qrDataUrl,
      ttlMs: SESSION_TTL_MS,
    });
  } catch (error: any) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create bridge session' });
  }
});

// API: Resolve pair code to session ID
app.get('/api/sessions/resolve-code/:code', (req, res) => {
  const code = req.params.code.toUpperCase().trim();
  const sessionId = pairCodeToSessionId.get(code);
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(404).json({ error: 'Pairing code not found or expired' });
  }
  res.json({ sessionId });
});

// API: Get session metadata
app.get('/api/sessions/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found or expired' });
  }
  res.json({
    id: session.id,
    pairCode: session.pairCode,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    fileCount: session.files.length,
    files: session.files,
    connectedDevices: session.devices,
  });
});

// API: Extend session time (+5 minutes)
app.post('/api/sessions/:sessionId/extend', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  const extensionMs = 5 * 60 * 1000;
  session.expiresAt = Math.min(session.expiresAt + extensionMs, Date.now() + 60 * 60 * 1000);

  broadcastToSession(session, {
    type: 'session_extended',
    expiresAt: session.expiresAt,
  });

  res.json({ expiresAt: session.expiresAt });
});

// API: Upload files to session
app.post('/api/sessions/:sessionId/upload', upload.array('files', 20), (req, res) => {
  const sessionId = req.params.sessionId;
  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found or expired' });
  }

  const uploadedFiles = req.files as Express.Multer.File[];
  if (!uploadedFiles || uploadedFiles.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const deviceName = (req.body.deviceName as string) || 'Mobile Device';
  const newBridgeFiles: BridgeFile[] = [];

  for (const f of uploadedFiles) {
    const fileId = crypto.randomUUID();
    const mime = f.mimetype || 'application/octet-stream';
    const isImage = mime.startsWith('image/');
    const isVideo = mime.startsWith('video/');
    const isAudio = mime.startsWith('audio/');

    const bridgeFile: BridgeFile = {
      id: fileId,
      originalName: f.originalname,
      mimeType: mime,
      size: f.size,
      uploadedAt: Date.now(),
      filePath: f.path,
      downloadUrl: `/api/sessions/${sessionId}/files/${fileId}/download`,
      viewUrl: `/api/sessions/${sessionId}/files/${fileId}/view`,
      isImage,
      isVideo,
      isAudio,
    };

    session.files.unshift(bridgeFile);
    newBridgeFiles.push(bridgeFile);
  }

  // Broadcast to all sockets in session
  broadcastToDesktop(session, {
    type: 'files_received',
    files: newBridgeFiles,
    totalFiles: session.files.length,
    uploadedBy: deviceName,
  });

  res.json({
    success: true,
    uploadedCount: newBridgeFiles.length,
    files: newBridgeFiles,
  });
});

// API: View file inline (image, pdf, text, etc.)
app.get('/api/sessions/:sessionId/files/:fileId/view', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).send('Session expired');

  const file = session.files.find((f) => f.id === req.params.fileId);
  if (!file || !fs.existsSync(file.filePath)) {
    return res.status(404).send('File not found');
  }

  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
  fs.createReadStream(file.filePath).pipe(res);
});

// API: Download file as attachment
app.get('/api/sessions/:sessionId/files/:fileId/download', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).send('Session expired');

  const file = session.files.find((f) => f.id === req.params.fileId);
  if (!file || !fs.existsSync(file.filePath)) {
    return res.status(404).send('File not found');
  }

  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
  fs.createReadStream(file.filePath).pipe(res);
});

// API: Download all files in session as ZIP
app.get('/api/sessions/:sessionId/download-all', async (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session || session.files.length === 0) {
    return res.status(404).send('No files available to download');
  }

  try {
    const zip = new JSZip();
    for (const file of session.files) {
      if (fs.existsSync(file.filePath)) {
        const fileData = fs.readFileSync(file.filePath);
        zip.file(file.originalName, fileData);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    const zipName = `PhoneBridge_${session.pairCode}_${Date.now()}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
    res.send(zipBuffer);
  } catch (err) {
    console.error('Error creating zip:', err);
    res.status(500).send('Error generating archive');
  }
});

// API: Delete single file from session
app.delete('/api/sessions/:sessionId/files/:fileId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const fileIndex = session.files.findIndex((f) => f.id === req.params.fileId);
  if (fileIndex === -1) return res.status(404).json({ error: 'File not found' });

  const file = session.files[fileIndex];
  if (fs.existsSync(file.filePath)) {
    try {
      fs.unlinkSync(file.filePath);
    } catch {}
  }

  session.files.splice(fileIndex, 1);

  broadcastToSession(session, {
    type: 'file_deleted',
    fileId: file.id,
    totalFiles: session.files.length,
  });

  res.json({ success: true, remaining: session.files.length });
});

// API: Wipe session & destroy all files immediately
app.post('/api/sessions/:sessionId/wipe', (req, res) => {
  const sessionId = req.params.sessionId;
  if (!sessions.has(sessionId)) {
    return res.status(404).json({ error: 'Session not found' });
  }

  wipeSession(sessionId, 'wiped_by_user');
  res.json({ success: true, message: 'Session files wiped immediately.' });
});

// WebSocket Protocol handling
wss.on('connection', (ws: WebSocket, req) => {
  // Parse query params if provided in URL
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const qSessionId = url.searchParams.get('sessionId');
  const qRole = url.searchParams.get('role') as 'desktop' | 'mobile' | null;
  const qDeviceName = url.searchParams.get('deviceName');

  let currentSessionId: string | null = null;
  let currentRole: 'desktop' | 'mobile' | null = null;

  function joinSession(sessionId: string, role: 'desktop' | 'mobile', deviceName?: string) {
    const session = sessions.get(sessionId);
    if (!session) {
      ws.send(JSON.stringify({ type: 'error', message: 'Session not found or expired' }));
      return;
    }

    currentSessionId = sessionId;
    currentRole = role;

    const deviceId = crypto.randomUUID();
    const peer: DevicePeer = {
      id: deviceId,
      role,
      deviceName: deviceName || (role === 'desktop' ? 'PC Workstation' : 'Mobile Device'),
      connectedAt: Date.now(),
    };

    if (role === 'desktop') {
      session.desktopSockets.add(ws);
    } else {
      session.mobileSockets.add(ws);
      session.devices.push(peer);
    }

    session.socketDeviceMap.set(ws, peer);

    // Acknowledge connection
    ws.send(
      JSON.stringify({
        type: 'session_joined',
        session: {
          id: session.id,
          pairCode: session.pairCode,
          expiresAt: session.expiresAt,
          fileCount: session.files.length,
          files: session.files,
          devices: session.devices,
        },
        peer,
      })
    );

    // Notify other peers
    broadcastToSession(session, {
      type: 'device_connected',
      device: peer,
      allDevices: session.devices,
    }, ws);
  }

  if (qSessionId && qRole) {
    joinSession(qSessionId, qRole, qDeviceName || undefined);
  }

  ws.on('message', (data: string) => {
    try {
      const message = JSON.parse(data.toString());
      if (message.type === 'join') {
        joinSession(message.sessionId, message.role || 'desktop', message.deviceName);
      } else if (message.type === 'upload_progress' && currentSessionId) {
        const session = sessions.get(currentSessionId);
        if (session) {
          broadcastToDesktop(session, {
            type: 'peer_upload_progress',
            fileName: message.fileName,
            progress: message.progress,
            totalBytes: message.totalBytes,
            loadedBytes: message.loadedBytes,
            deviceName: message.deviceName,
          });
        }
      } else if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (err) {
      console.error('Invalid WS message payload:', err);
    }
  });

  ws.on('close', () => {
    if (currentSessionId && sessions.has(currentSessionId)) {
      const session = sessions.get(currentSessionId)!;
      const peer = session.socketDeviceMap.get(ws);

      if (currentRole === 'desktop') {
        session.desktopSockets.delete(ws);
      } else {
        session.mobileSockets.delete(ws);
        if (peer) {
          session.devices = session.devices.filter((d) => d.id !== peer.id);
        }
      }

      session.socketDeviceMap.delete(ws);

      if (peer) {
        broadcastToSession(session, {
          type: 'device_disconnected',
          device: peer,
          allDevices: session.devices,
        });
      }
    }
  });
});

// Process cleanup hooks
process.on('SIGINT', () => {
  for (const session of sessions.values()) {
    deleteSessionFiles(session.tempDir);
  }
  process.exit(0);
});
process.on('SIGTERM', () => {
  for (const session of sessions.values()) {
    deleteSessionFiles(session.tempDir);
  }
  process.exit(0);
});

// Mount Vite or static server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`PhoneBridge server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
