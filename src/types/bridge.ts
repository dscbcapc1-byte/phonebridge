export interface BridgeFile {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: number;
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
  sessionId: string;
  pairCode: string;
  createdAt: number;
  expiresAt: number;
  mobileUrl: string;
  qrDataUrl: string;
  ttlMs: number;
}

export interface WebSocketMessage {
  type: string;
  sessionId?: string;
  role?: 'desktop' | 'mobile';
  deviceName?: string;
  device?: DevicePeer;
  allDevices?: DevicePeer[];
  files?: BridgeFile[];
  totalFiles?: number;
  fileId?: string;
  fileName?: string;
  progress?: number;
  totalBytes?: number;
  loadedBytes?: number;
  uploadedBy?: string;
  expiresAt?: number;
  reason?: string;
  message?: string;
  session?: {
    id: string;
    pairCode: string;
    expiresAt: number;
    fileCount: number;
    files: BridgeFile[];
    devices: DevicePeer[];
  };
}
