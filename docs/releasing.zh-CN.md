# 发布指南

[English](./releasing.md)

本文档描述将 `right-image-preview` 新版本发布到 npm 并推送到 GitHub 的完整流程。

---

## 前提条件

| 工具 | 说明 |
|---|---|
| Node.js ≥ 18 | Vite 和构建流程所需 |
| npm 账户 | 需要是 `right-image-preview` 包的协作者 |
| npm 授权 Token | 存储在 `~/.npmrc`（参见[身份验证](#身份验证)） |
| Git 写权限 | 需要能推送到 `ZhangJian1713/right-image-preview` 仓库 |

---

## 身份验证

### npm

授权 Token 存储在 `~/.npmrc`，使 `npm publish` 无需每次手动输入：

```
//registry.npmjs.org/:_authToken=<YOUR_TOKEN>
```

创建或轮换 Token 的步骤：

1. 进入 [https://www.npmjs.com/settings/tokens](https://www.npmjs.com/settings/tokens)
2. 点击 **Generate New Token → Classic Token**
3. 类型选择 **Automation**（可在 CI 环境中绕过 2FA 验证）
4. 复制 Token，粘贴到 `~/.npmrc` 替换旧值

> **安全提示**：永远不要将 Token 提交到版本库。`~/.npmrc` 只存在于本地机器，本项目不跟踪该文件。

如果 npm 账户开启了 **"写操作需要双因素认证（2FA）"**，每次 `npm publish` 都会要求输入一次性密码。解决方式：
- 使用 **Automation** 类型的 Token（机器发布可绕过 2FA），或者
- 在[账户安全设置](https://www.npmjs.com/settings/account)中关闭该选项——仅在理解其安全影响后操作。

---

## 发布清单

### 1. 完成开发

确保本次发布的所有功能和修复均已提交到工作分支（`feature-init` 或 `main`）。

```bash
git status          # 应为干净状态
npx tsc --noEmit    # 无 TypeScript 错误
```

### 2. 升级版本号

手动编辑 `package.json`，遵循 [SemVer 语义化版本](https://semver.org/lang/zh-CN/)：

| 变更类型 | 示例 |
|---|---|
| Bug 修复 | 例如 `0.0.11` → `0.0.12` |
| 向后兼容的新特性 | `0.0.12` → `0.1.0` |
| 破坏性 API 变更 | `0.1.0` → `1.0.0` |

```json
{
  "version": "0.0.12"
}
```

### 3. 更新文档

若本次发布包含新增 prop、行为变更或键盘快捷键，需同步更新相关文档：

- `docs/api.md` / `docs/api.zh-CN.md`
- `docs/keyboard.md` / `docs/keyboard.zh-CN.md`
- `docs/requirements.md` / `docs/requirements.en.md`
- `README.md` / `README.zh-CN.md`（如安装说明或功能摘要有变化）

### 4. 构建库文件

`prepublishOnly` 钩子会自动触发构建，也可以手动验证：

```bash
npm run build:lib
```

产物写入 `dist/` 目录：

```
dist/
├── index.mjs       # ESM 构建
├── index.cjs       # CommonJS 构建
├── index.d.ts      # TypeScript 声明入口
└── *.map           # Source Map
```

### 5. 发布到 npm

```bash
npm publish
```

此命令会先触发 `prepublishOnly` → `build:lib`，再上传 Tarball。仅 `package.json#files` 中列出的文件会被打包：

```json
"files": ["dist", "README.md", "README.zh-CN.md", "LICENSE"]
```

成功后输出：
```
+ right-image-preview@0.0.12
```

在 npm 上验证：[https://www.npmjs.com/package/right-image-preview](https://www.npmjs.com/package/right-image-preview)

### 6. 提交并打 Tag

```bash
git add -A
git commit -m "chore: release v0.0.12"
git tag v0.0.12
git push origin feature-init --tags
```

### 7. 推送到 GitHub

```bash
git push origin feature-init
```

GitHub Actions 会自动：
- 执行 TypeScript 构建检查
- 将最新 Demo 部署到 GitHub Pages：  
  [https://zhangjian1713.github.io/right-image-preview/](https://zhangjian1713.github.io/right-image-preview/)

---

## 构建配置参考

| 配置文件 | 用途 |
|---|---|
| `vite.config.ts` | 开发服务器与测试运行器（Vitest） |
| `vite.lib.config.ts` | 库构建（通过 Vite 调用 Rollup，`publicDir: false`） |
| `tsconfig.json` | 共用 TypeScript 配置 |
| `tsconfig.lib.json` | `vite-plugin-dts` 生成声明文件时使用的更严格配置 |

### 为什么有两个 Vite 配置？

Demo 应用与库的构建需求不同：

- **Demo**（`vite.config.ts`）：包含 `public/` 静态资源，设置 `base: '/right-image-preview/'` 用于 GitHub Pages，启用 Vitest。
- **库**（`vite.lib.config.ts`）：外部化 `react`/`react-dom`，禁用 `publicDir`，通过 `vite-plugin-dts` 生成 `.d.ts` 声明文件。

---

## 常见问题排查

| 现象 | 可能原因 | 解决方法 |
|---|---|---|
| `npm error code E403` | 未登录或 Token 无效 | 重新粘贴 Token 到 `~/.npmrc` |
| `npm error code EOTP` | 需要 2FA 验证码 | 改用 Automation 类型 Token（见[身份验证](#身份验证)） |
| `vite-plugin-dts` 提示 TypeScript 版本警告 | devDeps 中的 TypeScript 比 API Extractor 内置版本新 | 可安全忽略，声明文件仍可正常生成 |
| GitHub Actions 部署失败 | Pages 来源未设置为 **GitHub Actions** | 仓库 → Settings → Pages → Source → GitHub Actions |
| Pages 部署被环境保护规则阻止 | `github-pages` 环境的分支限制 | Settings → Environments → github-pages → Deployment branches → No restriction |
