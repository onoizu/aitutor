# CoursePilot AI Core Implementation Notes

本文档说明本项目如何把说明材料中的四个核心能力落到代码里：

- 真实课程知识库 RAG
- 持久化学习记忆
- Feynman Reflection / Reverse Teaching 工作流
- 学习计划与 check-in 系统

当前实现采用本地持久化文件作为原型级数据层，数据写入项目根目录 `.data/`。这让 demo 不依赖外部数据库也能保存课程资料和学习记忆；后续可把同样的数据接口替换成 Supabase、Postgres、Redis、Qdrant、Milvus 或 Pinecone。

## 1. 真实课程知识库 RAG

相关文件：

- `src/lib/ragStore.ts`
- `src/lib/documentParser.ts`
- `src/app/api/tutor/route.ts`

### 数据进入知识库

用户上传 PDF、DOC、DOCX、TXT 或 MD 后，`documentParser.ts` 先抽取文本。此前代码只把文本拼进当前 prompt，刷新或下一轮对话后就失效。现在 `/api/tutor` 会额外调用：

```ts
ingestCourseDocument({
  title: documentFile.name,
  text: docText,
  fileType: documentFile.type || documentFile.name.split(".").pop(),
  sessionId: clientSessionId,
});
```

`ragStore.ts` 会把资料切成约 1200 字符的 chunk，带少量 overlap，并持久化到：

```text
.data/course-knowledge.json
```

每个资料包含：

- `id`
- `title`
- `fileType`
- `sessionId`
- `uploadedAt`
- `chunks`

### 检索方式

每次用户提问时，`route.ts` 会调用：

```ts
retrieveCourseContext(query, { sessionId, limit: 5 })
```

当前原型使用轻量 lexical retrieval：

- 从用户问题中抽取关键词
- 对所有课程 chunk 打分
- 同 session 上传的资料有额外 boost
- 取 top chunks，并限制总上下文长度

检索结果会被格式化为：

```text
[Retrieved course-grounded context]
Use this material when relevant. If it conflicts with general knowledge, prefer the course material.

[lecture.pdf / mat-...-chunk-1 / score 3.42]
...
```

然后和用户问题一起发送给 Coze / fallback model。这样系统不再只是“单次文件问答”，而是会累积一个本地课程资料库，后续问题也可以使用之前上传过的 lecture、tutorial、notes 或 question bank。

### 后续升级方向

当前检索是无需外部服务的原型版。正式版可替换为：

- embedding model 生成向量
- 向量数据库存储 chunk
- metadata 过滤课程、章节、资料类型、考试范围
- hybrid search：关键词 + 向量召回 + reranker

## 2. 持久化学习记忆

相关文件：

- `src/lib/learnerMemoryStore.ts`
- `src/app/api/tutor/route.ts`
- `src/app/TutorApp.tsx`
- `src/lib/tutorSession.ts`

### 两层记忆

系统现在有两层记忆：

1. UI session memory
   存在浏览器 `localStorage`，用于刷新后恢复聊天、笔记、quiz 状态。

2. Tutor learner memory
   存在服务端 `.data/learner-memory.json`，用于让 AI 在后续回答中知道学生学过什么、弱项是什么、下一步计划是什么。

### learner memory 保存内容

`learnerMemoryStore.ts` 中的 `LearnerMemory` 包含：

- `coveredTopics`
- `weakTopics`
- `studyPlan`
- `feynmanAttempts`
- `lastUpdatedAt`

每轮模型返回结构化 `CozeAgentPackage` 后，`route.ts` 调用：

```ts
updateLearnerMemoryFromPackage({
  sessionId,
  userMessage,
  pkg,
});
```

它会从模型输出中提取：

- `mainResponse.summary` / `definition` 作为覆盖主题线索
- `weakTopic` 作为弱项 profile
- `nextRecommendation` 作为 study plan item
- Feynman 相关轮次的反馈作为 reflection history

### 记忆如何影响下一轮回答

下一轮请求进入 `/api/tutor` 时，系统会读取：

```ts
getLearnerMemory(sessionId)
formatLearnerMemoryContext(memory)
```

并注入 prompt：

```text
[Persistent learner memory]
Covered topics: ...
Weak-topic profile: A* heuristic confusion (2x), ...
Open study plan:
1. Review admissibility vs consistency — Recommended after weak topic: ...
Latest Feynman feedback:
...
```

这样 AI 不只依赖当前聊天窗口，而能基于持久学习档案继续教学。

## 3. Feynman Reflection / Reverse Teaching

相关文件：

- `src/app/TutorApp.tsx`
- `src/components/layout/LeftSidebar.tsx`
- `src/components/layout/CenterPanel.tsx`
- `src/lib/learnerMemoryStore.ts`

