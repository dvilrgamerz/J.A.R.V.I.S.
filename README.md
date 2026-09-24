# J.A.R.V.I.S. Web AI V4.1 Cloud

J.A.R.V.I.S. V4.1 is a fast web AI assistant designed so the **language model does not run on the user's phone or laptop**.

The browser is now a thin client. Heavy AI inference runs remotely through Puter.js instead of Transformers/WebGPU on the user's device.

## Why V4.1 Cloud

The old local-browser architecture could download hundreds of MB or more of model files and use significant CPU/GPU/RAM.

V4.1 removes that local LLM runtime entirely.

Users now get:

- no local LLM download
- no local WebGPU inference
- no large AI model in device RAM
- much lower CPU/GPU load
- faster time-to-first-use
- streamed remote responses
- the existing J.A.R.V.I.S. UI, sessions, memory, files, tools, voice, and Agent Workspace

## Remote AI

V4.1 uses Puter.js remote AI with GPT-5.6 Luna as the current fast model route.

The site itself does **not** require a developer API key.

Puter uses a user-pays model: users may need to authenticate with Puter and their Puter account is responsible for AI usage/costs and provider limits.

## What still runs in the browser

Only lightweight work remains client-side:

- React UI
- chat/session storage
- local memory ranking
- small text-vector calculations
- selecting relevant file excerpts
- browser speech recognition/synthesis
- calculator/converter/timer tools
- permissions and privacy controls
- PWA shell

The actual language-model inference is remote.

## V4 Agent Workspace

Agent Workspace remains approval-based.

J.A.R.V.I.S. can generate a step plan for a goal, but it does not silently control the operating system or execute arbitrary native actions.

Each step can be:

- Start
- Ask JARVIS
- Complete
- Skip
- Reopen

## Response modes

The existing profiles now control **remote response behavior**, not local hardware load:

- **Fast Cloud** — shortest/faster replies
- **Balanced Cloud** — normal everyday answers
- **Smart Cloud** — more context and deeper answers
- **Auto Cloud** — defaults toward speed

All profiles use remote inference.

## Rich responses

Assistant replies support Markdown:

- headings
- lists
- tables
- links
- quotes
- inline code
- fenced code blocks

## Memory + file context

Memories and user-selected text/code files are still filtered locally before being sent as context.

Only relevant memory/file excerpts are added to a prompt.

Supported local file types include TXT, Markdown, JSON, CSV, JS/TS, JSX/TSX, Python, HTML/CSS, XML, and YAML.

Current limits:

- up to 5 attached files
- up to 300 KB each
- text/code files only

## Privacy note

Moving AI inference to remote infrastructure means prompts and selected context sent for an AI answer leave the device and are processed through Puter/provider infrastructure.

Do not store passwords, private keys, authentication tokens, or other secrets in J.A.R.V.I.S. memory or prompts.

## Permissions Center

V4 keeps app-level controls for:

- microphone
- local files
- clipboard
- timer notifications

Browser permission prompts still apply.

## Built-in local tools

These do not need AI inference:

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

## Architecture

```text
Phone / Laptop Browser
  |
  +-- Lightweight J.A.R.V.I.S. UI
  |     +-- sessions
  |     +-- local memory ranking
  |     +-- file excerpt selection
  |     +-- voice + tools
  |
  +-- Puter.js
        |
        +-- Remote AI provider
              |
              +-- heavy model inference on remote GPUs
```

There is no Transformers.js LLM worker in V4.1.

## Run locally

The GitHub repo name ends in a period, so on Windows clone it into a safe folder:

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

- build command: `npm run build`
- publish directory: `dist`
- developer AI API key: **none**

The frontend loads Puter.js at runtime for remote AI.

## Browser limitations

A web app still cannot silently:

- run arbitrary PowerShell or CMD
- launch arbitrary native applications
- inspect arbitrary local files without selection
- take unrestricted operating-system control
- secretly access microphone, clipboard, camera, or accounts

## License

MIT.

This is an original J.A.R.V.I.S.-inspired project and is not affiliated with Marvel or Disney.
