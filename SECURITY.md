# Security Policy

## No AI secrets required

J.A.R.V.I.S. Web AI does not require a Gemini, OpenAI, Anthropic, or other hosted-LLM API key.

Do not add secret API keys to client-side code. Anything shipped to a browser can be inspected by the user.

## Browser permissions

Keep browser capabilities explicit and user initiated.

Do not attempt to bypass browser security controls to access arbitrary files, execute shell commands, inspect other tabs, or control the operating system.

## Local storage

Chat history and saved memories are stored in browser localStorage. Avoid storing passwords, authentication tokens, private keys, or other secrets as J.A.R.V.I.S. memories.

## External links

Open external destinations using safe new-tab behavior with `noopener,noreferrer`.

## Dependencies

Keep Transformers.js, Vite, React, and related dependencies updated and review security advisories before releases.

## Reporting

If you find a security problem, avoid posting credentials or private exploit details in a public issue.