### 前端入口

左侧 Learning Actions 新增：

```text
Feynman reflection
```

中间快捷按钮也新增：

```text
Feynman
```

用户点击后，`TutorApp.tsx` 会发送带工作流标记的 prompt：

```text
[Workflow: Feynman Reflection / Reverse Teaching]
Start a Feynman reflection for the current topic. Ask me to explain the concept in my own words first.
Then, when I answer, evaluate my explanation using this rubric:
conceptual accuracy, missing prerequisites, clarity, and transfer to a new example.
```

### 工作流设计

Feynman 工作流不是直接给解释，而是要求学生先输出自己的解释。AI 之后根据 rubric 进行评价：

- 概念是否准确
- 是否缺少 prerequisite
- 表述是否清晰
- 能否迁移到新例子
- 是否需要追问或 repair

如果学生解释不完整，模型应填充：

- `weakTopic`
- `nextRecommendation`
- `mainResponse.commonMistake`

### 反思记录持久化

如果用户消息包含 Feynman / reverse-teach / 用自己的话 / 反向教学 等触发词，`learnerMemoryStore.ts` 会把本轮反馈保存到：

```text
memory.feynmanAttempts
```

下一轮 prompt 会注入最近一次 Feynman feedback，帮助系统继续追踪“学生是否真的会讲出来”。

## 4. 学习计划与 check-in 系统

相关文件：

- `src/lib/learnerMemoryStore.ts`
- `src/app/TutorApp.tsx`
- `src/components/layout/LeftSidebar.tsx`
- `src/components/layout/RightSidebar.tsx`

### 学习计划生成

模型每轮输出的 `nextRecommendation` 不再只是右侧面板的一行文字。后端会把它写入 learner memory 的 `studyPlan`：

```ts
StudyPlanItem {
  id,
  title,
  reason,
  status: "todo" | "doing" | "done",
  createdAt,
  updatedAt
}
```

当同一个 recommendation 再次出现时，系统会更新已有 item，而不是重复创建。

### Study plan check-in

左侧 Learning Actions 新增：

```text
Study plan
```

点击后会发送：

```text
[Workflow: Study Plan Check-in]
Use the persistent learner memory and retrieved course context if provided.
Review my open study plan, weak-topic profile, and recent session progress.
Mark what appears completed, choose the next 1-3 concrete study actions,
and generate a short check-in summary.
```

系统会把持久记忆中的 open plan 注入 prompt，因此 AI 可以围绕已有计划做复盘，而不是每次从零开始建议。

### 展示层

右侧 Study Studio 继续展示：

- Weak topic
- Next recommendation
- Learning Notebook
- Session summary
- Recommended resources

这些内容来自 Coze 结构化输出和持久记忆注入后的下一轮推理结果。当前 UI 还没有单独的计划管理表格；计划状态先在服务端持久层中维护，后续可增加 checklist 式 UI。

## 5. OpenAI-compatible fallback

相关文件：

- `src/lib/modelClient.ts`
- `src/app/api/tutor/route.ts`

现在 `/api/tutor` 会优先调用 Coze。如果 Coze 请求失败，会尝试调用 `CUSTOM_API_URL` / `CUSTOM_API_KEY` 配置的 OpenAI-compatible 模型。若 fallback 也未配置或失败，才会返回错误摘要。

本地 `.env.local` 需要：

```text
CUSTOM_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
CUSTOM_API_KEY=...
CUSTOM_MODEL_ID=qwen-plus
```

## 6. 数据文件

运行后会生成：

```text
.data/course-knowledge.json
.data/learner-memory.json
```

`.data/` 已加入 `.gitignore`，避免把个人学习数据、课程资料和测试记录提交到仓库。

可以通过调试接口查看数据是否已经写入：

```text
GET /api/tutor/debug
```

返回中包含：

- `knowledge.materials`
- `knowledge.chunks`
- `learner_memory.sessions`
- `learner_memory.planItems`
- `learner_memory.weakTopics`

## 7. 当前限制

当前实现已经从“纯展示层”推进到“可运行的数据闭环”，但仍是 hackathon/prototype 级别：

- RAG 使用本地 lexical retrieval，不是 embedding vector DB。
- learner memory 是本地 JSON 文件，不适合多人并发生产环境。
- study plan 状态已经持久化，但 UI 还没有完整 checklist 管理。
- Feynman 评价依赖模型按 prompt 输出，没有独立自动评分模型。
- 教师端 dashboard 和班级 analytics 尚未实现。

正式产品化时，建议优先替换数据层与检索层，再补教师端 analytics。
