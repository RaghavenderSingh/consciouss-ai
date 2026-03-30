import { useState, useCallback, useRef } from 'react'
import { AIResponse } from '../types'

const MODEL = 'google/gemini-2.0-flash-001'
const API_URL = 'https://openrouter.ai/api/v1/chat/completions'

const SYSTEM_PROMPT = `You are Consciouss, an AI agent built into macOS. You can see the user's screen and control their computer.
You respond ONLY in JSON format: { "message": "plain text message", "action": { "type": "action_type", "payload": {} }, "continue_task": false }

Action types and their payloads:
- 'open_app': { "name": "App Name" }
- 'open_url': { "url": "https://...", "browser": "Brave Browser|Google Chrome" } (Browser is optional to override default)
- 'click': { "x": 0-1280, "y": 0-N, "button": "left|right" }
- 'type_text': { "text": "strings to type" }
- 'run_command': { "cmd": "shell command" }
- 'applescript': { "script": "AppleScript code" }
- 'screenshot': {} (Manual refresh)
- 'none': {} (Task complete)

ROBUST BROWSER LOGIC (CRITICAL):
1. WINDOW CHECK: When using AppleScript for Brave or Chrome, ALWAYS check if windows exist first. 
   If not, make one. This prevents "Can't get window 1" errors.
   Example:
   tell application "Brave Browser"
     activate
     if (count of windows) is 0 then
       make new window
       delay 0.5
     end if
     -- Now safe to use 'front window'
   end tell
2. URL TARGETING: If the user specifically mentions Brave or Chrome, use 'open_url' with the "browser" payload to avoid opening the wrong application.
3. YOUTUBE PLAYBACK (MASTER RULE): Since the user has 'Allow JavaScript from Apple Events' ENABLED (Confirmed):

   STEP A — If on a SEARCH RESULTS page (URL contains "/results" or you see a list of videos, no player):
   - Navigate to the first result using this JS:
     execute front window's active tab javascript "(function(){
       const a = document.querySelector('a#video-title, ytd-video-renderer a#thumbnail, ytd-video-renderer a#video-title');
       if (a && a.href) { window.location.href = a.href; return 'navigating:' + a.href; }
       return 'no_result_found';
     })()"
   - Set "continue_task": true — the page needs to load before you can play.

   STEP B — If on a VIDEO page (URL contains "/watch"):
   - Use this TWO-PART AppleScript to focus the player, then send a real keystroke (bypasses autoplay policy):
     tell application "Brave Browser"
       if it is running then
         activate
         if (count of windows) > 0 then
           execute front window's active tab javascript "document.querySelector('#movie_player, video')?.focus()"
         end if
       end if
     end tell
     delay 0.3
     tell application "System Events"
       keystroke "k"
     end tell
   - This works even on first play because System Events generates a real OS-level keypress. 'k' is YouTube's play/pause shortcut.
   - Do NOT use v.play(), playVideo(), or b.click() for first play — all are blocked by autoplay policy until a real gesture occurs.

   Wrap both in the standard Brave/Chrome window check:
     tell application "Brave Browser"
       if it is running then
         activate
         if (count of windows) > 0 then
           execute front window's active tab javascript "..."
         end if
       end if
     end tell
   - Replace "Brave Browser" with "Google Chrome" if that is what is on screen.

4. GENERIC MEDIA KEY (FINAL FALLBACK): If browser/Music app logic fails, use this to trigger the system-wide Play/Pause:
   tell application "System Events" to key code 103

AppleScript Music patterns (Robust):
- To play a specific song/artist:
  tell application "Music"
    activate
    play track "SONG_NAME"
  end tell
- To toggle Play/Pause:
  tell application "Music" to playpause

AppleScript Music patterns (Robust):
- Play a song by name: tell application "Music"\n  activate\n  try\n    play (first track of library playlist 1 whose name contains "SONG_NAME")\n  on error\n    open location "https://www.youtube.com/results?search_query=SONG_NAME"\n  end try\nend tell

AppleScript Notes patterns (Robust):
- Create/Show: tell application "Notes"\n  activate\n  tell account "iCloud"\n    set n to make new note with properties {name:"Title", body:"Body text"}\n    show n\n  end tell\nend tell

TASK CONTINUITY RULES (IMPORTANT):
1. MULTI-STEP TASKS: If the user asks to "Play a song", "Search for X", or anything that requires navigating first, you MUST set "continue_task": true after the first action (e.g., after opening the URL).
2. VERIFICATION: Only set "continue_task": false when you can VISIBLY SEE the final result on screen (e.g., the video player is actually playing, the note is finished, the command output is correct).
3. If you open a URL or an App, the task is ALMOST NEVER finished. You usually need at least one more step to click or type.
4. BRAVE/CHROME CONTROL: Use the provided AppleScript for YouTube playback/search whenever possible to avoid multiple windows. If the browser is already on YouTube, DO NOT open a new URL; use AppleScript to search or play directly.`

