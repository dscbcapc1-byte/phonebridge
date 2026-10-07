import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Image as ImageIcon,
  FolderOpen,
  CheckCircle2,
  X,
  UploadCloud,
  Smartphone,
  Laptop,
  Clock,
  ArrowRight,
  Shield,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useBridgeWebSocket } from '../hooks/useBridgeWebSocket';
import { BridgeFile } from '../types/bridge';
import { formatBytes, formatTimeRemaining } from '../utils/format';
import { sounds } from '../utils/audio';

interface MobileViewProps {
  sessionId: string;
  onExit?: () => void;
}

interface StagedFile {
  id: string;
  file: File;
  previewUrl?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  errorMessage?: string;
}

export const MobileView: React.FC<MobileViewProps> = ({ sessionId, onExit }) => {
  const [sessionData, setSessionData] = useState<{
    expiresAt: number;
    pairCode: string;
  } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [uploadedTotalCount, setUploadedTotalCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // File input refs
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect device name
  const [deviceName] = useState(() => {
    const ua = navigator.userAgent;
    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua)) return 'iPad';
    if (/Android/i.test(ua)) return 'Android Device';
    return 'Mobile Phone';
  });

  // WebSocket hook
  const { isConnected, sendMessage } = useBridgeWebSocket({
    sessionId,
    role: 'mobile',
    deviceName,
    onSessionWiped: () => {
      onExit?.();
    },
    onSessionExtended: (newExpiresAt) => {
      setSessionData((prev) => (prev ? { ...prev, expiresAt: newExpiresAt } : prev));
    },
  });

  // Fetch initial session info
  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Session expired');
        return res.json();
      })
      .then((data) => {
        setSessionData({
          expiresAt: data.expiresAt,
          pairCode: data.pairCode,
        });
      })
      .catch((err) => {
        console.error('Session load error:', err);
        setErrorMessage('This bridge session has expired or was closed by the PC.');
      });
  }, [sessionId]);

  // Session countdown timer
  useEffect(() => {
    if (!sessionData) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, sessionData.expiresAt - Date.now());
      setTimeRemaining(remaining);
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    setTimeRemaining(Math.max(0, sessionData.expiresAt - Date.now()));
    return () => clearInterval(interval);
  }, [sessionData]);

  // Handle selected file additions
  const handleFilesAdded = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    sounds.playTap();
    sounds.triggerHaptic(20);

    const newStaged: StagedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const preview = f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined;
      newStaged.push({
        id: `${f.name}_${Date.now()}_${i}`,
        file: f,
        previewUrl: preview,
        progress: 0,
        status: 'pending',
      });
    }

    setStagedFiles((prev) => [...prev, ...newStaged]);
    setUploadSuccess(false);
  };

  const removeStagedFile = (id: string) => {
    sounds.playTap();
    setStagedFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  // Perform upload
  const uploadFiles = async () => {
    if (stagedFiles.length === 0 || isUploading) return;
    setIsUploading(true);
    setErrorMessage(null);
    sounds.playTap();

    const formData = new FormData();
    stagedFiles.forEach((item) => {
      formData.append('files', item.file);
    });
    formData.append('deviceName', deviceName);

    try {
      // Use XMLHttpRequest for precise progress callbacks
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/api/sessions/${sessionId}/upload`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setStagedFiles((prev) =>
              prev.map((item) => ({
                ...item,
                progress: percent,
                status: 'uploading',
              }))
            );

            // Inform desktop in real-time
            sendMessage({
              type: 'upload_progress',
              fileName: stagedFiles[0]?.file.name || 'Files',
              progress: percent,
              totalBytes: event.total,
              loadedBytes: event.loaded,
              deviceName,
            });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error('Upload failed'));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(formData);
      });

      // Successful upload!
      sounds.playUploadSuccess();
      sounds.triggerHaptic([60, 40, 80]);

      // Fire confetti burst
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.65 },
          colors: ['#3b82f6', '#6366f1', '#10b981', '#f59e0b'],
        });
      } catch {}

      setUploadedTotalCount((c) => c + stagedFiles.length);
      setStagedFiles([]);
      setUploadSuccess(true);
    } catch (err: any) {
      console.error('Upload error:', err);
      setErrorMessage(err.message || 'File transfer failed. Please try again.');
      setStagedFiles((prev) =>
        prev.map((item) => ({
          ...item,
          status: 'error',
          errorMessage: 'Failed to send',
        }))
      );
    } finally {
      setIsUploading(false);
    }
  };

  if (errorMessage && !sessionData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-white">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
          <X className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">Bridge Closed</h2>
        <p className="text-sm text-slate-400 max-w-sm mb-6">{errorMessage}</p>
        <button
          onClick={() => (window.location.href = '/')}
          className="px-6 py-3 rounded-2xl bg-white text-slate-900 font-semibold text-sm active:scale-95 transition-transform"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col justify-between selection:bg-blue-500/20 pb-safe">
      {/* Hidden file inputs */}
      <input
        ref={galleryInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => handleFilesAdded(e.target.files)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFilesAdded(e.target.files)}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="*/*"
        className="hidden"
        onChange={(e) => handleFilesAdded(e.target.files)}
      />

      {/* Top iOS App Bar */}
      <header className="sticky top-0 z-30 px-4 py-3 border-b border-slate-200/80 dark:border-slate-800/80 apple-glass flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">PhoneBridge</h1>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
              <span>{isConnected ? 'Connected to PC' : 'Connecting...'}</span>
            </div>
          </div>
        </div>

        {/* Countdown timer badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200/60 dark:bg-slate-800/80 text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{formatTimeRemaining(timeRemaining)}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col gap-4">
        {/* Device pairing card */}
        <div className="p-4 rounded-2xl apple-glass-card border border-white/60 dark:border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">Active Bridge</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Code: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{sessionData?.pairCode || '...'}</span>
              </p>
            </div>
          </div>

          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/50">
            Encrypted
          </span>
        </div>

        {/* Success Card */}
        {uploadSuccess && (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-emerald-700 dark:text-emerald-400">
              Transferred to PC!
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Files are now instantly available on your computer screen.
            </p>
          </div>
        )}

        {/* Error notification */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400">
            {errorMessage}
          </div>
        )}

        {/* Selected files preview queue */}
        {stagedFiles.length > 0 && (
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <span>Selected for transfer ({stagedFiles.length})</span>
              <span>{formatBytes(stagedFiles.reduce((acc, f) => acc + f.file.size, 0))}</span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {stagedFiles.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm relative overflow-hidden"
                >
                  {/* Thumbnail / icon */}
                  {item.previewUrl ? (
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="w-12 h-12 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                      <FolderOpen className="w-5 h-5" />
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex-1 min-w-0 pr-6">
                    <p className="text-xs font-medium truncate text-slate-900 dark:text-white">
                      {item.file.name}
                    </p>
                    <p className="text-[11px] text-slate-400">{formatBytes(item.file.size)}</p>

                    {item.status === 'uploading' && (
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-150"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Remove button */}
                  {!isUploading && (
                    <button
                      onClick={() => removeStagedFile(item.id)}
                      className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state prompt if nothing staged */}
        {stagedFiles.length === 0 && !uploadSuccess && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center rounded-3xl apple-glass-card border border-white/60 dark:border-slate-800/60 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
              Select Photos or Documents
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
              Files will stream directly to your PC screen. They exist only for this session.
            </p>
          </div>
        )}
      </main>

      {/* Thumb-Zone Bottom Action Bar */}
      <footer className="p-4 apple-glass border-t border-slate-200/80 dark:border-slate-800/80 max-w-md w-full mx-auto space-y-2.5">
        {stagedFiles.length > 0 ? (
          /* Primary Upload CTA Button */
          <button
            onClick={uploadFiles}
            disabled={isUploading}
            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all cursor-pointer"
          >
            {isUploading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Sending to PC...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-5 h-5" />
                <span>Send {stagedFiles.length} {stagedFiles.length === 1 ? 'Item' : 'Items'} to PC</span>
              </>
            )}
          </button>
        ) : (
          /* Selection Action Grid */
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                sounds.playTap();
                galleryInputRef.current?.click();
              }}
              className="h-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center gap-1.5 text-slate-700 dark:text-slate-200 active:scale-95 transition-transform cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-medium">Photos</span>
            </button>

            <button
              onClick={() => {
                sounds.playTap();
                cameraInputRef.current?.click();
              }}
              className="h-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center gap-1.5 text-slate-700 dark:text-slate-200 active:scale-95 transition-transform cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Camera className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-medium">Camera</span>
            </button>

            <button
              onClick={() => {
                sounds.playTap();
                fileInputRef.current?.click();
              }}
              className="h-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center gap-1.5 text-slate-700 dark:text-slate-200 active:scale-95 transition-transform cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <FolderOpen className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-medium">Files</span>
            </button>
          </div>
        )}

        {/* Secondary options */}
        <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
          <span>Zero cloud trace</span>
          {onExit && (
            <button
              onClick={() => {
                sounds.playTap();
                onExit();
              }}
              className="hover:text-rose-500 cursor-pointer"
            >
              Disconnect
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
