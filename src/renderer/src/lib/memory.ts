/**
 * lib/memory.ts — Structured Persistent Memory for Consciouss AI
 *
 * Stores typed "facts" the agent can read and write across sessions.
 * Each fact has a category, content, confidence score, and timestamp.
 *
 * Categories:
 *   'user'      — things about the user (name, prefs, style)
 *   'project'   — active projects, their repos, stack, current status
 *   'system'    — learned facts about the user's machine (apps, paths)
 *   'procedure' — sequences that worked ("to deploy: run X then Y")
 *   'error'     — errors encountered and how they were fixed
 */

export type MemoryCategory = 'user' | 'project' | 'system' | 'procedure' | 'error'

export interface MemoryFact {
  id: string
  category: MemoryCategory
  content: string
  confidence: number        // 0.0–1.0
  createdAt: string         // ISO timestamp
  updatedAt: string
  accessCount: number
}

export interface MemoryStore {
  version: number
  facts: MemoryFact[]
  lastConsolidatedAt?: string
}

// ─── Read the full memory store from disk (via Electron IPC) ──────────────────
export async function readMemoryStore(): Promise<MemoryStore> {
  try {
    const data = await window.electronAPI.readMemory()
    if (data && data.version) return data as MemoryStore
  } catch {
    // File doesn't exist yet
  }
  return { version: 1, facts: [] }
}

// ─── Write the full store to disk ─────────────────────────────────────────────
export async function writeMemoryStore(store: MemoryStore): Promise<void> {
  await window.electronAPI.writeMemory(store)
}

// ─── Add or update a fact ─────────────────────────────────────────────────────
export async function upsertFact(
  category: MemoryCategory,
  content: string,
  confidence = 0.8
): Promise<MemoryFact> {
  const store = await readMemoryStore()
  const now = new Date().toISOString()

  // Look for an existing fact with very similar content (simple substring check)
  const existing = store.facts.find(
    (f) => f.category === category && f.content.toLowerCase().includes(content.slice(0, 40).toLowerCase())
  )

  if (existing) {
    existing.content = content
    existing.confidence = Math.min(1.0, existing.confidence + 0.05)
    existing.updatedAt = now
    existing.accessCount++
    await writeMemoryStore(store)
    return existing
  }

  const fact: MemoryFact = {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    category,
    content,
    confidence,
    createdAt: now,
    updatedAt: now,
    accessCount: 0,
  }

  store.facts.push(fact)
  await writeMemoryStore(store)
  return fact
}

// ─── Query facts for agent context ───────────────────────────────────────────
export async function queryRelevantFacts(
  query: string,
  limitPerCategory = 3
): Promise<MemoryFact[]> {
  const store = await readMemoryStore()
  const q = query.toLowerCase()

  // Score each fact by relevance (keyword overlap)
  const scored = store.facts
    .map((f) => {
      const words = q.split(/\s+/)
      const hits = words.filter((w) => w.length > 3 && f.content.toLowerCase().includes(w)).length
      return { fact: f, score: hits * f.confidence }
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)

  // Deduplicate by category, keeping top N per category
  const byCategory: Record<string, MemoryFact[]> = {}
  for (const { fact } of scored) {
    if (!byCategory[fact.category]) byCategory[fact.category] = []
    if (byCategory[fact.category].length < limitPerCategory) {
      byCategory[fact.category].push(fact)
    }
  }

  return Object.values(byCategory).flat()
}

// ─── Format facts for injection into system prompt ────────────────────────────
export function formatMemoryContext(facts: MemoryFact[]): string {
  if (facts.length === 0) return ''

  const groups: Record<string, string[]> = {}
  for (const f of facts) {
    if (!groups[f.category]) groups[f.category] = []
    groups[f.category].push(`  • ${f.content}`)
  }

  let out = '--- LONG-TERM MEMORY (high-confidence facts about this user) ---\n'
  for (const [cat, lines] of Object.entries(groups)) {
    out += `[${cat.toUpperCase()}]\n${lines.join('\n')}\n`
  }
  out += '--- END MEMORY ---\n'
  return out
}

// ─── Delete low-confidence facts (housekeeping) ───────────────────────────────
export async function pruneMemory(threshold = 0.2): Promise<number> {
  const store = await readMemoryStore()
  const before = store.facts.length
  store.facts = store.facts.filter((f) => f.confidence >= threshold)
  await writeMemoryStore(store)
  return before - store.facts.length
}
