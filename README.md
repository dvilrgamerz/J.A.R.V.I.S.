# J.A.R.V.I.S. Web AI V4

J.A.R.V.I.S. V4 is a **private, keyless, multi-model AI web app** that runs language-model inference inside the browser.

No Gemini key, OpenAI key, Ollama server, or paid AI backend is required.

## What V4 adds

V4 keeps the V3 multi-model local AI foundation and adds:

- **Agent Workspace** with approval-based task planning
- manual Start / Complete / Skip / Reopen controls for every agent step
- Ask JARVIS action for the currently approved step
- richer Markdown output
- tables, headings, lists, links, inline code, and fenced code blocks
- explicit **Permissions Center**
- microphone capability toggle
- local-file capability toggle
- clipboard capability toggle
- timer-notification capability toggle
- **Unload Model** control to release the active model pipeline
- estimated output tokens
- approximate tokens-per-second telemetry
- stronger hybrid local retrieval using words, phrase features, and character features
- V4 backup/export now includes permissions and agent-plan state
- updated V4 installable PWA shell

## Agent Workspace

Agent Workspace turns a goal into a short task plan.

Example:

```text
Goal: Build and test the next version of my website
```

J.A.R.V.I.S. generates a small list of concrete steps. You then control each step:

- **Start**
- **Ask JARVIS**
- **Complete**
- **Skip**
- **Reopen**

V4 does **not** silently execute operating-system or browser actions. The agent is deliberately approval-based so the user remains in control.

## Local models

| Tier | Model | Intended use |
| --- | --- | --- |
| **Lite** | HuggingFaceTB/SmolLM2-360M-Instruct | phones, weak PCs, CPU fallback |
| **Standard** | onnx-community/Qwen2.5-0.5B-Instruct | normal devices |
| **Power** | onnx-community/Qwen2.5-1.5B-Instruct | stronger WebGPU devices |

Auto mode chooses a model from available browser capabilities.

Only one model pipeline is kept active at a time. Use **Unload Model** to release the active pipeline reference when you want to free memory.

## Inference modes

- **Auto** — device/model-aware
- **Turbo** — fastest and shortest
- **Balanced** — everyday use
- **Smart** — longer context and deeper output

## Response telemetry

V4 shows:

- first-text latency
- total generation time
- estimated output tokens
- approximate tokens per second

Tokens-per-second is an estimate based on generated text length, not tokenizer-exact benchmarking.

## Rich responses

Assistant messages are rendered as Markdown with GitHub-flavored Markdown support.

Supported presentation includes:

- headings
- lists
- tables
- links
- blockquotes
- inline code
- fenced code blocks

## Permissions Center

V4 adds an app-level capability layer for:

- microphone
- local files
- clipboard
- timer notifications

These switches do not bypass browser permission systems. The browser can still deny a capability even when it is enabled inside J.A.R.V.I.S.

## Memory and file retrieval

V4 keeps user-approved memories in browser storage.

For retrieval, it builds lightweight local feature vectors from:

- useful words
- adjacent-word phrase features
- character-level features

It ranks memories and file chunks locally and injects only the most relevant context into the prompt.

This keeps V4 keyless and avoids downloading a second embedding model.

## Local file chat

Supported files:

- TXT
- Markdown
- JSON
- CSV
- JavaScript / TypeScript
- JSX / TSX
- Python
- HTML / CSS
- XML
- YAML

Current limits:

- up to 5 attached files
- up to 300 KB each
- text/code files only

Files must be explicitly selected by the user.

## Built-in tools

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

Timer notifications are shown only when enabled in V4 Permissions and granted by the browser.

## Voice

V4 keeps:

- browser speech recognition when supported
- speech synthesis
- optional hands-free conversation loop

Microphone capability can be disabled independently in V4 Permissions.

## Sessions and editing

V4 supports:

- multiple local sessions
- edit + resend
- regenerate
- copy
- stop generation
- session deletion/clearing

## Privacy Center

V4 can export/import:

- chat sessions
- memories
- model/mode/personality settings
- permission settings
- active agent plan

It can also clear local app state and accessible app caches.

## PWA / offline shell

V4 includes:

- `manifest.webmanifest`
- standalone install metadata
- `public/sw.js`
- same-origin app-shell caching

Large AI model downloads remain browser/model-host managed rather than being bundled into the PWA shell.

## Architecture

```text
Browser
  |
  +-- React V4 HUD
  |     +-- sessions
  |     +-- Agent Workspace
  |     +-- permissions
  |     +-- files + memory
  |     +-- local tools
  |
  +-- AI Web Worker
        +-- model switching
        +-- streaming
        +-- interrupt/stop
        +-- agent planning
        +-- hybrid retrieval
        +-- WebGPU / WASM
```

## Run locally

The GitHub repository name ends in a period, so clone it into a Windows-safe directory name:

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

The static build is generated in:

```text
dist/
```

## Netlify

- build command: `npm run build`
- publish directory: `dist`
- AI API environment variables: **none**

## Browser limitations

A browser web app cannot silently:

- run arbitrary PowerShell or CMD
- launch arbitrary native applications
- inspect arbitrary local files without selection
- take unrestricted operating-system control
- secretly access camera, microphone, clipboard, or accounts

These restrictions are intentional.

## Possible V4.x upgrades

- dedicated local embedding model
- local Whisper-style speech recognition
- persistent indexed document library
- URL ingestion with explicit user permission
- richer per-model storage management
- syntax highlighting
- more advanced task dependencies and subtasks

## License

MIT.

This is an original J.A.R.V.I.S.-inspired project and is not affiliated with Marvel or Disney.
