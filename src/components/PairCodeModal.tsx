import React, { useState } from 'react';
import { X, KeyRound, ArrowRight, AlertCircle } from 'lucide-react';
import { sounds } from '../utils/audio';

interface PairCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectCode: (code: string) => Promise<boolean>;
}

export const PairCodeModal: React.FC<PairCodeModalProps> = ({ isOpen, onClose, onConnectCode }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!clean || clean.length < 5) {
      setError('Please enter a valid 6-character pairing code');
      return;
    }

    setLoading(true);
    setError(null);
    sounds.playTap();

    try {
      const success = await onConnectCode(clean);
      if (success) {
        onClose();
      } else {
        setError('Pairing code not found or expired');
      }
    } catch {
      setError('Connection failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-3xl apple-glass-card border border-white/40 dark:border-slate-800/80 p-6 sm:p-8 shadow-2xl relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pair-code-title"
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

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/50 dark:border-blue-800/40">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 id="pair-code-title" className="text-lg font-semibold text-slate-900 dark:text-white">
              Connect via Code
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter the 6-character code shown on the desktop screen
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              autoFocus
              maxLength={7}
              placeholder="e.g. 7K9-W2P"
              value={code}
              onChange={(e) => {
                let val = e.target.value.toUpperCase();
                // automatically insert dash if user types 6 letters
                if (val.length === 3 && !val.includes('-') && !code.endsWith('-')) {
                  val = val + '-';
                }
                setCode(val);
                if (error) setError(null);
              }}
              className="w-full h-14 text-center font-mono tracking-widest text-2xl uppercase rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 font-semibold"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-500 dark:text-rose-400 text-xs px-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || code.trim().length < 5}
            className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Join Session</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
