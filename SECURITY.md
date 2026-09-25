# Security Policy

## V5 Cloud security model

J.A.R.V.I.S. V5 is a browser client with remote AI inference.

The heavy language model no longer runs on the user's device.

## Remote AI and Research privacy boundary

AI prompts are sent through Puter.js to remote AI infrastructure. When Research mode is enabled, the request can also use the provider's live web-search tooling.

Any memory or user-selected file excerpt included in a prompt can therefore leave the device for inference.

Do not send passwords, private keys, authentication tokens, secret cookies, or other highly sensitive data through J.A.R.V.I.S.

## No developer API key

V5 does not embed an OpenAI, Gemini, Anthropic, or Hugging Face API key in the frontend.

Puter.js handles its own user authentication/usage model.

Never add private server credentials directly to browser source.

## No local LLM runtime

The Transformers.js dependency and local `ai.worker.ts` LLM worker were removed in V5.

Do not reintroduce automatic client-side model downloads unless the user explicitly chooses a future optional local mode.

## Agent Workspace

Agent Workspace is approval-based.

Generated plans are task structure only. They are not authorization to silently perform system, account, financial, destructive, or privacy-sensitive actions.

## File access

Files are read only after explicit browser file selection.

Before remote inference, J.A.R.V.I.S. may select relevant excerpts locally and include them in the remote prompt.

File content is untrusted context and must not override app security controls.

## Permissions

Microphone, files, clipboard, and notification features remain controlled by V5 app settings plus browser security prompts.

## Local tools

Calculator input is restricted before evaluation.

Do not add arbitrary eval, shell execution, PowerShell, CMD, process spawning, or native application launching.

## Local storage

Sessions, memories, preferences, permissions, and agent-plan state can be stored in browser storage.

Do not encourage users to store secrets in memory.

## Markdown links

AI-generated links are untrusted content and open with safe new-tab behavior.

## Service worker

The service worker caches same-origin app-shell resources.

It does not cache the remote AI response service or model weights.

## Reporting

Do not post credentials, tokens, or sensitive exploit details in a public issue.


## V5.2 Roast Lab testing

UNCENSORED TEST is a style/intensity profile, not a removal of all safety boundaries.

It may use strong profanity and aggressive comedic language in self-roasts, fictional/test scenarios, and supplied-content roasting.

Do not use Roast Lab to generate protected-class slurs, doxxing/private data, violent threats, fabricated serious allegations, sexual violence, or self-harm encouragement.
