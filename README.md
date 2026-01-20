# MemBox - Multimodal Intelligent Memory System

An intelligent memory system built with **SeekDB** + **PowerMem**.

## Features

- **Intelligent Memory Extraction** - Automatically extract key facts from conversations using LLM
- **Multimodal Support** - Understand and remember image content via Vision LLM
- **User Profiling** - Automatically build and update user profiles from conversations
- **Semantic Search** - Find relevant memories using vector similarity search
- **User Isolation** - Each user has independent memory space via `user_id`

## Tech Stack

| Component | Technology |
|-----------|------------|
| Database | SeekDB (OceanBase) |
| Memory Management | PowerMem |
| Backend | FastAPI + Python |
| Frontend | Next.js + React |
| AI SDK | Vercel AI SDK |
| LLM | Qwen (qwen-plus, qwen-vl-plus) |

## Quick Start

### 1. Prerequisites

- Docker and Docker Compose
- [Alibaba Cloud DashScope API Key](https://bailian.console.aliyun.com)

### 2. Configure Environment Variables

Create `.env` file in the project root:

```bash
# Qwen API Configuration
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx

# LLM Configuration
LLM_MODEL=qwen-plus

# Embedding Configuration
EMBEDDING_MODEL=text-embedding-v4
EMBEDDING_DIMS=1536

# SeekDB Configuration
OCEANBASE_HOST=127.0.0.1
OCEANBASE_PORT=2881
OCEANBASE_USER=root@sys
OCEANBASE_PASSWORD=
OCEANBASE_DATABASE=membox

# Backend URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### 3. Start with Docker Compose

```bash
docker-compose up -d --build
```

### 4. Local Development

**Start SeekDB:**

```bash
docker run -d \
  --name seekdb \
  -p 2881:2881 \
  -v seekdb_data:/var/lib/oceanbase \
  oceanbase/seekdb:1.0.1.0-100000392025122619
```

**Backend:**

```bash
cd backend
uv sync
uv run membox
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

## References

- [SeekDB Documentation](https://github.com/oceanbase/seekdb)
- [PowerMem Documentation](https://github.com/oceanbase/powermem)
- [Vercel AI SDK](https://ai-sdk.dev)
