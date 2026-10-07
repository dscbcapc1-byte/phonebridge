import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { DesktopView } from './components/DesktopView';
import { MobileView } from './components/MobileView';
import { MobileSimulator } from './components/MobileSimulator';
import { QuickLookModal } from './components/QuickLookModal';
import { SecurityModal } from './components/SecurityModal';
import { HowItWorksModal } from './components/HowItWorksModal';
import { PairCodeModal } from './components/PairCodeModal';
import { BridgeFile, SessionData } from './types/bridge';
import { sounds } from './utils/audio';

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('phonebridge_dark_mode');
      if (saved !== null) return saved === 'true';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Sound effects state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('phonebridge_sound');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });

  // Active Session state
  const [session, setSession] = useState<SessionData | null>(null);

  // Modals state
  const [simulatorOpen, setSimulatorOpen] = useState<boolean>(false);
  const [securityModalOpen, setSecurityModalOpen] = useState<boolean>(false);
  const [howItWorksModalOpen, setHowItWorksModalOpen] = useState<boolean>(false);
  const [pairCodeModalOpen, setPairCodeModalOpen] = useState<boolean>(false);
  const [quickLookFile, setQuickLookFile] = useState<BridgeFile | null>(null);
  const [allFiles, setAllFiles] = useState<BridgeFile[]>([]);

  // Detect if current URL indicates a mobile client
  const [isMobileMode, setIsMobileMode] = useState<boolean>(false);
  const [mobileSessionId, setMobileSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Sync sound setting
    sounds.enabled = soundEnabled;
    localStorage.setItem('phonebridge_sound', String(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    // Sync dark mode class
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('phonebridge_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  // Route / parameter parsing
  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);

    // Mobile path /m/:sessionId
    const mobileMatch = path.match(/^\/m\/([a-zA-Z0-9_-]+)/);
    if (mobileMatch && mobileMatch[1]) {
      setIsMobileMode(true);
      setMobileSessionId(mobileMatch[1]);
      return;
    }

    // Query param mode=mobile&session=...
    if (params.get('mode') === 'mobile' && params.get('session')) {
      setIsMobileMode(true);
      setMobileSessionId(params.get('session'));
      return;
    }

    // Desktop existing session param ?session=...
    const desktopSessionId = params.get('session');
    if (desktopSessionId) {
      fetch(`/api/sessions/${desktopSessionId}`)
        .then((res) => {
          if (!res.ok) throw new Error('Not found');
          return res.json();
        })
        .then((data) => {
          const host = window.location.host;
          const protocol = window.location.protocol;
          const mobileUrl = `${protocol}//${host}/m/${data.id}`;
          // Generate QR Code if needed or reuse
          import('qrcode').then(({ default: QRCode }) => {
            QRCode.toDataURL(mobileUrl, { margin: 2, scale: 8 }).then((qrDataUrl) => {
              setSession({
                sessionId: data.id,
                pairCode: data.pairCode,
                createdAt: data.createdAt,
                expiresAt: data.expiresAt,
                mobileUrl,
                qrDataUrl,
                ttlMs: 10 * 60 * 1000,
              });
              if (data.files) {
                setAllFiles(data.files);
              }
            });
          });
        })
        .catch(() => {
          // Clear query param if invalid
          window.history.replaceState({}, '', '/');
        });
    }
  }, []);

  // Create new session handler
  const handleCreateSession = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions/create', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create session');
      const data: SessionData = await res.json();
      setSession(data);
      setAllFiles([]);
      window.history.replaceState({}, '', `/?session=${data.sessionId}`);
    } catch (err) {
      console.error('Session creation error:', err);
    }
  }, []);

  // Wipe active session handler
  const handleWipeSession = useCallback(async () => {
    if (!session) return;
    try {
      await fetch(`/api/sessions/${session.sessionId}/wipe`, { method: 'POST' });
      setSession(null);
      setAllFiles([]);
      setSimulatorOpen(false);
      setQuickLookFile(null);
      window.history.replaceState({}, '', '/');
    } catch (err) {
      console.error('Session wipe error:', err);
    }
  }, [session]);

  // Connect via pairing code
  const handleConnectCode = useCallback(async (code: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/sessions/resolve-code/${encodeURIComponent(code)}`);
      if (!res.ok) return false;
      const data = await res.json();
      if (data.sessionId) {
        // Direct to mobile session view or desktop session view
        window.location.href = `/?session=${data.sessionId}`;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // Delete individual file
  const handleDeleteFile = useCallback(async (fileId: string) => {
    if (!session) return;
    try {
      await fetch(`/api/sessions/${session.sessionId}/files/${fileId}`, {
        method: 'DELETE',
      });
      setAllFiles((prev) => prev.filter((f) => f.id !== fileId));
      if (quickLookFile?.id === fileId) {
        setQuickLookFile(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  }, [session, quickLookFile]);

  // If this device opened as a dedicated mobile client
  if (isMobileMode && mobileSessionId) {
    return (
      <div className={isDarkMode ? 'dark' : ''}>
        <MobileView
          sessionId={mobileSessionId}
          onExit={() => {
            window.location.href = '/';
          }}
        />
      </div>
    );
  }

  // Desktop PC Application
  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 ${isDarkMode ? 'dark' : ''}`}>
      {/* Top Bar Navigation */}
      <Header
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        onOpenSecurity={() => setSecurityModalOpen(true)}
        onOpenHowItWorks={() => setHowItWorksModalOpen(true)}
        onOpenPairCodeModal={() => setPairCodeModalOpen(true)}
        hasActiveSession={Boolean(session)}
        onNewSession={handleCreateSession}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col">
        <DesktopView
          session={session}
          onCreateSession={handleCreateSession}
          onWipeSession={handleWipeSession}
          onOpenSimulator={() => setSimulatorOpen(true)}
          onSelectQuickLook={(file) => setQuickLookFile(file)}
        />
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200/60 dark:border-slate-800/60 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">PhoneBridge</span>
            <span>· Instant Ephemeral Air-Drop for Web</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Zero Account Required</span>
            <span>·</span>
            <span>Self-Destructing Staging</span>
            <span>·</span>
            <span>Apple HIG Aesthetics</span>
          </div>
        </div>
      </footer>

      {/* Mobile Simulator Frame */}
      {session && (
        <MobileSimulator
          sessionId={session.sessionId}
          isOpen={simulatorOpen}
          onClose={() => setSimulatorOpen(false)}
        />
      )}

      {/* Quick Look macOS Modal */}
      <QuickLookModal
        file={quickLookFile}
        files={allFiles}
        onClose={() => setQuickLookFile(null)}
        onSelectFile={(f) => setQuickLookFile(f)}
        onDeleteFile={handleDeleteFile}
      />

      {/* Security Info Modal */}
      <SecurityModal
        isOpen={securityModalOpen}
        onClose={() => setSecurityModalOpen(false)}
      />

      {/* How It Works Modal */}
      <HowItWorksModal
        isOpen={howItWorksModalOpen}
        onClose={() => setHowItWorksModalOpen(false)}
      />

      {/* Pair Code Entry Modal */}
      <PairCodeModal
        isOpen={pairCodeModalOpen}
        onClose={() => setPairCodeModalOpen(false)}
        onConnectCode={handleConnectCode}
      />
    </div>
  );
}
