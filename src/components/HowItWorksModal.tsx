import React from 'react';
import { X, QrCode, Smartphone, Zap, Trash2 } from 'lucide-react';
import { sounds } from '../utils/audio';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-3xl apple-glass-card border border-white/40 dark:border-slate-800/80 p-6 sm:p-8 shadow-2xl relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-it-works-title"
      >
        <button
          onClick={() => {
            sounds.playTap();
            onClose();
          }}
          className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 id="how-it-works-title" className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
          How PhoneBridge Works
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Zero cables. Zero messaging apps to yourself. Zero cloud footprint.
        </p>

        <div className="space-y-4">
          <div className="flex gap-4 items-start p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/40">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm shadow-blue-500/20">
              1
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white text-xs mb-0.5 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-blue-500" />
                Scan the QR Code
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click &quot;Upload from Phone&quot; on your PC. Aim your phone camera at the QR code on screen.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/40">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm shadow-indigo-500/20">
              2
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white text-xs mb-0.5 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                Select Photos or Files
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                A clean mobile page opens instantly. Tap &quot;Photo Library&quot; or &quot;Camera&quot; and pick your files.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/40">
            <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm shadow-sky-500/20">
              3
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white text-xs mb-0.5 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-sky-500" />
                Instant Real-Time Arrival
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Files materialize in real-time on your PC. Copy images to clipboard with one click, Quick Look, or download.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/40">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm shadow-rose-500/20">
              4
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white text-xs mb-0.5 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                Automatic Self-Destruct
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                When you finish or the timer ends, every staged file is permanently obliterated from temporary disk.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex justify-end">
          <button
            onClick={() => {
              sounds.playTap();
              onClose();
            }}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
