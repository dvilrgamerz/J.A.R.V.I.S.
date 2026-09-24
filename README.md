# J.A.R.V.I.S. Web AI V3

A futuristic **keyless AI web app** inspired by J.A.R.V.I.S.

J.A.R.V.I.S. runs a quantized language model directly in the browser with Transformers.js. No Gemini key, OpenAI key, Ollama service, or AI backend is required.

## V3 highlights

- Live streamed responses instead of waiting for a complete answer
- **Turbo mode** for the fastest responses
- **Balanced mode** for everyday chat
- **Smart mode** for longer, deeper responses
- WebGPU acceleration when available
- Automatic CPU/WASM fallback
- Optional **Auto Boot** so the AI core starts loading when the site opens
- First-text and total-response latency telemetry
- Smaller context in Turbo mode to reduce prefill time
- Adaptive response length by performance mode
- Dedicated AI Web Worker so inference does not freeze the interface
- Local chat history
- User-controlled local memories
- Voice input when browser speech recognition is supported
- Spoken J.A.R.V.I.S. responses
- Model download/load progress
- Browser model caching
- Animated V3 reactor HUD with live core state, streaming cursor, status effects, and responsive controls
- Static hosting support for Netlify, Vercel, GitHub Pages, and similar services

## Performance modes

| Mode | Best for | Behavior |
| --- | --- | --- |
| **Turbo** | Older PCs, fastest chat | Shorter context, deterministic output, shorter responses |
| **Balanced** | Normal use | Medium context and response length |
| **Smart** | Harder questions | More history, longer responses, more generation |

Turbo is the default.

## AI architecture

```text
Browser
  |
  +-- React V3 HUD
  |
  +-- AI Web Worker
        |
        +-- Transformers.js 4.x
              |
              +-- Qwen2.5-0.5B-Instruct (Q4)
              |
              +-- WebGPU
              |     or
              +-- WASM / CPU fallback
```

The worker uses text streaming so generated text is sent back to the React interface as it appears.

## Model

```text
onnx-community/Qwen2.5-0.5B-Instruct
dtype: q4
```

The model configuration and generation modes live in:

```text
src/ai.worker.ts
```

## First load

The first time J.A.R.V.I.S. starts, the browser has to download the model files.

After the model is cached, later loads can be much faster.

For best performance, use a current Chromium-based browser with WebGPU enabled.

## Run locally

Because the repository name ends in a period, clone it into a Windows-safe folder name:

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

This repo includes `netlify.toml`.

- Build command: `npm run build`
- Publish directory: `dist`
- AI API environment variables: **none**

## Commands

- `/load` — initialize the local AI core
- `/clear` — clear the conversation
- `/new` — start a new session
- `/youtube` — open YouTube
- `/github` — open the repository
- `/search your query` — open a browser search

## Privacy

AI inference happens locally in the browser.

Chat history and user-approved memories are stored in browser storage. The model files are fetched from their model host if they are not already cached.

Prompts do not need to be sent to Gemini, OpenAI, Claude, or another hosted LLM API for J.A.R.V.I.S. to answer.

## Browser limitations

A normal website cannot silently run PowerShell, launch arbitrary Windows programs, inspect arbitrary local files, or take unrestricted control of the computer.

That restriction is intentional browser security.

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

## Next upgrades

- Multiple local model choices
- Faster phone-specific model
- User-approved local file chat
- Better semantic memory retrieval
- Local speech recognition
- Installable/offline PWA shell
- Optional browser tools
- Smarter automatic mode selection based on device performance

## License

MIT.

This is an original J.A.R.V.I.S.-inspired project and is not affiliated with Marvel or Disney.
