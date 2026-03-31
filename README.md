# 🌌 Consciouss AI

**The Intelligence Layer for macOS**
An autonomous AI agent with a **Liquid-Glass** aesthetic that sees your screen, understands your voice, and controls your computer with precision.

---

## ✨ Features

- **💎 Liquid-Glass Interface** — A premium, high-fidelity UI with deep-ruby brand tones, multi-layered glassmorphism, and dynamic animations.
- **👁️ Vision-Driven Reasoning** — Powered by **Google Gemini 2.0 Flash** (via OpenRouter), capturing and analyzing multi-display environments in real-time.
- **🦀 High-Performance Rust Core** — A native automation engine built in Rust for ultra-fast window management, screen capture, and sub-millisecond input control.
- **🎙️ Voice Intelligence** — Natural language interaction using **Groq Whisper** for near-instant transcription.
- **📱 Remote Command Center** — Fully integrated **Telegram Bot** with a seamless "Guided Setup" wizard for remote screen monitoring and control.
- **🎭 Audio-Reactive Presence** — A sophisticated, shader-based **Blob/Orb** UI that pulses and reacts to system state and voice input.
- **🤖 Autonomous Task Loops** — Self-correcting AI loops that execute multi-step workflows until the goal is achieved.
- **⚡ Spotlight Integration** — Activate instantly with `Cmd+Shift+Space`.

---

## 🛠️ Tech Stack

- **Frameworks**: [Electron](https://www.electronjs.org/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Native Layer**: [Rust](https://www.rust-lang.org/) (via [NAPI-RS](https://napi.rs/)) for low-level OS hook integration.
- **Styling**: [TailwindCSS 4](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/) + Custom GLSL Shaders.
- **AI Engines**:
    - **Reasoning**: Gemini 2.0 Flash (OpenRouter)
    - **Speech**: Groq Whisper
- **Automation**: Custom Rust Native Engine + [nut.js](https://nut-tree.github.io/) fork.
- **Messaging**: [Node Telegram Bot API](https://github.com/yagop/node-telegram-bot-api).

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
   git clone https://github.com/your-username/consciouss-ai.git
   cd consciouss-ai
   npm install
   ```

2. **Native Module**:
   The project includes a pre-built Rust binary for `darwin-arm64`. To rebuild for your specific architecture:
   ```bash
   cd native
   npm install
   npm run build
   ```
   *(Requires Rust toolchain installed: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)*

---

## 🔑 .env Configuration

Create a `.env` file in the root directory:

```env
VITE_OPENROUTER_KEY=sk-or-v1-xxx...
VITE_GROQ_API_KEY=gsk_xxx...
TELEGRAM_BOT_TOKEN=xxx:yyy...
TELEGRAM_CHAT_ID=12345678
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
```

| Key | Purpose | Source |
|---|---|---|
| `VITE_OPENROUTER_KEY` | Gemini 2.0 Flash AI reasoning | [OpenRouter](https://openrouter.ai/) |
| `VITE_GROQ_API_KEY` | Whisper Voice-to-Text | [Groq Console](https://console.groq.com/) |
| `TELEGRAM_BOT_TOKEN` | Remote interaction bot | [@BotFather](https://t.me/BotFather) |
| `GOOGLE_CLIENT_ID` | User authentication | [Google Cloud](https://console.cloud.google.com/) |

---

## 📂 Project Structure

```text
consciouss-ai/
├── src/
│   ├── main/          # Electron main-process (Bridge, OS APIs, Telegram)
│   ├── preload/       # Security layer for IPC communication
│   └── renderer/      # React application (UI, Shaders, AI Hooks)
├── native/            # Rust native automation engine (NAPI-RS)
├── resources/         # Static assets and brand icons
└── build/             # Production distribution artifacts
```

---

## ⌨️ Development & Build

### Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm run build:mac   # Build .dmg for macOS
npm run build:win   # Build .exe for Windows
```

---

## 📄 License

Proprietary. All rights reserved.
