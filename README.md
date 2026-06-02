# Adaptive AI Tutor Agent

Adaptive AI Tutor Agent 是一个面向计算机科学与 AI 学习场景的自适应智能辅导系统。项目不仅是一个聊天界面，而是一个由前端学习工作台、后端 Agent Router、Coze 智能体、RAG/文档增强、多模态输入、会话记忆与学习笔记系统共同组成的 AI Tutor Agent。

入口页面为 `src/app/page.tsx`，主应用组件为 `src/app/TutorApp.tsx`。

## 核心能力

- **自适应教学 Agent**：根据用户输入、当前模式、学习状态、薄弱点和历史上下文，动态切换 Teach、Quiz、Repair、Review 等学习流程。
- **RAG / 文档增强问答**：支持上传 PDF、DOC、DOCX、TXT、MD 等学习资料，系统会解析文档文本并注入到 tutor prompt 中，让回答围绕用户资料展开。
- **多模态输入**：支持图片上传，并通过 Coze 文件接口把图片作为视觉学习上下文传给智能体，用于图像分析、题目讲解、截图理解等场景。
- **会话级记忆**：每个 session 独立维护对话轮次、Coze conversation id、学习状态、测验状态、笔记和推荐内容，避免不同学习任务互相污染。
- **学习状态建模**：Agent 输出统一的结构化学习包，包括 `mode`、`learningState`、`weakTopic`、`nextRecommendation`、`sessionSummary`、`resources`、`quiz`、`noteEntry` 等字段。
- **Quiz / Repair 闭环**：用户答错后进入修复模式，系统提供提示、原因分析和再次作答机会，答对后可生成纠错笔记。
- **Learning Notebook 记忆层**：用户可以把解释、测验、纠错和总结加入笔记；Workbench 支持编辑 block、整理学习资料并导出 PDF。
- **资源推荐**：Agent 可以返回推荐视频、文章、课程或论文资源，右侧 Study Studio 会作为学习下一步展示。

## Agent 架构

项目采用“前端学习工作台 + API Router + Agent Provider + 结构化 Agent Package”的架构。

```text
User
  |
  v
Next.js Learning Workspace
  |-- Chat / Quiz / Repair / Review UI
  |-- Session Manager
  |-- Learning Notebook / Workbench
  |-- Image & Document Upload
  |
  v
API Route: /api/tutor
  |-- Parse user message
  |-- Extract document text
  |-- Attach image file
  |-- Add session / conversation context
  |
  v
Agent Provider Layer
  |-- Coze Agent API
  |-- OpenAI-compatible model fallback
  |
  v
Structured Agent Package
  |-- mainResponse
  |-- mode / learningState
  |-- weakTopic
  |-- quiz
  |-- noteEntry
  |-- sessionSummary
  |-- resources
  |
  v
Adaptive Tutor UI
```

## RAG 与多模态设计

本项目的 RAG 不是简单的“聊天记录拼接”，而是面向学习任务的上下文增强流程：

1. 用户上传文档后，`src/lib/documentParser.ts` 会抽取文本内容。
2. `/api/tutor` 将文档内容包装为 `[Document "..."]` 上下文，与用户问题一起发送给 Agent。
3. Agent 基于上传资料生成解释、测验、总结、弱点诊断和推荐。
4. 结果被规范化为结构化学习包，并映射到不同 UI 卡片。

图片输入通过 Coze 文件上传接口进入 Agent 流程，用于多模态理解。用户可以上传截图、图表、题目图片或代码图片，系统会把图片上下文与学习请求一起交给智能体处理。

## 记忆系统

项目包含多层记忆：

- **Conversation Memory**：每个 session 保存独立的 Coze `conversationId`，延续智能体对话上下文。
- **UI Session Memory**：`TutorApp` 保存每个 session 的标题、更新时间、live turns、quiz 状态、Coze package、笔记列表等。
- **Learning State Memory**：Agent 返回 `learningState`、`weakTopic`、`nextRecommendation` 等字段，用于追踪学习进度和薄弱点。
- **Notebook Memory**：用户可以把关键解释、错题、总结沉淀为长期学习笔记，并在 Workbench 中编辑和导出。

这让应用不仅能回答单个问题，还能围绕一个学习主题持续推进：解释 -> 练习 -> 纠错 -> 总结 -> 推荐下一步。

## 主要目录

```text
src/app/TutorApp.tsx                 # 顶层 session、记忆、发送消息、quiz 状态管理
src/app/api/tutor/route.ts           # Tutor API，处理文本、图片、文档与 Agent 调用
src/lib/cozeClient.ts                # Coze API 封装，包含文件上传、对话创建、轮询
src/lib/documentParser.ts            # PDF / Word / 文本文档解析
src/lib/cozePackageAdapter.ts        # Coze Agent Package 到 TutorResponse 的适配
src/lib/normalizeAgentPackage.ts     # 结构化 Agent 输出归一化
src/components/layout/               # 三栏学习工作台布局
src/components/quiz/                 # Quiz / Repair 学习闭环
src/components/notebook/             # Learning Notebook 与 Workbench
src/types/agentPackage.ts            # Agent 结构化输出类型
src/types/tutor.ts                   # Tutor UI 与学习状态类型
```

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
- `CUSTOM_*` 用于 OpenAI-compatible 的大模型接口，作为备用模型调用层。

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
