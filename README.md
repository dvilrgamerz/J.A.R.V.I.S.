# J.A.R.V.I.S. Web AI V3

A private, keyless, multi-model AI assistant that runs directly in the browser.

J.A.R.V.I.S. V3 uses Transformers.js with local browser inference. No Gemini key, OpenAI key, Ollama server, or paid AI backend is required.

## V3 highlights

- Three local model tiers: Lite, Standard, and Power
- Automatic device-aware model choice
- Turbo, Balanced, Smart, and Auto inference modes
- WebGPU acceleration with CPU/WASM fallback
- Live token streaming and real Stop generation
- Multiple local chat sessions
- Edit/resend, regenerate, and copy controls
- User-approved local text/code file chat
- Relevant-file excerpt retrieval
- Lightweight local vector-style memory ranking
- Standard, Buddy, Programmer, and Study personalities
- Voice input, spoken replies, and optional hands-free conversation
- Built-in calculator, unit converter, timer, notes, and search launcher
- First-token and total-response timing
- Privacy center with export/import and local-data controls
- Installable PWA manifest and offline app shell
- Netlify-ready static deployment
- No AI API key

## Local models

| Tier | Model | Intended use |
| --- | --- | --- |
| **Lite** | HuggingFaceTB/SmolLM2-360M-Instruct | Phones, weak PCs, CPU fallback |
| **Standard** | onnx-community/Qwen2.5-0.5B-Instruct | Normal devices |
| **Power** | onnx-community/Qwen2.5-1.5B-Instruct | Strong WebGPU devices |

V3 only keeps one language model active at a time. Switching models releases the old pipeline before loading the new one.

The Power model is substantially larger than the others and can require a large browser download and more memory.

## Auto model selection

When Auto is selected:

- no WebGPU → Lite
- WebGPU on normal hardware → Standard
- WebGPU + higher reported memory/thread count → Power

You can override the choice at any time.

## AI architecture

```text
Browser
  |
  +-- React V3 HUD
  |
  +-- Local session + memory + file state
  |
  +-- Dedicated AI Web Worker
        |
        +-- Transformers.js
              |
              +-- Lite / Standard / Power model
              |
              +-- WebGPU
              |     or
              +-- WASM / CPU
```

## Stop generation

V3 uses Transformers.js interruptible stopping criteria.

Press Stop while a response is being generated and the local model stops on its next generation step. The partial answer remains visible and is marked as stopped.

## Memory engine

V3 stores memories locally in browser storage.

For each request it converts the current question and memories into lightweight local hashed text vectors, ranks saved memories by similarity and recency, and sends only the most relevant memories to the model.

This is intentionally lightweight and requires no second embedding-model download.

## Local file chat

Use **Add local files** to attach supported text/code documents.

Supported formats include TXT, Markdown, JSON, CSV, JavaScript, TypeScript, JSX/TSX, Python, HTML/CSS, XML, and YAML.

Limits:

- up to 5 attached files
- up to 300 KB per file
- text/code formats only

Files are read only after explicit user selection. V3 splits files into chunks, ranks chunks against the current question, and sends only the most relevant excerpts to the local language model.

Attached file contents are kept in current page memory rather than automatically written to long-term J.A.R.V.I.S. storage.

## Chat sessions

V3 supports multiple local sessions. You can create, switch, delete, or clear sessions; edit an older user message and resend it; regenerate a response; and copy assistant output.

Up to 30 sessions are retained in local browser storage.

## Personalities

- **Standard** — calm and efficient
- **Buddy** — friendly and relaxed
- **Programmer** — technical and debugging-focused
- **Study** — explanation/teaching focused

Personality settings are separate from saved factual memories.

## Built-in local tools

```text
/calc 12 * (3 + 4)
/convert 5 km to mi
/convert 10 kg to lb
/convert 30 c to f
/timer 30s
/timer 5m
/note Remember this
/search your query
/youtube
/github
/clear
/load
```

Calculator input is restricted to numeric arithmetic characters/operators.

## Voice

V3 supports browser speech recognition when available and browser speech synthesis for spoken replies.

Hands-free mode can automatically reopen listening after J.A.R.V.I.S. finishes speaking. Browser voice support varies by device/browser.

## Privacy Center

The Privacy Center can export sessions, memories, and settings; import a V3 backup; clear accessible app caches; clear local J.A.R.V.I.S. data; and show counts for sessions, memories, and attached files.

Model files are managed by browser/model caching systems. Some model storage may require the browser's own site-data controls to fully remove.

## PWA / install

V3 includes `manifest.webmanifest`, standalone display metadata, and `public/sw.js` for the app shell.

The service worker caches same-origin app resources. It does not bundle the large AI model into the application package.

## Run locally

The GitHub repository name ends in a period, so on Windows clone it into a safe directory name:

```powershell
git clone https://github.com/dvilrgamerz/J.A.R.V.I.S..git jarvis-web
cd jarvis-web
npm install
npm run dev
```

## Build

```powershell
npm run build
```

Output:

```text
dist/
```

## Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- AI API environment variables: **none**

## Browser limitations

A normal web app cannot silently run arbitrary PowerShell/CMD, launch arbitrary native programs, inspect arbitrary local files without selection, control the operating system, or secretly access camera/microphone/accounts.

Those restrictions are intentional browser security.

## Project structure

```text
J.A.R.V.I.S.
├─ public/
│  ├─ jarvis.svg
│  ├─ manifest.webmanifest
│  └─ sw.js
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

## Future V3.x upgrades

- real embedding-model semantic memory
- fully local Whisper-style speech recognition
- richer agent/task timeline with step approvals
- browser permission dashboard
- optional user-approved URL ingestion
- model-cache management with exact per-model storage
- local RAG indexes for larger document sets
- richer Markdown/code rendering

## License

MIT.

This is an original J.A.R.V.I.S.-inspired project and is not affiliated with Marvel or Disney.
