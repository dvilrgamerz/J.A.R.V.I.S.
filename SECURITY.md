# Security Policy

## Secrets

Never commit `.env`, API keys, tokens, passwords, cookies, or private certificates.

## Desktop permissions

J.A.R.V.I.S. intentionally uses an allowlist for desktop app launching. Do not replace it with unvalidated `exec`, `spawn`, PowerShell, CMD, or shell input from the AI or renderer.

## Electron

Keep:

- `contextIsolation: true`
- `nodeIntegration: false`
- a narrow preload bridge

Validate all IPC input in the Electron main process.

## Reporting

If you find a security problem, avoid posting secrets or exploit details in a public issue. Rotate any exposed credentials immediately.
