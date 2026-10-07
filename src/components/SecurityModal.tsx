import React from 'react';
import { X, ShieldCheck, HardDrive, Timer, EyeOff, Lock } from 'lucide-react';
import { sounds } from '../utils/audio';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-3xl apple-glass-card border border-white/40 dark:border-slate-800/80 p-6 sm:p-8 shadow-2xl relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="security-title"
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

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/50 dark:border-emerald-800/40">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 id="security-title" className="text-lg font-semibold text-slate-900 dark:text-white">
              Zero-Cloud Ephemeral Security
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              How PhoneBridge protects your files and privacy
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <div className="flex gap-3.5 items-start">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
              <EyeOff className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-0.5">
                No Cloud Accounts or Databases
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                We never ask for sign-ups, passwords, emails, or phone numbers. No persistent database entries are ever created.
              </p>
            </div>
          </div>

          <div className="flex gap-3.5 items-start">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Timer className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-0.5">
                Automatic Self-Destruction
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Active sessions expire automatically after 10 minutes. When the timer hits zero or you click &quot;Wipe Session&quot;, files are permanently deleted.
              </p>
            </div>
          </div>

          <div className="flex gap-3.5 items-start">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-0.5">
                Volatile Staging Memory
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Transfers are placed exclusively in isolated sandboxed temporary directories that are purged upon session close.
              </p>
            </div>
          </div>

          <div className="flex gap-3.5 items-start">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-0.5">
                Cryptographic Isolation
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Every session is sealed behind high-entropy UUID tokens and single-session WebSocket channels.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex justify-end">
          <button
            onClick={() => {
              sounds.playTap();
              onClose();
            }}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
