# J.A.R.V.I.S. Web AI V5.3 Cloud

J.A.R.V.I.S. V5 is a **thin-client remote AI assistant**. The heavy language model does not run on the user's phone or PC.

## V5 upgrades

- vertical up/down layout on phone and PC
- no page-level sideways scrolling
- sticky chat composer
- Jump to Top and Jump to Latest controls
- auto-follow new replies until the user manually scrolls upward
- remote model routing
- automatic fallback when a preferred remote model route fails
- optional **Research mode** for current web answers
- streamed normal chat responses
- V5 service-worker cache version to replace older V4 assets
- all V4 Agent, memory, file, voice, privacy, and tool features remain

## Remote routing

V5 asks Puter for the currently available AI model catalogue.

The router prefers fast GPT-5.6 routes for normal use and can prefer a stronger GPT-5.6 Sol route in Smart mode if Puter exposes one. If a preferred route fails before producing an answer, V5 tries another compatible remote route.

The app still contains **no local LLM runtime**.

## Research mode

Turn **Research** on in the quick tools bar when you need current information.

V5 uses Puter's OpenAI-compatible web-search tool with GPT-5.6 Luna. Research answers are instructed to include useful source links and separate current web findings from general model knowledge.

Research mode can take longer than normal chat because it performs live search.

## Phone + PC scrolling

V5 is designed around vertical scrolling:

- phone layout stacks sections vertically
- PC main workspace scrolls up/down
- page-level horizontal overflow is blocked
- controls wrap instead of pushing the page sideways
- chat has its own vertical scroll area
- composer stays reachable near the bottom
- Jump to Top and Jump to Latest buttons are available
- automatic follow stops if the user scrolls upward

Code blocks and wide Markdown tables may still scroll horizontally **inside their own content box** so they stay readable without moving the entire app sideways.

## Cloud architecture

```text
Phone / PC
  |
  +-- Lightweight React UI
  |     +-- chat sessions
  |     +-- memory ranking
  |     +-- file excerpt selection
  |     +-- voice + local tools
  |
  +-- Puter.js
        |
        +-- Model router / failover
        |
        +-- Remote AI GPU inference
        |
        +-- Optional live web search
```

No Transformers.js model or WebGPU LLM worker is included.

## Agent Workspace

The V5 Agent Workspace remains approval-based:

- Start
- Ask JARVIS
- Complete
- Skip
- Reopen

Plans use the same remote routing/fallback system.

## Response modes

- **Auto** — automatic remote route
- **Turbo** — shortest/faster output
- **Balanced** — everyday use
- **Smart** — larger context/deeper output and stronger route when available

These settings affect remote inference behavior, not device AI load.

## Memory + files

J.A.R.V.I.S. can locally rank saved memories and user-selected text/code file excerpts before including relevant context in the remote prompt.

Supported text/code files include TXT, Markdown, JSON, CSV, JS/TS, JSX/TSX, Python, HTML/CSS, XML, and YAML.

Current limits:

- up to 5 attached files
- up to 300 KB each

## Privacy

The LLM runs remotely. Prompts and selected memory/file excerpts included in an AI request can leave the device and be processed by Puter/provider infrastructure.

Do not send passwords, private keys, auth tokens, or other secrets.

Research mode additionally sends the request through the remote AI web-search workflow.

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

## Build

```powershell
npm install
npm run build
```

Output: `dist/`

## Hosting

Static hosting works with Netlify/Vercel-style platforms.

- build command: `npm run build`
- publish directory: `dist`
- developer AI API key: **none**

The frontend loads Puter.js at runtime.


## Vercel release workflow

Vercel builds are **release-gated** to prevent deployment-rate-limit problems.

Normal commits are ignored by Vercel. A Vercel build only proceeds when the Git commit message contains:

```text
[deploy]
```

or:

```text
[release]
```

The repository also includes a manual GitHub Action named **Deploy Vercel Release**. Run it when a finished version is ready for production; it creates one empty `[deploy]` commit on `main`.

This avoids burning Vercel build quota on every small development commit.

The Vercel config also disables caching for `sw.js` and `manifest.webmanifest`, helping browsers pick up new releases instead of getting stuck on an older J.A.R.V.I.S. UI.

## License

MIT.

This is an original J.A.R.V.I.S.-inspired project and is not affiliated with Marvel or Disney.
