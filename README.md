# 🌌 Consciouss AI

**The Intelligence Layer for macOS**  
An elite autonomous AI agent system with a **Liquid-Glass** aesthetic that sees your screen, understands your voice, controls your computer with precision, and **gets smarter every session**.

---

## ✨ Features

### Core Intelligence
- **🧠 Hierarchical Task Network (HTN)** — Supervisor agent decomposes complex goals into structured task trees. If a step fails, a **Critic Agent** performs root-cause analysis and dynamically re-routes the plan — no crashes, no giving up.
- **🏷️ Set-of-Mark Visual Grounding** — Before every action, numbered bounding boxes are drawn over all interactable UI elements on the screenshot. Agents use the visual index to click with **100% coordinate precision** on any app, including Canvas and non-standard UIs.
- **🧬 Persistent Typed Memory** — The agent learns across sessions. Facts are stored with confidence scores, categorized (`user`, `project`, `system`, `procedure`, `error`), and injected into every future prompt automatically. It remembers your preferences, projects, and what solutions worked.
- **🔥 FireCrawl Deep Research** — Instant intelligence on any URL. The agent scrapes full documentation sites, API references, and articles into clean markdown without touching a browser.
- **💭 Inner Monologue** — Every agent decision is prefixed with a visible `Thought:` field showing its reasoning before acting.

