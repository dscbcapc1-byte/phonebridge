import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Smartphone,
  QrCode,
  Copy,
  Check,
  Clock,
  Plus,
  Trash2,
  Download,
  Archive,
  Eye,
  FileText,
  FileCode,
  Music,
  Film,
  FolderOpen,
  UploadCloud,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  Play,
  RotateCcw,
} from 'lucide-react';
import { BridgeFile, DevicePeer, SessionData } from '../types/bridge';
import { useBridgeWebSocket } from '../hooks/useBridgeWebSocket';
import { formatBytes, formatTimeRemaining, formatRelativeTime, copyImageToClipboard } from '../utils/format';
import { sounds } from '../utils/audio';

interface DesktopViewProps {
  session: SessionData | null;
  onCreateSession: () => Promise<void>;
  onWipeSession: () => Promise<void>;
  onOpenSimulator: () => void;
  onSelectQuickLook: (file: BridgeFile) => void;
}

export const DesktopView: React.FC<DesktopViewProps> = ({
  session,
  onCreateSession,
  onWipeSession,
  onOpenSimulator,
  onSelectQuickLook,
}) => {
  const [files, setFiles] = useState<BridgeFile[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [confirmWipeOpen, setConfirmWipeOpen] = useState(false);
  const [liveUploadProgress, setLiveUploadProgress] = useState<{
    fileName: string;
    progress: number;
    loadedBytes: number;
    totalBytes: number;
    deviceName?: string;
  } | null>(null);
  const progressTimeoutRef = useRef<any>(null);

  // File drag & drop input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // WebSocket connection for active desktop session
  const { isConnected, connectedDevices } = useBridgeWebSocket({
    sessionId: session?.sessionId || null,
    role: 'desktop',
    deviceName: 'PC Workstation',
    onFilesReceived: (newFiles) => {
      setFiles((prev) => {
        // filter duplicates
        const existingIds = new Set(prev.map((f) => f.id));
        const filtered = newFiles.filter((f) => !existingIds.has(f.id));
        return [...filtered, ...prev];
      });
      setLiveUploadProgress(null);
    },
    onFileDeleted: (fileId) => {
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    },
    onPeerUploadProgress: (progressData) => {
      setLiveUploadProgress(progressData);
      clearTimeout(progressTimeoutRef.current);
      if (progressData.progress >= 100) {
        progressTimeoutRef.current = setTimeout(() => {
          setLiveUploadProgress(null);
        }, 1200);
      }
    },
    onSessionWiped: () => {
      setFiles([]);
    },
    onSessionExtended: (newExpiresAt) => {
      if (session) {
        session.expiresAt = newExpiresAt;
      }
    },
  });

  // Countdown timer
  useEffect(() => {
    if (!session) return;
    const updateTimer = () => {
      const remaining = Math.max(0, session.expiresAt - Date.now());
      setTimeRemaining(remaining);
      if (remaining === 0) {
        // session expired
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session]);

  // Copy mobile link to clipboard
  const handleCopyLink = () => {
    if (!session) return;
    sounds.playTap();
    navigator.clipboard.writeText(session.mobileUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Copy pair code
  const handleCopyCode = () => {
    if (!session) return;
    sounds.playTap();
    navigator.clipboard.writeText(session.pairCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Extend session by 5 minutes
  const handleExtendSession = async () => {
    if (!session) return;
    sounds.playTap();
    try {
      const res = await fetch(`/api/sessions/${session.sessionId}/extend`, { method: 'POST' });
      const data = await res.json();
      if (data.expiresAt) {
        session.expiresAt = data.expiresAt;
        setTimeRemaining(Math.max(0, data.expiresAt - Date.now()));
      }
    } catch (err) {
      console.error('Failed to extend session:', err);
    }
  };

  // Handle direct PC upload (drag and drop or file select)
  const handleDirectUpload = async (fileList: FileList | null) => {
    if (!session || !fileList || fileList.length === 0) return;
    sounds.playTap();

    const formData = new FormData();
    for (let i = 0; i < fileList.length; i++) {
      formData.append('files', fileList[i]);
    }
    formData.append('deviceName', 'PC Direct Drop');

    try {
      const res = await fetch(`/api/sessions/${session.sessionId}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.files) {
        sounds.playFileReceived();
        setFiles((prev) => [...data.files, ...prev]);
      }
    } catch (err) {
      console.error('Direct upload failed:', err);
    }
  };

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleDirectUpload(e.dataTransfer.files);
    }
  };

  // Delete single file
  const handleDeleteFile = async (fileId: string) => {
    if (!session) return;
    sounds.playSessionWipe();
    try {
      await fetch(`/api/sessions/${session.sessionId}/files/${fileId}`, {
        method: 'DELETE',
      });
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Copy individual image to clipboard
  const handleCopyFile = async (file: BridgeFile) => {
    sounds.playTap();
    setCopiedFileId(file.id);
    if (file.isImage) {
      await copyImageToClipboard(file.viewUrl);
    } else {
      await navigator.clipboard.writeText(window.location.origin + file.downloadUrl);
    }
    setTimeout(() => setCopiedFileId(null), 2000);
  };

  // Confirmation wipe
  const handleConfirmWipe = async () => {
    setIsWiping(true);
    sounds.playSessionWipe();
    await onWipeSession();
    setIsWiping(false);
    setConfirmWipeOpen(false);
  };

  // Total transferred size
  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);

  // 1. Initial State: No Active Session
  if (!session) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-20 flex flex-col items-center">
        {/* Apple Centered Hero Card */}
        <div className="w-full rounded-3xl apple-glass-card border border-white/60 dark:border-slate-800/60 p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
          {/* Subtle specular ambient glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-b from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Animated Device Bridge Icon */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 p-1 shadow-xl shadow-blue-500/20">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[22px] flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Smartphone className="w-9 h-9" />
              </div>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white max-w-xl mx-auto mb-3">
            Temporary phone-to-PC file bridge.
          </h1>

          <p className="text-base text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-8 leading-relaxed">
            Instantly transfer photos and files from your phone to this PC. No cloud storage, no account, and automatic self-destruction when you are done.
          </p>

          {/* Primary Action Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                sounds.playTap();
                onCreateSession();
              }}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base shadow-xl shadow-blue-600/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2.5"
            >
              <Smartphone className="w-5 h-5" />
              <span>Upload from Phone</span>
            </button>
          </div>

          {/* Zero-Pill Feature Meta Row */}
          <div className="mt-10 pt-8 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Instant QR Pairing
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Ephemeral RAM/Temp Disk
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 10-Min Auto Self-Destruct
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Active Session State: QR Code + Staging Canvas
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Session Header Status Bar */}
      <div className="p-4 sm:p-5 rounded-2xl apple-glass-card border border-white/60 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        {/* Left: Device status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {connectedDevices.length > 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {connectedDevices[0].deviceName} Connected
                  </span>
                ) : (
                  <span>Waiting for phone scan...</span>
                )}
              </h3>
              <span
                className={`w-2 h-2 rounded-full ${
                  connectedDevices.length > 0 ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : 'bg-amber-500 animate-apple-pulse'
                }`}
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>Code:</span>
              <button
                onClick={handleCopyCode}
                className="font-mono font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1 cursor-pointer"
                title="Click to copy pairing code"
              >
                <span>{session.pairCode}</span>
                {copiedCode ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 opacity-60" />}
              </button>
            </div>
          </div>
        </div>

        {/* Center: Live countdown timer */}
        <div className="flex items-center gap-2 bg-slate-100/80 dark:bg-slate-900/80 px-3.5 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
          <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400">Expires in:</span>
            <span className="text-xs font-mono font-bold tabular-nums text-slate-900 dark:text-white">
              {formatTimeRemaining(timeRemaining)}
            </span>
          </div>
          <button
            onClick={handleExtendSession}
            className="ml-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
            title="Add 5 more minutes"
          >
            <Plus className="w-3 h-3" />
            <span>5m</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {files.length > 0 && (
            <a
              href={`/api/sessions/${session.sessionId}/download-all`}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Download ZIP ({files.length})</span>
            </a>
          )}

          <button
            onClick={() => setConfirmWipeOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/60 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Wipe & End</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: QR Code & Pairing Area (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-3xl apple-glass-card border border-white/60 dark:border-slate-800/60 p-6 flex flex-col items-center text-center shadow-lg">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
              Scan with Phone Camera
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Open your iPhone or Android camera app and point at the QR code.
            </p>

            {/* High-Resolution QR Card */}
            <div className="relative p-3.5 bg-white rounded-2xl shadow-md border border-slate-200/80 group">
              <img
                src={session.qrDataUrl}
                alt="Scan to pair mobile device"
                className="w-56 h-56 object-contain"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-white/90 backdrop-blur-xs transition-opacity rounded-2xl">
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Mobile Link'}</span>
                </button>
              </div>
            </div>

            {/* Direct Links and Simulator launcher */}
            <div className="w-full mt-5 space-y-2">
              <button
                onClick={handleCopyLink}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Link Copied to Clipboard' : 'Copy Direct Phone Link'}</span>
              </button>

              <button
                onClick={() => {
                  sounds.playTap();
                  onOpenSimulator();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600/10 to-indigo-600/10 hover:from-blue-600/20 hover:to-indigo-600/20 text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center justify-center gap-2 border border-blue-500/20 transition-all cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Test with Mobile Simulator</span>
              </button>
            </div>

            {/* Quick pairing tips */}
            <div className="w-full mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 text-left text-[11px] text-slate-400 space-y-1">
              <p className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-blue-500" />
                No app installation required
              </p>
              <p className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-blue-500" />
                Select multiple photos & videos
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Live Staging Canvas & Uploaded Files (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-4 flex flex-col">
          {/* Live Incoming Upload Banner */}
          {liveUploadProgress && (
            <div className="p-4 rounded-2xl bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between text-xs font-medium text-blue-950 dark:text-blue-100 mb-1.5">
                <div className="flex items-center gap-2 truncate pr-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                  <span className="truncate">Receiving {liveUploadProgress.fileName}...</span>
                </div>
                <span className="font-mono tabular-nums font-semibold shrink-0">
                  {liveUploadProgress.progress}%
                </span>
              </div>
              <div className="w-full bg-blue-200/60 dark:bg-blue-900/60 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-150"
                  style={{ width: `${liveUploadProgress.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* PC Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-3xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 scale-[0.99]'
                : 'border-slate-300/80 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-white/40 dark:bg-slate-900/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleDirectUpload(e.target.files)}
            />
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 mb-2">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Drag & drop files from this PC or browse
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Phone uploads will also materialize here automatically in real time
            </p>
          </div>

          {/* File Staging Gallery */}
          <div className="flex-1 rounded-3xl apple-glass-card border border-white/60 dark:border-slate-800/60 p-5 flex flex-col shadow-lg">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200/60 dark:border-slate-800/60">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Staged Files ({files.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {files.length === 0
                    ? 'No files received yet'
                    : `Total size: ${formatBytes(totalBytes)} · Ephemeral temporary storage`}
                </p>
              </div>

              {files.length > 0 && (
                <span className="text-xs text-slate-400 hidden sm:inline">
                  Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">Space</kbd> or click to Quick Look
                </span>
              )}
            </div>

            {/* Empty State */}
            {files.length === 0 ? (
              <div className="flex-1 min-h-[220px] flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-400">
                  <Smartphone className="w-8 h-8" />
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Ready for phone transfer
                </p>
                <p className="text-xs max-w-sm text-slate-500 dark:text-slate-400">
                  Scan the QR code on the left with your phone to upload photos, videos, or documents directly into this list.
                </p>
              </div>
            ) : (
              /* Grid of Files */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 max-h-[520px] overflow-y-auto pr-1">
                {files.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => onSelectQuickLook(file)}
                    className="group relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-sm hover:shadow-md hover:border-blue-400/50 transition-all cursor-pointer flex flex-col"
                  >
                    {/* Media Preview Box */}
                    <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-800/60 overflow-hidden flex items-center justify-center">
                      {file.isImage ? (
                        <img
                          src={file.viewUrl}
                          alt={file.originalName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : file.isVideo ? (
                        <div className="flex flex-col items-center gap-1 text-slate-400">
                          <Film className="w-8 h-8 text-blue-500" />
                          <span className="text-[10px] uppercase font-mono">Video</span>
                        </div>
                      ) : file.isAudio ? (
                        <div className="flex flex-col items-center gap-1 text-slate-400">
                          <Music className="w-8 h-8 text-indigo-500" />
                          <span className="text-[10px] uppercase font-mono">Audio</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-400">
                          <FileText className="w-8 h-8 text-slate-500" />
                          <span className="text-[10px] uppercase font-mono">Document</span>
                        </div>
                      )}

                      {/* Hover Quick Action Buttons */}
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                        {file.isImage && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyFile(file);
                            }}
                            className="p-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 shadow-md transition-transform active:scale-90 cursor-pointer"
                            title="Copy image to clipboard"
                          >
                            {copiedFileId === file.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

                        <a
                          href={file.downloadUrl}
                          download={file.originalName}
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 shadow-md transition-transform active:scale-90 cursor-pointer"
                          title="Download file"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file.id);
                          }}
                          className="p-2 rounded-xl bg-rose-600 text-white hover:bg-rose-500 shadow-md transition-transform active:scale-90 cursor-pointer"
                          title="Delete file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata Footer */}
                    <div className="p-2.5 flex flex-col justify-between flex-1">
                      <p className="text-xs font-medium text-slate-900 dark:text-white truncate" title={file.originalName}>
                        {file.originalName}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                        <span>{formatBytes(file.size)}</span>
                        <span>{formatRelativeTime(file.uploadedAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Session Wipe */}
      {confirmWipeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl apple-glass-card border border-white/40 dark:border-slate-800 p-6 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Wipe Session & Delete All Files?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              This will permanently delete all {files.length} transferred files from the server memory and close the phone connection immediately.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfirmWipeOpen(false)}
                className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmWipe}
                disabled={isWiping}
                className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer"
              >
                {isWiping ? 'Wiping...' : 'Yes, Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
