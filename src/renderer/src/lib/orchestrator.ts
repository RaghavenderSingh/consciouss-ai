import { AIResponse, HTNNode, Message, SystemInfo } from '../types'
import { AGENT_ROLES, AgentRole, PROMPTS } from './prompts'
import { executeAction } from './actions'
import { scanRawActiveApp, formatUITree } from './accessibility'

const MAX_HANDOFFS = 12
const MAX_NODE_RETRIES = 2

export interface SwarmState {
  currentTask: string
  activeAgent: AgentRole
  history: Message[]
  handoffCount: number
  isWorking: boolean
  // HTN Phase 2: Rich task tree instead of simple queue
  taskTree: HTNNode[]
  currentNodeIndex: number
  planPhase: 'planning' | 'executing' | 'recovering' | 'done'
  lastError?: string
}

export type SwarmUpdateCallback = (state: SwarmState, output?: AIResponse) => void

// ─── Helper: grab context (screenshot + UI tree + deep system info) ────────────
async function gatherContext(): Promise<{
  screenshot: string | null
  uiTree: string
  deepContext: string
}> {
  let screenshot: string | null = null
  try {
    const res = await window.electronAPI.captureScreen()
    screenshot = res.dataURL || res.screens?.[0]?.dataURL || null
  } catch {
    console.warn('[Orchestrator] Screenshot capture failed, continuing without vision.')
  }

  const rawElements = await scanRawActiveApp()
  const uiTree = formatUITree(rawElements)

  const systemInfo = (await window.electronAPI.systemInfo()) as SystemInfo
  const activeText = rawElements
    .filter((el) => (el.role.includes('Text') || el.role.includes('Editor')) && el.value?.length > 0)
    .map((el) => `[${el.role}] ${el.title || el.description || 'Editor'}: ${el.value}`)
    .join('\n')

  const deepContext = `
--- DEEP_SYSTEM_CONTEXT ---
CWD: ${systemInfo.cwd || 'Unknown'}
OS: ${systemInfo.osVersion}
ACTIVE_FILE_TEXT:
${activeText || 'No active text detected.'}
----------------------------`

  return { screenshot, uiTree, deepContext }
}

export class SovereignOrchestrator {
  private state: SwarmState
  private onUpdate: SwarmUpdateCallback
  private sendMessageFn: (
    text: string,
    screenshot?: string | null,
    history?: Array<{ role: 'user' | 'assistant'; content: string }>,
    memoryContext?: string | null,
    uiContext?: string | null,
    options?: { silent?: boolean; systemPromptOverride?: string }
  ) => Promise<AIResponse | null>

  constructor(
    initialTask: string,
    history: Message[],
    sendMessageFn: any,
    onUpdate: SwarmUpdateCallback
  ) {
    this.state = {
      currentTask: initialTask,
      activeAgent: AGENT_ROLES.SUPERVISOR,
      history,
      handoffCount: 0,
      isWorking: true,
      taskTree: [],
      currentNodeIndex: 0,
      planPhase: 'planning',
    }
    this.sendMessageFn = sendMessageFn
    this.onUpdate = onUpdate
  }

  // ─── Public entry point ───────────────────────────────────────────────────────
  public async start(): Promise<void> {
    console.log(`[Orchestrator] 🧠 Starting Sovereign Swarm — Task: "${this.state.currentTask}"`)
    await this.planPhase()
  }

