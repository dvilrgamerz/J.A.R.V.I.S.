# J.A.R.V.I.S.

A futuristic desktop AI assistant built with **Electron + React + TypeScript**.

## Current v1 features

- Gemini-powered AI chat
- J.A.R.V.I.S.-style animated HUD
- Push-to-talk voice input when supported by the Electron/Chromium build
- Spoken AI replies with speech synthesis
- Local chat history
- User-controlled local memory
- Live CPU, RAM, host, and uptime information
- Safe quick actions for Calculator, Notepad, Paint, File Explorer, and YouTube
- Permission-gated Electron IPC with context isolation
- No arbitrary shell command execution
- Gemini API key stays in the Electron main process
- Windows installer build with electron-builder

## Run it

### 1. Install Node.js

Use Node.js 20 or newer.

### 2. Clone and install

The GitHub repository name ends in a period. Windows paths cannot end in a period, so clone it into a safe local folder name:

```bash
git clone https://github.com/dvilrgamerz/J.A.R.V.I.S..git jarvis-app
cd jarvis-app
npm install
```

### 3. Configure Gemini

Copy the example environment file:

**Windows PowerShell**

```powershell
Copy-Item .env.example .env
```

Then edit `.env`:

```env
GEMINI_API_KEY=your_real_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Never commit your `.env` file.

### 4. Start development mode

```bash
npm run dev
```

### 5. Build

```bash
npm run build
npm start
```

### 6. Create a Windows installer

```bash
npm run dist
```

## Commands

Inside J.A.R.V.I.S. you can type:

- `/calc` — Calculator
- `/notepad` — Notepad
- `/paint` — Paint
- `/files` — File Explorer
- `/youtube` — YouTube
- `/clear` — Clear chat

Natural commands like **"open calculator"** and **"open files"** also work.

## Architecture

```text
jarvis-app/
├─ electron/
│  ├─ main.ts          # Gemini, system info, safe desktop actions
│  └─ preload.ts       # narrow IPC bridge
├─ src/
│  ├─ App.tsx          # assistant UI + chat + voice + memory
│  ├─ main.tsx
│  ├─ styles.css
│  └─ vite-env.d.ts
├─ .env.example
├─ index.html
├─ package.json
├─ tsconfig.json
├─ tsconfig.electron.json
└─ vite.config.ts
```

## Security design

The renderer does **not** have Node.js access. Electron uses `contextIsolation: true` and `nodeIntegration: false`. The preload bridge exposes only a small set of methods.

Desktop app launching is allowlisted in the main process. J.A.R.V.I.S. v1 cannot execute arbitrary PowerShell, CMD, shell scripts, or user-supplied executable paths.

## Roadmap

- Wake word support
- Optional offline/local model provider
- Calendar and email integrations
- Weather/news cards
- Better long-term memory with an explicit memory manager
- Optional screen understanding with per-action permission prompts
- Plugin/tool system with capability permissions
- Windows tray mode
- Custom themes, HUD widgets, and personality controls

## Note

This is an original J.A.R.V.I.S.-inspired assistant project and is not affiliated with Marvel or Disney.
