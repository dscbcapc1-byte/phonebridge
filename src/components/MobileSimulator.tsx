import React from 'react';
import { X, Smartphone, Wifi, Battery } from 'lucide-react';
import { MobileView } from './MobileView';
import { sounds } from '../utils/audio';

interface MobileSimulatorProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const MobileSimulator: React.FC<MobileSimulatorProps> = ({
  sessionId,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col items-center">
        {/* Simulator Header Action */}
        <div className="flex items-center justify-between w-full max-w-[390px] mb-3 px-1 text-white text-xs">
          <div className="flex items-center gap-1.5 font-medium">
            <Smartphone className="w-4 h-4 text-blue-400" />
            <span>Mobile Device Simulator</span>
          </div>
          <button
            onClick={() => {
              sounds.playTap();
              onClose();
            }}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Close Simulator"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* iPhone Frame */}
        <div className="relative w-[380px] h-[750px] bg-black rounded-[52px] p-3 shadow-2xl border-[6px] border-slate-700/80 ring-1 ring-white/20 overflow-hidden flex flex-col">
          {/* Dynamic Island */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-40 flex items-center justify-between px-3">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 ring-1 ring-white/10" />
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          {/* Screen Content Wrapper */}
          <div className="relative w-full h-full bg-white dark:bg-slate-950 rounded-[42px] overflow-hidden flex flex-col">
            {/* Status bar */}
            <div className="h-10 pt-2 px-6 flex items-center justify-between text-[11px] font-semibold text-slate-900 dark:text-white shrink-0 z-30 select-none">
              <span>9:41</span>
              <div className="flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5" />
                <Battery className="w-4 h-4" />
              </div>
            </div>

            {/* Actual Mobile View */}
            <div className="flex-1 overflow-y-auto">
              <MobileView sessionId={sessionId} onExit={onClose} />
            </div>

            {/* Home indicator bar */}
            <div className="h-4 flex items-center justify-center shrink-0">
              <div className="w-32 h-1 bg-slate-400 dark:bg-slate-600 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