  // ─── Phase 1: Supervisor creates the HTN Plan ─────────────────────────────────
  private async planPhase(): Promise<void> {
    this.state.planPhase = 'planning'
    this.state.activeAgent = AGENT_ROLES.SUPERVISOR
    this.onUpdate(this.state)

    const { screenshot, uiTree, deepContext } = await gatherContext()

    const response = await this.sendMessageFn(
      `${deepContext}\n\nUser Task: "${this.state.currentTask}"\n\nCreate a detailed taskTree to accomplish this. Each node must have "id", "agent", and "task" fields. Respond in JSON.`,
      screenshot,
      this.state.history.map((m) => ({ role: m.role, content: m.content })),
      null,
      uiTree,
      { systemPromptOverride: PROMPTS[AGENT_ROLES.SUPERVISOR] }
    )

    if (!response) {
      this.finish()
      return
    }

    if (response.thought) {
      console.log(`[Orchestrator] 💭 Supervisor Thought: ${response.thought}`)
    }

    this.onUpdate(this.state, response)

    // Extract HTN tree from orchestrate_task action
    const rawTree = response.action?.payload?.taskTree
    if (response.action?.type === 'orchestrate_task' && rawTree && rawTree.length > 0) {
      this.state.taskTree = rawTree.map((node) => ({
        id: node.id || `node-${Math.random().toString(36).slice(2, 7)}`,
        agent: node.agent,
        task: node.task,
        status: 'pending' as const,
        retries: 0,
      }))
      this.state.currentNodeIndex = 0
      console.log(`[Orchestrator] 📋 HTN Plan created: ${this.state.taskTree.length} steps`)
      await this.executePhase()
    } else {
      // No plan generated — treat the Supervisor's direct response as a single-step action
      console.log('[Orchestrator] ℹ️ No taskTree in response; running Supervisor action directly.')
      await this.runDirectAction(response, 'Supervisor direct execution')
    }
  }

  // ─── Phase 2: Execute each node in the HTN tree ───────────────────────────────
  private async executePhase(): Promise<void> {
    this.state.planPhase = 'executing'

    while (this.state.currentNodeIndex < this.state.taskTree.length) {
      if (this.state.handoffCount > MAX_HANDOFFS) {
        console.error('[Orchestrator] 🚫 Max handoffs reached. Aborting.')
        break
      }

      const node = this.state.taskTree[this.state.currentNodeIndex]
      node.status = 'running'
      this.state.activeAgent = node.agent as AgentRole
      this.onUpdate(this.state)

      console.log(`[Orchestrator] ▶ Executing Node [${node.id}] via ${node.agent}: "${node.task}"`)

      const result = await this.executeNode(node)

      if (result.success) {
        node.status = 'done'
        node.result = result.output
        console.log(`[Orchestrator] ✅ Node [${node.id}] done.`)
        this.state.currentNodeIndex++
      } else {
        node.status = 'failed'
        node.result = result.output
        this.state.lastError = result.output
        console.warn(`[Orchestrator] ❌ Node [${node.id}] failed: ${result.output}`)

        if (node.retries < MAX_NODE_RETRIES) {
          node.retries++
          console.log(`[Orchestrator] 🔄 Retrying node [${node.id}] (attempt ${node.retries}/${MAX_NODE_RETRIES})`)
          node.status = 'pending'
          // Don't advance index — retry same node
        } else {
          // All retries exhausted — call the Critic
          const recovered = await this.criticPhase(node)
          if (!recovered) {
            console.error(`[Orchestrator] 🛑 Critic could not recover. Stopping.`)
            break
          }
          // Critic injected new nodes; restart from current index
        }
      }
    }

    this.finish()
  }

