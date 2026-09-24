# J.A.R.V.I.S. Web AI V2

A futuristic **keyless local AI web app** inspired by J.A.R.V.I.S.

J.A.R.V.I.S. V2 runs a quantized language model directly in the browser with Transformers.js. No Gemini key, OpenAI key, Ollama service, or AI backend is required.

## V2 highlights

- **Auto performance mode** that adapts to the browser/device
- Turbo, Balanced, and Smart manual modes
- WebGPU acceleration when available
- CPU/WASM fallback when WebGPU is unavailable
- Live streamed responses
- Command queuing while the local model boots
- Smarter memory retrieval that selects memories relevant to the current question
- First-text and total-response latency telemetry
- Device tier detection: Light, Standard, or Performance
- Auto Boot option
- Local chat history
- User-controlled local memories
- Shows how many memories were used for the last reply
- Voice input when browser speech recognition is supported
- Spoken J.A.R.V.I.S. replies
- One-click copy for assistant responses
- Quick prompt cards
- Animated reactor HUD
- Static hosting support for Netlify, Vercel, GitHub Pages, and similar hosts

## Performance modes

| Mode | Best for | Behavior |
| --- | --- | --- |
| **Auto** | Most users | Picks a mode from available browser hardware |
| **Turbo** | Fastest responses | Short context, shorter responses, deterministic generation |
| **Balanced** | Everyday use | Medium context and response length |
| **Smart** | Harder questions | More history, more memories, longer output |

Auto is the default.

## AI architecture

```text
Browser
  |
  +-- React V2 HUD
  |
  +-- AI Web Worker
        |
        +-- Transformers.js
              |
              +-- Qwen2.5-0.5B-Instruct (Q4)
              |
              +-- WebGPU
              |     or
              +-- WASM / CPU fallback
```

## Smarter memory

V2 does not blindly send every saved memory to the model.

For each prompt it:

1. extracts useful keywords from the current question,
2. compares them with saved memories,
3. ranks memories by relevance and recency,
4. sends only the best matches for the selected performance mode.

This keeps the prompt smaller and reduces irrelevant context.

## Model

```text
onnx-community/Qwen2.5-0.5B-Instruct
dtype: q4
```

The local model and memory-selection logic live in:

```text
src/ai.worker.ts
```

## First load

The first time J.A.R.V.I.S. starts, the browser downloads the local model files.

Afterward, the browser can reuse cached model files.

A current Chromium-based browser with WebGPU support will usually give the best experience.

## Run locally

Because the repository name ends in a period, clone into a Windows-safe local folder:

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

The repo includes `netlify.toml`.

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

Chat history and user-approved memories are stored in browser storage. Model files are fetched from their model host if they are not already cached.

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

- Multiple local models
- Ultra-light phone model
- User-approved local file chat
- Semantic vector memory
- Local speech recognition
- Better PWA offline support
- Browser tool permission center
- Smarter automatic model selection

## License

MIT.

This is an original J.A.R.V.I.S.-inspired project and is not affiliated with Marvel or Disney.