### Interface & Interaction
- **💎 Liquid-Glass UI** — Premium glassmorphism with deep-ruby brand tones, multi-layered blur, and dynamic micro-animations.
- **👁️ Real-Time Vision** — Multi-display screen capture (via CoreGraphics Rust bridge) sent to frontier vision models every step.
- **🎙️ Voice Intelligence** — Natural language via **Groq Whisper** for near-instant transcription and wake word detection.
- **📱 Telegram Remote Control** — Full remote command center with a guided setup wizard, live screen sharing, and `/screenshot` commands.
- **⚡ Spotlight Mode** — Instant overlay with `Cmd+Shift+Space`.
- **🤖 Multi-Agent Swarm** — Four specialized departments: `Supervisor`, `DevOps`, `Frontend`, `Security` + `Critic` — each with distinct roles, routing, and security shadow-checking.
- **🔬 Self-Healing Recovery** — Failed tasks are automatically escalated to the Critic agent which proposes alternative recovery strategies before giving up.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Electron](https://www.electronjs.org/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Native Engine** | [Rust](https://www.rust-lang.org/) via [NAPI-RS](https://napi.rs/) — screen capture, input control, AX tree, idle detection |
| **Styling** | Vanilla CSS + Custom GLSL Shaders + Framer Motion |
| **AI Routing** | [OpenRouter](https://openrouter.ai/) — Gemini, Claude, GPT-4o, Llama 3.3, DeepSeek R1, Mistral |
| **Voice** | [Groq Whisper](https://console.groq.com/) — large-v3-turbo |
| **Web Research** | [FireCrawl](https://www.firecrawl.dev/) — structured markdown scraping |
| **Messaging** | [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api) |
| **Memory** | Local JSON `MemoryStore` — typed facts, confidence scoring, relevance retrieval |

---

## 🚀 Getting Started

### Prerequisites

- **macOS** (Optimized for Apple Silicon / Intel)
- **Node.js 20+**
- **API Keys** (See [.env Configuration](#-env-configuration))

> [!TIP]
> To enable browser automation in Chrome/Brave:
> 1. Open Terminal and run: `defaults write com.google.Chrome AllowJavaScriptFromAppleEvents -bool true`
> 2. Or manually: **View** → **Developer** → **Allow JavaScript from Apple Events**.

### Installation

1. **Clone & Install**:
   ```bash
   git clone https://github.com/RaghavenderSingh/consciouss-ai.git
   cd consciouss-ai
   npm install
   ```

2. **Native Module** (pre-built for `darwin-arm64` — rebuild for your arch):
   ```bash
   cd native
   npm install
   npm run build
   ```
   *(Requires Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)*

---

## 🔑 .env Configuration

Create a `.env` file in the root directory:

```env
# Required
VITE_OPENROUTER_KEY=sk-or-v1-xxx...

# Voice transcription
VITE_GROQ_API_KEY=gsk_xxx...

# Telegram remote control (optional)
TELEGRAM_BOT_TOKEN=xxx:yyy...
TELEGRAM_CHAT_ID=12345678

# Google Sign-In (optional)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

# FireCrawl deep research (optional but recommended)
VITE_FIRECRAWL_KEY=fc-xxx...
```

| Key | Purpose | Source |
|---|---|---|
| `VITE_OPENROUTER_KEY` | AI reasoning (all models) | [OpenRouter](https://openrouter.ai/) |
| `VITE_GROQ_API_KEY` | Whisper voice-to-text | [Groq Console](https://console.groq.com/) |
| `VITE_FIRECRAWL_KEY` | Deep web research & scraping | [FireCrawl](https://www.firecrawl.dev/) |
| `TELEGRAM_BOT_TOKEN` | Remote command via Telegram | [@BotFather](https://t.me/BotFather) |
| `GOOGLE_CLIENT_ID` | User authentication | [Google Cloud](https://console.cloud.google.com/) |

---

## 🤖 AI Model Options

Consciouss AI supports **free and premium models** via OpenRouter, switchable from the command bar:

#### Free Models
| Model | Best For |
|---|---|
| `google/gemini-2.0-pro-exp-02-05:free` | Complex reasoning + vision |
| `meta-llama/llama-3.3-70b-instruct:free` | Coding + instructions |
| `deepseek/deepseek-r1:free` | Deep logical reasoning |
| `mistralai/mistral-7b-instruct:free` | Fast simple commands |
| `qwen/qwen-2-7b-instruct:free` | Quick text generation |

#### Premium Models
| Model | Best For |
|---|---|
| `google/gemini-2.0-flash-001` | Balanced speed + vision (default) |
| `anthropic/claude-3.5-sonnet` | Writing, analysis, nuance |
| `openai/gpt-4o` | General flagship |

---

## 🏗️ Architecture

```text
consciouss-ai/
├── src/
│   ├── main/              # Electron main — IPC, Telegram, OS APIs, Memory I/O
│   ├── preload/           # Context-isolated IPC bridge (security layer)
│   └── renderer/
│       └── src/
│           ├── lib/
│           │   ├── orchestrator.ts   # HTN Sovereign orchestrator (Phase 2)
│           │   ├── actions.ts        # Action executor (click, run, scrape, memory)
│           │   ├── prompts.ts        # Agent system prompts (Supervisor, DevOps, Critic…)
│           │   ├── setOfMark.ts      # Visual grounding — numbered bounding boxes (Phase 3)
│           │   ├── memory.ts         # Persistent typed MemoryStore (Phase 4)
│           │   └── accessibility.ts  # AX tree scanner + UI formatter
│           ├── hooks/
│           │   ├── useOpenRouter.ts  # Streaming AI calls + model switching
│           │   ├── useScreenCapture.ts
│           │   ├── useVoiceInput.ts
│           │   └── useAttention.ts   # Mouse dwell + focus detection
│           └── components/           # UI — ChatPanel, CommandBar, Sidebar, Telegram…
├── native/                # Rust NAPI-RS — screen capture, mouse, keyboard, AX, idle
└── resources/             # Brand assets
```

### Agent Swarm

```
User Input
    │
    ▼
┌─────────────────────────────────────────────┐
│              Supervisor Agent               │
│  Plans HTN task tree · routes to departments│
└────────────────────┬────────────────────────┘
         ┌───────────┼───────────┐
         ▼           ▼           ▼
    [DevOps]    [Frontend]   [Security]
    Terminal    Browser/UI   Command audit
    File ops    Scraping     Shadow review
         │           │
         └─────┬─────┘
               ▼
        ❌ Step Fails?
               │
               ▼
         [Critic Agent]
    Root-cause analysis
    Injects recovery nodes
    into live task tree
```

---

## ⌨️ Development & Build

```bash
# Development
npm run dev

# Production
npm run build:mac   # .dmg for macOS
npm run build:win   # .exe for Windows
```

---

## 📄 License

Proprietary. All rights reserved.
