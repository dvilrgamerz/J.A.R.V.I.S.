# J.A.R.V.I.S. V5.6.3 Adaptive Core

J.A.R.V.I.S. V5 is a **thin-client remote AI assistant**. The heavy language model does not run on the user's phone or PC.

## V5.6.3 Aggressive Roast

Savage/GOD + 18+ now automatically enters **AGGRESSIVE 18+** mode.

- stronger ordinary profanity for timing and emphasis
- more direct second-person roast writing
- harder openings and closers
- more callbacks to exact wording, typos, contradictions, and accidental self-owns
- less softening, no compliment sandwich, no fake apology, and no "just kidding" ending
- Savage + 18+ targets 4-8 sharper punchlines on richer prompts
- GOD + 18+ targets 8-14 strong punchlines or a sustained roast paragraph
- even tiny messages like `hi` get multiple punchlines in GOD + 18+
- the UI clearly shows **AGGRESSIVE 18+** when active

Protected-class slurs, threats, doxxing/private information, self-harm encouragement, and fabricated serious allegations remain blocked.

## V5.6.2 Roast Everywhere

Roast Mode is now a persistent conversation personality instead of a one-off special prompt.

- when Roast Mode is ON, **every normal reply** keeps the selected roast style
- simple messages such as `hi`, `hello`, `good morning`, or `thanks` still get roasted
- useful questions are still answered correctly; the roast is woven into the answer
- **Light** adds 1-3 playful teasing lines
- **Savage** adds sharper multi-punchline roast writing with callbacks
- **GOD** is roast-forward from the opening line and uses a larger context/punchline budget
- new **18+ Language** toggle allows stronger natural profanity
- profanity is used for comedic timing rather than inserted into every sentence
- stronger anti-cliché guidance reduces repetitive AI roast templates
- roast history/context is larger so callbacks can reference earlier messages
- mature-language preference is stored locally and included in backup import/export

Hard boundaries remain for protected-class slurs, threats, doxxing/private information, self-harm encouragement, and fabricated serious allegations.

## V5.6.1 Adaptive Core

This pass builds on V5.6 and fixes its failed TypeScript build while improving both speed and answer quality.

- **Adaptive routing** when both profile and inference mode are Auto
- Quick prompts prefer the Fast Core
- normal prompts can use Balanced Core
- harder reasoning/coding/debugging prompts move to Smart Core
- Smart Core receives a larger useful history/context and response budget
- coding/deep requests use lower creativity for better precision
- router model catalogue is prewarmed while the boot animation is running
- J.A.R.V.I.S. performs an internal consistency check for complex responses
- UI shows the detected route intent after each answer
- boot terminal shows Adaptive Core warmup state
- richer startup progress flare, core pulse, dashboard reveal, and shutdown collapse VFX
- provider model names remain hidden from the product UI

Manual profile/mode choices still override Adaptive routing.

## V5.5.2 Boot System

V5.5.2 turns the web app into a bootable J.A.R.V.I.S. experience.

- every fresh page load starts on a **START J.A.R.V.I.S.** power screen
- clicking Start launches a cinematic boot sequence
- animated 3D core, orbit rings, particles, scan sweep and holographic grid
- staged CORE / MEMORY / CLOUD / TOOLS / SECURITY checks
- progress ring and boot status messages
- dashboard appears only after boot completes
- new **Shut Down** control in the main command bar
- shutdown uses a reverse power-down / blackout animation
- visible model/provider names are replaced with J.A.R.V.I.S. Core branding
- Fast / Balanced / Smart / Research appear as J.A.R.V.I.S. core profiles

The underlying cloud provider still performs remote inference. The J.A.R.V.I.S. naming is the product interface/route abstraction, not a claim that the project trains its own foundation model.

## V5.5.1 Roast Mode

Roast Mode is back as an **opt-in** comedy feature while normal J.A.R.V.I.S. remains family-friendly by default.

- **Off** — normal J.A.R.V.I.S.
- **Light** — playful teasing
- **Savage** — sharper roast-battle writing
- **GOD** — strongest roast-writing profile and stronger remote route when available

GOD mode focuses on specific details, varied joke structures, callbacks, and stronger closers instead of generic AI insults. Safety boundaries remain for protected-class slurs, threats, doxxing/private information, self-harm encouragement, and fabricated serious allegations.

## V5.5 Family-Friendly 3D UI

V5.5 is a full visual redesign built around a friendlier futuristic look while preserving the same remote-AI architecture.

- new family-friendly holographic hero
- interactive 3D perspective/parallax on pointer devices
- automatic floating depth animation on phones
- 3D AI core sphere with orbit rings
- floating Learn / Build / Create capability cards
- animated holographic particles
- softer cyan / blue / violet / mint visual system
- brighter, more welcoming glass panels
- friendlier default status language
- upgraded responsive chat surfaces
- 3D composer focus motion
- richer button depth and hover feedback
- mobile-specific hero scaling
- safe-area-aware phone layout
- reduced-motion accessibility fallback
- no mature/uncensored controls in the visible UI

## V5.4 Cinematic Command UI

V5.4 is a major visual/animation pass that keeps the remote-AI architecture intact.

- layered holographic HUD grid
- animated scanning sweep and screen-edge framing
- more dimensional glass panels
- upgraded reactor core glow, breathing, and energy particles
- stronger thinking-state reactor animation
- animated status rail for remote core/router/context
- dynamic topbar energy line
- V5.4 version-shine animation
- hover depth on model/mode/tool controls
- animated panel sheen
- upgraded chat arena grid and depth
- smoother message entrance animation
- streaming-response glow state
- richer assistant/user message surfaces
- upgraded sticky composer with moving energy line
- improved send-button feedback
- tighter phone chat layout
- safe-area-aware mobile composer
- reduced-motion accessibility fallback

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

The J.A.R.V.I.S. router uses provider-backed cloud models internally and exposes them through J.A.R.V.I.S.-branded Fast, Balanced, Smart, and Research core profiles. Provider-specific model IDs are intentionally kept out of the product UI. If a preferred route fails before producing an answer, J.A.R.V.I.S. tries another compatible remote route.

The app still contains **no local LLM runtime**.

## Research mode

Turn **Research** on in the quick tools bar when you need current information.

V5 uses Puter's remote web-search workflow through the J.A.R.V.I.S. Research Core. Research answers are instructed to include useful source links and separate current web findings from general model knowledge.

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
