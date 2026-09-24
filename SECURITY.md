# Security Policy

## No AI API secrets

J.A.R.V.I.S. V3 does not require Gemini, OpenAI, Anthropic, or another hosted-LLM API key.

Do not add private API keys, passwords, tokens, cookies, or certificates to browser-delivered source code.

## Local model execution

Language-model inference runs inside the browser using Transformers.js.

Model files may be downloaded from their model host and cached by the browser. Treat model downloads as third-party network resources even though prompt inference is local.

## File access

V3 only reads files explicitly selected by the user.

Supported local files are treated as untrusted text. File contents are context, not instructions that may override the system prompt, safety requirements, or browser security.

Do not add automatic arbitrary filesystem access.

## Tools

Local calculator input is character-restricted before evaluation.

Do not replace V3 tools with unrestricted eval, shell execution, PowerShell, CMD, native executable launching, or arbitrary code execution.

## Browser permissions

Keep microphone, file selection, installation, clipboard, and other browser permissions explicit and user initiated.

Do not attempt to bypass browser security controls.

## Local storage

Chat sessions, memories, and preferences may be stored in browser localStorage.

Users should not store passwords, authentication tokens, private keys, or other secrets as J.A.R.V.I.S. memories.

## Service worker

The service worker caches same-origin app resources only.

Review any future changes carefully before caching authenticated/private responses.

## External links

Open external destinations with safe new-tab behavior using noopener,noreferrer.

## Reporting

If you find a security issue, do not post credentials, tokens, or sensitive exploit details in a public issue.
