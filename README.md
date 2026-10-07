# PhoneBridge 📱⚡️💻

An ephemeral, zero-cloud cross-device file transfer bridge inspired by Apple's Human Interface Guidelines (macOS Sequoia & iOS 26).

PhoneBridge enables users on a PC or Mac to request files from any smartphone via an instant, single-use QR code session. Photos and documents stream directly into the desktop workspace in real time and automatically self-destruct once the session finishes or times out.

---

## ✨ Features

- **Zero Cloud Storage & No Accounts**: No sign-ups, no permanent databases, no third-party cloud buckets. Staging lives exclusively in memory and an isolated temporary disk directory (`/tmp/phonebridge-sessions/*`).
- **Instant QR Pairing**: Point your phone camera at the screen to establish a real-time WebSocket channel.
- **Human-Readable Pair Codes**: 6-character fallback pairing code (e.g. `7K9-W2P`) for devices without a functional camera.
- **Real-Time Cross-Device Sync**: Real-time WebSocket event streaming shows live upload progress bars as photos transfer from phone to PC.
- **macOS Quick Look & Clipboard**: Click any received photo to open a macOS-style Spacebar preview modal with single-click "Copy Image to Clipboard" (ready for pasting directly into Photoshop, Figma, Slack, or Word).
- **Batch ZIP Archiving**: Download all staged files in one clean `.zip` archive on demand.
- **10-Minute Ephemeral Lifecycle**: Built-in countdown ring with "+5 Min" extensions and immediate "Wipe Session & Obliterate Files" cleanup.
- **In-App Mobile Device Simulator**: Test the entire mobile photo selection and camera upload experience right on your desktop screen with an interactive iPhone 16 Pro mockup frame.
- **Apple Sound Synthesis & Haptics**: Native Web Audio API synth produces authentic AirDrop chords, upload whooshes, and haptic vibrations with zero external audio assets.
- **Apple Human Interface Design**: Frosted glassmorphism, Cupertino type hierarchy, dark and light mode, and thumb-zone ergonomic mobile controls.

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Canvas Confetti.
- **Backend**: Node.js, Express, `ws` (WebSockets), Multer (ephemeral disk storage), JSZip, `qrcode`.
- **Protocol**:
  - `POST /api/sessions/create`: Generates single-use session token and QR code.
  - `POST /api/sessions/:sessionId/upload`: Multipart stream to temporary session folder.
  - `GET /api/sessions/:sessionId/download-all`: Dynamic on-the-fly zip packaging.
  - `POST /api/sessions/:sessionId/wipe`: Instant recursive disk unlink.
  - `ws://`: Bi-directional real-time presence, upload progress notifications, and file arrival triggers.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
npm install
```

### Development

Start the unified full-stack server (runs Express and mounts Vite on port 3000):

```bash
npm run dev
```

Open `http://localhost:3000` in your desktop browser.

### Production Build & Deployment

Build the optimized client bundle:

```bash
npm run build
```

Run in production mode:

```bash
npm start
```

---

## 🔒 Security Principles

1. **Isolation**: Every transfer session is segregated by a unique cryptographically secure UUID.
2. **Volatile Storage**: Files are unlinked upon session end or server shutdown (`SIGINT`/`SIGTERM`).
3. **Automatic Cleanup**: A background worker audits active sessions every 10 seconds and deletes any session older than its expiration timestamp.
