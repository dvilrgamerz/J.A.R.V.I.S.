# Security Policy

## V4 security model

J.A.R.V.I.S. V4 is a browser application. Its design assumes browser sandboxing and explicit user permission are important security boundaries.

## No AI API secrets

V4 does not require Gemini, OpenAI, Anthropic, or another hosted-LLM API key.

Never place private API keys, passwords, cookies, authentication tokens, or private certificates in browser-delivered source code.

## Agent Workspace

Agent Workspace is approval-based.

A generated plan is advisory task structure. It must not be interpreted as authority to silently perform native-system, account, financial, destructive, or privacy-sensitive actions.

Every step remains user-controlled.

## Permissions Center

The V4 permission switches are an additional app-level capability layer.

They do not replace browser security prompts and must never be used to bypass browser permissions.

## Local model execution

Language-model inference runs in the browser through Transformers.js.

Model weights can be downloaded from model-host infrastructure and cached by the browser. Local prompt inference does not mean the model download itself is an offline resource.

## Model unload

Unload Model clears V4's active model pipeline reference. Actual memory/cache reclamation remains subject to the JavaScript runtime, WebGPU implementation, and browser cache management.

Do not claim deterministic immediate GPU-memory reclamation.

## File access

V4 only reads files explicitly selected by the user.

File content is untrusted context. It must not override system instructions, application security rules, or user permission controls.

Do not add automatic arbitrary filesystem access.

## Clipboard and microphone

Clipboard and microphone features must remain user-controlled and browser-permission gated.

## Local tools

Calculator input is restricted before evaluation.

Do not replace local tools with unrestricted code evaluation, shell execution, PowerShell, CMD, native process launching, or arbitrary code execution.

## Notifications

Timer notifications require both the V4 notification capability switch and browser notification permission.

## Local storage

Sessions, memories, preferences, permission settings, and agent-plan state can be stored locally in the browser.

Do not encourage storing passwords, private keys, authentication tokens, or other secrets as J.A.R.V.I.S. memories.

## Markdown links

Rendered assistant links open in a new tab with `noopener,noreferrer`.

AI-generated links should still be treated as untrusted content.

## Service worker

The service worker caches same-origin app-shell resources.

Review future changes before caching authenticated or private HTTP responses.

## Reporting

Do not post credentials, secrets, or sensitive exploit details in a public issue.