interface UseOpenRouterReturn {
  sendMessage: (
    text: string,
    screenshot?: string | null,
    history?: Array<{ role: 'user' | 'assistant'; content: string }>,
    memoryContext?: string | null
  ) => Promise<AIResponse | null>
  isStreaming: boolean
  streamingText: string
  error: string | null
  cancelStream: () => void
}

export function useOpenRouter(onToken?: (token: string) => void): UseOpenRouterReturn {
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const cancelStream = useCallback((): void => {
    abortRef.current?.abort()
  }, [])

  const sendMessage = useCallback(
    async (
      text: string,
      screenshot?: string | null,
      history?: Array<{ role: 'user' | 'assistant'; content: string }>,
      memoryContext?: string | null
    ): Promise<AIResponse | null> => {
      const apiKey = import.meta.env.VITE_OPENROUTER_KEY
      if (!apiKey) {
        setError('VITE_OPENROUTER_KEY not set')
        return null
      }

      abortRef.current?.abort()
      abortRef.current = new AbortController()

      setIsStreaming(true)
      setStreamingText('')
      setError(null)

      // Build system prompt with memory context
      const systemPromptWithMemory =
        SYSTEM_PROMPT + (memoryContext ? `\n\nPrevious session context:\n${memoryContext}` : '')

      // Build history messages
      const historyMessages = (history || []).map((msg) => ({
        role: msg.role,
        content: [{ type: 'text', text: msg.content }]
      }))

      // Current user message content — include screenshot if available
      const userContent: unknown[] = screenshot
        ? [
            { type: 'image_url', image_url: { url: screenshot } },
            { type: 'text', text }
          ]
        : [{ type: 'text', text }]

      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://consciouss.ai',
            'X-Title': 'ConscioussAI'
          },
          body: JSON.stringify({
            model: MODEL,
            stream: true,
            messages: [
              { role: 'system', content: systemPromptWithMemory },
              ...historyMessages,
              { role: 'user', content: userContent }
            ]
          }),
          signal: abortRef.current.signal
        })

        if (!res.ok) {
          const errText = await res.text()
          throw new Error(`OpenRouter ${res.status}: ${errText}`)
        }

        const reader = res.body?.getReader()
        if (!reader) throw new Error('No response body')

        const decoder = new TextDecoder()
        let fullText = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const token: string = parsed.choices?.[0]?.delta?.content ?? ''
              if (token) {
                fullText += token
                setStreamingText(fullText)
                onToken?.(token)
              }
            } catch {
              // Incomplete JSON chunk — skip
            }
          }
        }

        // Parse final JSON response
        console.log('[useOpenRouter] raw response:', fullText)
        let aiResponse: AIResponse
        try {
          // Robust JSON extraction — find the first { and the last }
          const start = fullText.indexOf('{')
          const end = fullText.lastIndexOf('}')
          if (start === -1 || end === -1) throw new Error('No JSON object found')

          const clean = fullText.slice(start, end + 1)
          aiResponse = JSON.parse(clean)
          console.log('[useOpenRouter] parsed action:', aiResponse.action)
        } catch {
          // If JSON parse fails, treat full text as message with no action
          console.warn('[useOpenRouter] JSON parse failed, falling back to plain message')
          aiResponse = {
            message: fullText,
            action: { type: 'none' },
            continue_task: false
          }
        }

        setStreamingText('')
        // No need for global state update here, the local 'stitched' is passed to AI
        return aiResponse
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return null
        }
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setError(msg)
        console.error('[useOpenRouter]', msg)
        return null
      } finally {
        setIsStreaming(false)
      }
    },
    [onToken] // eslint-disable-line react-hooks/exhaustive-deps
  )

  return { sendMessage, isStreaming, streamingText, error, cancelStream }
}
