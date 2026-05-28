# Adaptive AI Tutor Agent

基于 Next.js 的自适应 AI 学习辅导应用，入口页面为 `src/app/page.tsx`，主应用组件为 `src/app/TutorApp.tsx`。

## 环境要求

- Node.js 20 或更高版本
- npm

## 安装依赖

```bash
npm install
```

## 配置环境变量

在项目根目录创建 `.env.local`：

```bash
COZE_API_TOKEN=pat_xxx
COZE_BOT_ID=你的智能体ID
COZE_API_BASE_URL=https://api.coze.cn

CUSTOM_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
CUSTOM_API_KEY=你的模型API_KEY
CUSTOM_MODEL_ID=qwen-plus
```

说明：

- `COZE_API_TOKEN` 必须是 Coze PAT，不是 OAuth 授权链接。
- 国内 Coze 使用 `https://api.coze.cn`，国际 Coze 使用 `https://api.coze.com`，要和 Token 区域一致。
- `COZE_BOT_ID` 也可以用 `COZE_AGENT_ID` 代替。
- `CUSTOM_*` 用于 OpenAI-compatible 的大模型接口。

## 本地开发

```bash
npm run dev
```

默认访问地址：

```text
http://localhost:3000
```

## 生产构建与启动

```bash
npm run build
npm run start
```

## Netlify 部署

这个项目已经包含 `netlify.toml`，Netlify 会使用：

```text
Build command: npm run build
Publish directory: .next
Node version: 20
```

推荐部署方式：

1. 将 `adaptive-ai-tutor-agent` 作为要部署的 Git 仓库推到 GitHub。
2. 在 Netlify 选择 `Add new site` -> `Import an existing project`。
3. 选择该仓库，构建设置保持默认即可；如果 Netlify 要求手动填写，就使用上面的构建命令和发布目录。
4. 在 Netlify 的 `Site configuration` -> `Environment variables` 中添加 `.env.example` 里的变量。
5. 重新触发一次部署。

注意：`COZE_API_TOKEN`、`CUSTOM_API_KEY` 这类密钥不要写进前端代码，也不要提交 `.env.local`。

## 代码检查

```bash
npm run lint
```

## Coze 接口调试

项目提供了一个 curl 示例脚本：

```bash
cp scripts/coze-chat-curl.example.sh scripts/coze-chat-curl.sh
export COZE_API_TOKEN='pat_xxx'
export COZE_BOT_ID='1234567890'
bash scripts/coze-chat-curl.sh
```

## 清理本地生成文件

```bash
npm run clean
```

如果需要连依赖一起清理：

```bash
npm run clean:all
```

清理后重新运行项目需要再次执行：

```bash
npm install
```
