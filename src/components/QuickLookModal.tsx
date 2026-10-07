import React, { useEffect, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Copy, Check, Trash2, FileText, FileCode, Film, Music } from 'lucide-react';
import { BridgeFile } from '../types/bridge';
import { formatBytes, formatRelativeTime, copyImageToClipboard } from '../utils/format';
import { sounds } from '../utils/audio';

interface QuickLookModalProps {
  file: BridgeFile | null;
  files: BridgeFile[];
  onClose: () => void;
  onSelectFile: (file: BridgeFile) => void;
  onDeleteFile: (fileId: string) => void;
}

export const QuickLookModal: React.FC<QuickLookModalProps> = ({
  file,
  files,
  onClose,
  onSelectFile,
  onDeleteFile,
}) => {
  const [copied, setCopied] = useState(false);

  const currentIndex = file ? files.findIndex((f) => f.id === file.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < files.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      sounds.playTap();
      onSelectFile(files[currentIndex - 1]);
    }
  }, [hasPrev, currentIndex, files, onSelectFile]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      sounds.playTap();
      onSelectFile(files[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, files, onSelectFile]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        sounds.playTap();
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, onClose]);

  if (!file) return null;

  const handleCopy = async () => {
    sounds.playTap();
    const success = await copyImageToClipboard(file.viewUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      // Fallback copy link
      await navigator.clipboard.writeText(window.location.origin + file.downloadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl overflow-hidden bg-slate-900/95 border border-white/10 shadow-2xl text-white"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quicklook-title"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center gap-2 truncate pr-4">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
              Quick Look
            </span>
            <h4 id="quicklook-title" className="text-sm font-semibold truncate text-slate-100">
              {file.originalName}
            </h4>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {file.isImage && (
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 text-xs font-medium rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copy image to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Copy</span>
                  </>
                )}
              </button>
            )}

            <a
              href={file.downloadUrl}
              download={file.originalName}
              className="px-3 py-1.5 text-xs font-medium rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save</span>
            </a>

            <button
              onClick={() => {
                sounds.playSessionWipe();
                onDeleteFile(file.id);
                onClose();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Delete from session"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                sounds.playTap();
                onClose();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-1"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Media Viewing Canvas */}
        <div className="relative flex-1 min-h-[300px] sm:min-h-[460px] flex items-center justify-center p-4 bg-slate-950/60 overflow-hidden">
          {file.isImage ? (
            <img
              src={file.viewUrl}
              alt={file.originalName}
              className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-lg"
            />
          ) : file.isVideo ? (
            <video
              src={file.viewUrl}
              controls
              autoPlay
              className="max-h-[65vh] max-w-full rounded-xl shadow-lg"
            />
          ) : file.isAudio ? (
            <div className="flex flex-col items-center gap-4 p-8 bg-white/5 rounded-3xl border border-white/10 max-w-md w-full">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Music className="w-8 h-8" />
              </div>
              <p className="font-semibold text-center truncate w-full">{file.originalName}</p>
              <audio src={file.viewUrl} controls className="w-full mt-2" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 p-8 bg-white/5 rounded-3xl border border-white/10 max-w-md w-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <p className="font-semibold text-base mb-1 truncate">{file.originalName}</p>
                <p className="text-xs text-slate-400">{file.mimeType}</p>
              </div>
              <a
                href={file.downloadUrl}
                download={file.originalName}
                className="mt-2 px-5 py-2.5 rounded-xl bg-white text-slate-900 font-semibold text-xs hover:bg-slate-100 transition-colors"
              >
                Download Document
              </a>
            </div>
          )}

          {/* Navigation arrow buttons */}
          {hasPrev && (
            <button
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white flex items-center justify-center backdrop-blur-md border border-white/10 shadow-lg cursor-pointer transition-transform active:scale-90"
              title="Previous file (Left Arrow)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {hasNext && (
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white flex items-center justify-center backdrop-blur-md border border-white/10 shadow-lg cursor-pointer transition-transform active:scale-90"
              title="Next file (Right Arrow)"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-5 py-3 border-t border-white/10 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>{formatBytes(file.size)}</span>
            <span aria-hidden="true">·</span>
            <span>Uploaded {formatRelativeTime(file.uploadedAt)}</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500">
            {currentIndex + 1} of {files.length}
          </div>
        </div>
      </div>
    </div>
  );
};
