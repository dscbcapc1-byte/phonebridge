import React from 'react';
import { Smartphone, Shield, HelpCircle, Volume2, VolumeX, Moon, Sun, KeyRound } from 'lucide-react';
import { sounds } from '../utils/audio';

interface HeaderProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenSecurity: () => void;
  onOpenHowItWorks: () => void;
  onOpenPairCodeModal: () => void;
  hasActiveSession: boolean;
  onNewSession?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isDarkMode,
  onToggleDarkMode,
  soundEnabled,
  onToggleSound,
  onOpenSecurity,
  onOpenHowItWorks,
  onOpenPairCodeModal,
  hasActiveSession,
  onNewSession,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200/80 dark:border-slate-800/80 apple-glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Zone 1: Wordmark with subtle AirDrop bridge indicator */}
        <div className="flex items-center gap-3">
          <a
            href="/"
            onClick={(e) => {
              if (window.location.search || window.location.pathname !== '/') {
                // allow normal navigation
              } else {
                e.preventDefault();
              }
            }}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 p-0.5 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform flex items-center justify-center">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[10px] flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Smartphone className="w-4 h-4" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                PhoneBridge
              </span>
            </div>
          </a>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            Zero Cloud
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            onClick={() => {
              sounds.playTap();
              onOpenHowItWorks();
            }}
            className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <HelpCircle className="w-3.5 h-3.5 opacity-70" />
            How It Works
          </button>
          <button
            onClick={() => {
              sounds.playTap();
              onOpenSecurity();
            }}
            className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Shield className="w-3.5 h-3.5 opacity-70" />
            Security & Privacy
          </button>
          <button
            onClick={() => {
              sounds.playTap();
              onOpenPairCodeModal();
            }}
            className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5 opacity-70" />
            Enter Code
          </button>
        </nav>

        {/* Zone 3: Actions & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Audio toggle */}
          <button
            onClick={() => {
              onToggleSound();
              if (!soundEnabled) sounds.playTap();
            }}
            title={soundEnabled ? 'Mute UI sounds' : 'Enable UI sounds'}
            aria-label="Toggle audio effects"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 opacity-50" />}
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => {
              sounds.playTap();
              onToggleDarkMode();
            }}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* New Transfer action button if active */}
          {hasActiveSession && onNewSession && (
            <button
              onClick={() => {
                sounds.playTap();
                onNewSession();
              }}
              className="hidden sm:inline-flex items-center px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              New Transfer
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
