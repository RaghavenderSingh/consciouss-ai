# Consciouss AI

An AI-powered desktop agent for macOS that sees your screen, understands your commands via text or voice, and autonomously controls your computer to complete tasks.

---

## Features

- **Screen Understanding** — Captures and analyzes your screen using Google Gemini 2.0 Flash via OpenRouter
- **Voice Input** — Record audio and transcribe commands using Groq Whisper
- **Computer Control** — Clicks, types, runs shell commands, launches apps, opens URLs, and executes AppleScript
- **Multi-Display Support** — Handles multiple monitors with automatic screen stitching
- **Telegram Integration** — Receive commands and send screenshots via a Telegram bot
- **Google OAuth** — Sign in with Google for user session tracking
- **Task Looping** — AI autonomously loops up to 5 times to complete complex multi-step tasks
- **Global Hotkey** — `Cmd+Shift+Space` to activate from anywhere
- **Multiple UI Modes** — Full, companion sidebar, spotlight, and minimal pill modes

---

## Tech Stack

- **Electron** + **React** + **TypeScript**
- **TailwindCSS** + **Framer Motion** for UI
- **OpenRouter API** — Google Gemini 2.0 Flash (AI reasoning)
- **Groq API** — Whisper (voice transcription)
- **nut.js** — Mouse, keyboard, and input automation
- **AppleScript** — macOS browser and app control
- **Telegram Bot API** — Remote command interface
- **Google OAuth** — Authentication

---

## Prerequisites

- macOS (primary platform)
- Node.js 18+
- API keys (see [Environment Variables](#environment-variables))

**Enable AppleScript browser control** (for Chrome/Brave):
1. Open Chrome or Brave
2. Menu bar → **View** → **Developer**
3. Check **Allow JavaScript from Apple Events**

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
VITE_OPENROUTER_KEY=sk-or-v1-your-key-here
VITE_GROQ_API_KEY=gsk_your-groq-key-here
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
```

| Variable | Where to get it |
|---|---|
| `VITE_OPENROUTER_KEY` | [openrouter.ai/keys](https://openrouter.ai/keys) |
| `VITE_GROQ_API_KEY` | [console.groq.com/keys](https://console.groq.com/keys) |
| `TELEGRAM_BOT_TOKEN` | Message [@BotFather](https://t.me/BotFather) on Telegram |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID (only this ID can send commands) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud Console → OAuth 2.0 credentials (Desktop app) |

### 3. Grant macOS permissions

On first launch, grant **Microphone** and **Screen Recording** permissions when prompted.

---

## Development

```bash
npm run dev
```

Starts Electron with hot-reload. DevTools open automatically.

---

## Build

```bash
# macOS
npm run build:mac

# Windows
npm run build:win

# Linux
npm run build:linux
```

---

## How It Works

1. User submits a text or voice command
2. A screenshot is captured from all displays
3. Screenshot + command + chat history is sent to Gemini via OpenRouter
4. AI responds with a structured action (`click`, `type`, `open_app`, `shell`, etc.)
5. The action is executed on your machine
6. If `continue_task: true`, the loop repeats (up to 5 times) with an 8s delay
7. Result is shown in the chat panel

---

## Project Structure

```
src/
├── main/           # Electron main process (IPC, OS control, Telegram, auth)
├── preload/        # Context-isolated bridge (exposes IPC to renderer)
└── renderer/
    └── src/
        ├── components/   # React UI components
        ├── hooks/        # useOpenRouter, useScreenCapture, useVoiceInput
        ├── lib/          # actions.ts — executes AI-generated actions
        └── types.ts      # Shared TypeScript types
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start in development mode |
| `npm run build` | Production build |
| `npm run build:mac` | Build macOS .dmg |
| `npm run build:win` | Build Windows installer |
| `npm run build:linux` | Build Linux packages |
| `npm run typecheck` | Run TypeScript checks |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
