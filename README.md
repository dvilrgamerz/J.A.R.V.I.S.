# J.A.R.V.I.S. Web AI

A futuristic J.A.R.V.I.S.-inspired **AI web app with no AI API key**.

The language model runs directly in the visitor's browser using Transformers.js. The default model is a 4-bit version of **Qwen2.5-0.5B-Instruct**.

## What changed in v2

- Web app instead of Electron desktop app
- No Gemini key
- No OpenAI key
- No Ollama
- No AI backend server
- Browser-native local inference
- WebGPU acceleration when available
- CPU/WASM fallback when WebGPU is unavailable
- Local chat history
- User-controlled local memories
- Voice input when the browser supports SpeechRecognition
- Spoken responses with browser speech synthesis
- Model download/load progress
- Model files can be reused from browser cache
- Static-host friendly for Netlify, Vercel, GitHub Pages, or similar hosts

## How it works

```text
Browser
  |
  +-- React UI
  |
  +-- Dedicated AI Web Worker
        |
        +-- Transformers.js
              |
              +-- Qwen2.5-0.5B-Instruct (4-bit)
              |
              +-- WebGPU when available
              +-- WASM fallback
```

There is no AI API secret to configure.

## Important browser limitation

This is a web app, so J.A.R.V.I.S. cannot silently control Windows, launch File Explorer, inspect arbitrary files, or run PowerShell. Browsers intentionally block that kind of operating-system access.

It can still provide AI chat, voice, local memory, browser actions, and links.

## Run locally

### 1. Clone

The GitHub repository name ends with a period. Windows folder names cannot end with a period, so clone into a safe folder name:

```powershell
git clone https://github.com/dvilrgamerz/J.A.R.V.I.S..git jarvis-web
cd jarvis-web
```

### 2. Install

```powershell
npm install
```

### 3. Start

```powershell
npm run dev
```

Open the localhost address shown by Vite.

## First AI load

Click **Activate AI**.

On the first load, the browser downloads the quantized model files. This can be a large download and may take longer on a slow connection. Afterward, the browser can reuse cached model files.

WebGPU is preferred for speed. If WebGPU is unavailable, J.A.R.V.I.S. automatically tries the CPU/WASM path.

## Build

```powershell
npm run build
```

The deployable site is created in:

```text
dist/
```

## Deploy to Netlify

This repo includes `netlify.toml`.

Netlify settings:

- Build command: `npm run build`
- Publish directory: `dist`
- Environment variables: **none required**

## Commands

- `/load` — activate/load AI
- `/clear` — clear the chat
- `/new` — start a new chat
- `/youtube` — open YouTube
- `/github` — open this repository
- `/search your query` — open a browser web search

## Model

Default:

```text
onnx-community/Qwen2.5-0.5B-Instruct
dtype: q4
```

The model is loaded by `src/ai.worker.ts`.

## Project structure

```text
J.A.R.V.I.S.
├─ public/
│  ├─ jarvis.svg
│  └─ manifest.webmanifest
├─ src/
│  ├─ ai.worker.ts
│  ├─ App.tsx
│  ├─ main.tsx
│  ├─ styles.css
│  └─ vite-env.d.ts
├─ index.html
├─ netlify.toml
├─ package.json
├─ tsconfig.json
└─ vite.config.ts
```

## Privacy

Chat messages and J.A.R.V.I.S. memories are stored locally in browser storage.

The AI inference itself runs in the browser. The model files are fetched from the model host when they are not already cached.

J.A.R.V.I.S. does not need to send prompts to Gemini, OpenAI, Claude, or another hosted LLM API to generate its responses.

## Current limitations

- Initial model download can be large.
- Small local models are less capable than large cloud AI models.
- WebGPU support varies by browser/device.
- Browser voice recognition support varies.
- This local model does not automatically have live internet knowledge.
- Browser security prevents unrestricted desktop control.

## Roadmap

- Model selector
- Smaller/faster model option for phones
- Streaming token output
- Fully cached PWA shell
- Optional local Whisper speech recognition
- Better local memory search
- Browser permission dashboard
- Optional user-approved file import
- More browser tools

## License

MIT.

This is an original J.A.R.V.I.S.-inspired project and is not affiliated with Marvel or Disney.
