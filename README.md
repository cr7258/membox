# 📦 MemBox - Multimodal Intelligent Memory System

An intelligent memory system built with **SeekDB** + **PowerMem**.

## ✨ Features

- 🧠 **Intelligent Memory Extraction** - Automatically extract memorable information from conversations
- 📸 **Multimodal Memory** - Support image memories, Vision LLM auto-generates descriptions
- 👤 **User Profiling** - Automatically learn user preferences and habits
- 📈 **Ebbinghaus Forgetting Curve** - Scientific memory management with timely review reminders
- 📦 **Memory Partitioning** - Categorized storage for working, episodic, and semantic memories

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Database | SeekDB (OceanBase) |
| Memory Management | PowerMem |
| Backend | FastAPI + Python |
| Frontend | Next.js 16 + React 19 |
| AI SDK | Vercel AI SDK 6 |
| LLM | Qwen (qwen-plus) |

## 🚀 Quick Start

### 1. Prerequisites

Get [Alibaba Cloud DashScope API Key](https://dashscope.console.aliyun.com)

### 2. Configure Environment Variables

Create `.env` file:

```bash
# Qwen API Configuration
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx

# LLM Configuration
LLM_MODEL=qwen-plus

# Embedding Configuration
EMBEDDING_MODEL=text-embedding-v4
EMBEDDING_DIMS=1536

# Vision LLM Configuration
VISION_LLM_MODEL=qwen-vl-plus

# SeekDB Configuration
OCEANBASE_HOST=127.0.0.1
OCEANBASE_PORT=2881
OCEANBASE_USER=root@sys
OCEANBASE_PASSWORD=
OCEANBASE_DATABASE=membox

# Backend URL
BACKEND_URL=http://localhost:8000
```

### 3. Start with Docker Compose

```bash
docker-compose up -d
```

### 4. Local Development

**Backend (using uv):**

```bash
cd backend
uv sync
uv run uvicorn src.main:app --reload
```

**Frontend:**

```bash
cd frontend
pnpm install
pnpm dev
```

### 5. Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/docs

## 📁 Project Structure

```
membox/
├── backend/
│   ├── main.py              # FastAPI entry
│   ├── config.py            # PowerMem config
│   ├── memory_manager.py    # Memory manager
│   ├── routes/
│   │   ├── chat.py          # Chat API
│   │   ├── memory.py        # Memory API
│   │   └── upload.py        # Upload API
│   ├── pyproject.toml       # uv dependency management
│   └── Dockerfile
├── frontend/
│   ├── app/
│   │   ├── page.tsx         # Main page
│   │   ├── layout.tsx       # Layout
│   │   └── api/chat/route.ts
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## 📖 References

- [SeekDB Documentation](https://github.com/oceanbase/seekdb)
- [PowerMem Documentation](https://github.com/oceanbase/powermem)
- [Vercel AI SDK](https://ai-sdk.dev)

## 📄 License

MIT