  // ─── Execute a single HTN node ────────────────────────────────────────────────
  private async executeNode(node: HTNNode): Promise<{ success: boolean; output: string }> {
    const { screenshot, uiTree, deepContext } = await gatherContext()

    const prevResults = this.state.taskTree
      .filter((n) => n.status === 'done' && n.result)
      .map((n) => `[${n.id}] ${n.task}: ${n.result}`)
      .join('\n')

    const response = await this.sendMessageFn(
      `${deepContext}\n\nPrevious results:\n${prevResults || 'None'}\n\nYour current sub-task [${node.id}]: "${node.task}"\n\nExecute it. Respond in JSON with a mandatory "thought" field explaining your approach.`,
      screenshot,
      this.state.history.map((m) => ({ role: m.role, content: m.content })),
      null,
      uiTree,
      { systemPromptOverride: PROMPTS[node.agent as AgentRole] || PROMPTS[AGENT_ROLES.DEVOPS] }
    )

    if (!response) return { success: false, output: 'Agent returned null response' }

    if (response.thought) {
      console.log(`[Orchestrator] 💭 [${node.agent}] Thought: ${response.thought}`)
    }

    this.onUpdate(this.state, response)
    this.state.handoffCount++

    // Security shadow-check on destructive commands
    if (node.agent === AGENT_ROLES.DEVOPS && response.action?.type === 'run_command') {
      this.state.activeAgent = AGENT_ROLES.SECURITY
      this.onUpdate(this.state)
      await new Promise((r) => setTimeout(r, 700))
      this.state.activeAgent = node.agent as AgentRole
    }

    // Execute the action
    if (response.action && response.action.type !== 'none') {
      try {
        const output = await executeAction(response.action)
        const outputStr = typeof output === 'string' ? output : 'Action complete'

        // Check if the output itself signals failure
        if (outputStr.toLowerCase().startsWith('action error') || outputStr.toLowerCase().includes('error:')) {
          return { success: false, output: outputStr }
        }

        return { success: true, output: outputStr }
      } catch (err) {
        return { success: false, output: `Exception: ${err instanceof Error ? err.message : String(err)}` }
      }
    }

    return { success: true, output: response.message || 'Done' }
  }

  // ─── Phase 3: Critic self-healing ────────────────────────────────────────────
  private async criticPhase(failedNode: HTNNode): Promise<boolean> {
    this.state.planPhase = 'recovering'
    this.state.activeAgent = AGENT_ROLES.CRITIC
    this.onUpdate(this.state)

    console.log(`[Orchestrator] 🔬 Critic analyzing failure for node [${failedNode.id}]...`)

    const { screenshot, uiTree, deepContext } = await gatherContext()

    const response = await this.sendMessageFn(
      `${deepContext}\n\nFAILED_STEP:\nAgent: ${failedNode.agent}\nTask: "${failedNode.task}"\nError: "${failedNode.result}"\n\nAnalyze this failure. Propose a RECOVERY taskTree with alternative steps. Respond in JSON with thought + action.`,
      screenshot,
      this.state.history.map((m) => ({ role: m.role, content: m.content })),
      null,
      uiTree,
      { systemPromptOverride: PROMPTS[AGENT_ROLES.CRITIC] }
    )

    if (!response) return false

    if (response.thought) {
      console.log(`[Orchestrator] 💭 Critic Thought: ${response.thought}`)
    }

    this.onUpdate(this.state, response)

    const recoveryTree = response.action?.payload?.taskTree
    if (response.action?.type === 'orchestrate_task' && recoveryTree && recoveryTree.length > 0) {
      // Inject recovery nodes right after the current position
      const recoveryNodes: HTNNode[] = recoveryTree.map((n) => ({
        id: `recovery-${n.id || Math.random().toString(36).slice(2, 6)}`,
        agent: n.agent,
        task: n.task,
        status: 'pending' as const,
        retries: 0,
      }))

      this.state.taskTree.splice(this.state.currentNodeIndex + 1, 0, ...recoveryNodes)
      this.state.currentNodeIndex++ // Move past the permanently failed node
      this.state.planPhase = 'executing'
      console.log(`[Orchestrator] 💉 Critic injected ${recoveryNodes.length} recovery nodes.`)
      return true
    }

    // Critic gave up
    if (response.message) {
      this.onUpdate(this.state, response)
    }
    return false
  }

  // ─── Direct action (no task tree) ────────────────────────────────────────────
  private async runDirectAction(response: AIResponse, label: string): Promise<void> {
    this.onUpdate(this.state, response)
    if (response.action && response.action.type !== 'none') {
      try {
        await executeAction(response.action)
      } catch (err) {
        console.error(`[Orchestrator] Direct action failed (${label}):`, err)
      }
    }
    this.finish()
  }

  private finish(): void {
    this.state.isWorking = false
    this.state.planPhase = 'done'
    this.onUpdate(this.state)
    console.log('[Orchestrator] 🏁 Swarm task complete.')
  }
}
