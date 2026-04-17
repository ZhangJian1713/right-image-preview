# Release Guide

[中文](./releasing.zh-CN.md)

This document describes the end-to-end process for releasing a new version of `right-image-preview` to npm and pushing the changes to GitHub.

---

## Prerequisites

| Tool | Notes |
|---|---|
| Node.js ≥ 18 | Required by Vite and the build pipeline |
| npm account | Must be a collaborator on the `right-image-preview` package |
| npm auth token | Stored in `~/.npmrc` (see [Authentication](#authentication)) |
| Git write access | To the `ZhangJian1713/right-image-preview` repository |

---

## Authentication

### npm

The auth token is stored in `~/.npmrc` so `npm publish` can authenticate without prompting:

```
//registry.npmjs.org/:_authToken=<YOUR_TOKEN>
```

To create or rotate a token:

1. Go to [https://www.npmjs.com/settings/tokens](https://www.npmjs.com/settings/tokens)
2. Click **Generate New Token → Classic Token**
3. Choose type **Automation** (allows publishing from CI without 2FA prompt)
4. Copy the token and paste it into `~/.npmrc` replacing the old one

> **Security note**: Never commit your token to source control. The `~/.npmrc` file is on your local machine and is not tracked by this repository.

If your npm account has **"Require 2FA for write actions"** enabled, `npm publish` will require an OTP every time. To avoid this:
- Either use an **Automation** token (bypasses 2FA for machine publishing), or
- Disable that setting in your [account security settings](https://www.npmjs.com/settings/account) — only do this if you understand the implications.

---

## Release Checklist

### 1. Finish development

Ensure all features and bug fixes for this release are committed on the working branch (`feature-init` or `main`).

```bash
git status          # should be clean
npx tsc --noEmit    # no TypeScript errors
```

### 2. Bump the version

Edit `package.json` manually, following [SemVer](https://semver.org/):

| Change type | Example |
|---|---|
| Bug fix | e.g. `0.0.11` → `0.0.12` |
| Backward-compatible new feature | `0.0.12` → `0.1.0` |
| Breaking API change | `0.1.0` → `1.0.0` |

```json
{
  "version": "0.0.12"
}
```

### 3. Update documentation

If the release includes new props, behaviours, or keyboard shortcuts, update the relevant docs files:

- `docs/api.md` / `docs/api.zh-CN.md`
- `docs/keyboard.md` / `docs/keyboard.zh-CN.md`
- `docs/requirements.md` / `docs/requirements.en.md`
- `README.md` / `README.zh-CN.md` (if the feature summary or install instructions change)

### 4. Build the library

The `prepublishOnly` hook runs this automatically, but you can verify it manually:

```bash
npm run build:lib
```

Artifacts are written to `dist/`:

```
dist/
├── index.mjs       # ESM build
├── index.cjs       # CommonJS build
├── index.d.ts      # TypeScript declarations (entry point)
└── *.map           # Source maps
```

### 5. Publish to npm

```bash
npm publish
```

This triggers `prepublishOnly` → `build:lib` before uploading. Only the files listed in `package.json#files` are included in the tarball:

```json
"files": ["dist", "README.md", "README.zh-CN.md", "LICENSE"]
```

A successful publish prints:
```
+ right-image-preview@0.0.12
```

Verify on npm: [https://www.npmjs.com/package/right-image-preview](https://www.npmjs.com/package/right-image-preview)

### 6. Commit and tag

```bash
git add -A
git commit -m "chore: release v0.0.12"
git tag v0.0.12
git push origin feature-init --tags
```

### 7. Push to GitHub

```bash
git push origin feature-init
```

GitHub Actions will automatically:
- Run the TypeScript build check
- Deploy the updated demo to GitHub Pages at  
  [https://zhangjian1713.github.io/right-image-preview/](https://zhangjian1713.github.io/right-image-preview/)

---

## Build Configuration Reference

| Config file | Purpose |
|---|---|
| `vite.config.ts` | Dev server and test runner (Vitest) |
| `vite.lib.config.ts` | Library build (Rollup via Vite, `publicDir: false`) |
| `tsconfig.json` | Shared TypeScript settings |
| `tsconfig.lib.json` | Stricter settings used by `vite-plugin-dts` for declaration output |

### Why two Vite configs?

The demo app and the library have different needs:

- **Demo** (`vite.config.ts`): includes `public/` assets, sets `base: '/right-image-preview/'` for GitHub Pages, enables Vitest.
- **Library** (`vite.lib.config.ts`): externalises `react`/`react-dom`, disables `publicDir`, generates `.d.ts` declarations via `vite-plugin-dts`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `npm error code E403` | Not logged in or wrong token | Re-paste token in `~/.npmrc` |
| `npm error code EOTP` | 2FA required | Use an Automation token (see [Authentication](#authentication)) |
| `vite-plugin-dts` warns about TypeScript version | TypeScript in devDeps is newer than bundled API Extractor | Safe to ignore; declarations still generate correctly |
| GitHub Actions deploy fails | Pages source not set to **GitHub Actions** | Repository → Settings → Pages → Source → GitHub Actions |
| Pages deploy blocked by environment | `github-pages` environment branch restriction | Settings → Environments → github-pages → Deployment branches → No restriction |
