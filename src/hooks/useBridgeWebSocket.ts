import { useEffect, useRef, useState, useCallback } from 'react';
import { DevicePeer, BridgeFile, WebSocketMessage } from '../types/bridge';
import { sounds } from '../utils/audio';

interface UseBridgeWebSocketProps {
  sessionId: string | null;
  role: 'desktop' | 'mobile';
  deviceName?: string;
  onFilesReceived?: (files: BridgeFile[]) => void;
  onFileDeleted?: (fileId: string) => void;
  onDeviceConnected?: (device: DevicePeer) => void;
  onDeviceDisconnected?: (device: DevicePeer) => void;
  onPeerUploadProgress?: (progressData: {
    fileName: string;
    progress: number;
    totalBytes: number;
    loadedBytes: number;
    deviceName?: string;
  }) => void;
  onSessionWiped?: () => void;
  onSessionExtended?: (newExpiresAt: number) => void;
}

export function useBridgeWebSocket({
  sessionId,
  role,
  deviceName,
  onFilesReceived,
  onFileDeleted,
  onDeviceConnected,
  onDeviceDisconnected,
  onPeerUploadProgress,
  onSessionWiped,
  onSessionExtended,
}: UseBridgeWebSocketProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDevices, setConnectedDevices] = useState<DevicePeer[]>([]);
  const pingIntervalRef = useRef<any>(null);

  const sendMessage = useCallback((msg: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    if (!sessionId) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      setConnectedDevices([]);
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/?sessionId=${encodeURIComponent(
      sessionId
    )}&role=${role}&deviceName=${encodeURIComponent(deviceName || (role === 'desktop' ? 'PC Workstation' : 'Mobile Phone'))}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Join message
      ws.send(
        JSON.stringify({
          type: 'join',
          sessionId,
          role,
          deviceName: deviceName || (role === 'desktop' ? 'PC Workstation' : 'Mobile Phone'),
        })
      );

      // Start ping heartbeat
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 20000);
    };

    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);

        switch (data.type) {
          case 'session_joined':
            if (data.session?.devices) {
              setConnectedDevices(data.session.devices);
            }
            break;

          case 'device_connected':
            if (data.device) {
              sounds.playDeviceConnected();
              sounds.triggerHaptic([40, 60, 40]);
              onDeviceConnected?.(data.device);
            }
            if (data.allDevices) {
              setConnectedDevices(data.allDevices);
            }
            break;

          case 'device_disconnected':
            if (data.device) {
              onDeviceDisconnected?.(data.device);
            }
            if (data.allDevices) {
              setConnectedDevices(data.allDevices);
            }
            break;

          case 'files_received':
            if (data.files && data.files.length > 0) {
              sounds.playFileReceived();
              sounds.triggerHaptic(50);
              onFilesReceived?.(data.files);
            }
            break;

          case 'file_deleted':
            if (data.fileId) {
              onFileDeleted?.(data.fileId);
            }
            break;

          case 'peer_upload_progress':
            onPeerUploadProgress?.({
              fileName: data.fileName || 'file',
              progress: data.progress || 0,
              totalBytes: data.totalBytes || 0,
              loadedBytes: data.loadedBytes || 0,
              deviceName: data.deviceName,
            });
            break;

          case 'session_extended':
            if (data.expiresAt) {
              onSessionExtended?.(data.expiresAt);
            }
            break;

          case 'session_terminated':
            sounds.playSessionWipe();
            onSessionWiped?.();
            break;

          default:
            break;
        }
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      clearInterval(pingIntervalRef.current);
    };

    ws.onerror = (err) => {
      console.warn('WS error:', err);
    };

    return () => {
      clearInterval(pingIntervalRef.current);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [
    sessionId,
    role,
    deviceName,
    onFilesReceived,
    onFileDeleted,
    onDeviceConnected,
    onDeviceDisconnected,
    onPeerUploadProgress,
    onSessionWiped,
    onSessionExtended,
  ]);

  return {
    isConnected,
    connectedDevices,
    sendMessage,
  };
}
