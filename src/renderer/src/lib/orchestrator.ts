import { AIResponse, Message, SystemInfo } from '../types'
import { AGENT_ROLES, AgentRole, PROMPTS } from './prompts'
import { executeAction } from './actions'
import { scanRawActiveApp, formatUITree } from './accessibility'

export interface SwarmState {
  currentTask: string
  activeAgent: AgentRole
  history: Message[]
  handoffCount: number
  isWorking: boolean
  taskQueue: Array<{ agent: string; task: string }>
}

export type SwarmUpdateCallback = (state: SwarmState, output?: AIResponse) => void

export class SovereignOrchestrator {
  private state: SwarmState
  private onUpdate: SwarmUpdateCallback
  private sendMessageFn: any // Passed from useOpenRouter hook indirectly or via prop

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
      taskQueue: [],
    }
    this.sendMessageFn = sendMessageFn
    this.onUpdate = onUpdate
  }

  public async start() {
    console.log(`[Orchestrator] Starting Swarm for task: ${this.state.currentTask}`)
    await this.step(this.state.currentTask)
  }

  private async step(input: string, screenshot?: string | null) {
    if (this.state.handoffCount > 10) {
      console.error('[Orchestrator] Max handoffs reached (Infinite loop protection)')
      this.finish()
      return
    }

    this.onUpdate(this.state)

    // 1. Prepare Context (Vision + Accessibility)
    let currentScreenshot = screenshot
    if (!currentScreenshot) {
      try {
        const res = await window.electronAPI.captureScreen()
        currentScreenshot = res.dataURL || (res.screens?.[0]?.dataURL) || null
      } catch (err) {
        console.error('[Orchestrator] Vision capture failed:', err)
      }
    }

    const rawElements = await scanRawActiveApp()
    const uiTree = formatUITree(rawElements)

    // 1.1 Deep Context (System Heuristics + Active Editor)
    const systemInfo = await window.electronAPI.systemInfo() as SystemInfo
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
----------------------------
`

    // 2. Call Active Agent
    const systemPrompt = PROMPTS[this.state.activeAgent]
    
    // We pass null for memoryContext and uiContext as the specialized agent prompt handles its own logic, 
    // but we inject the UI tree into the specialized agent's view.
    const response = await this.sendMessageFn(
      `${deepContext}\nTask: "${input}". Current Active Department: ${this.state.activeAgent}. Response MUST be JSON.`,
      currentScreenshot,
      this.state.history.map(m => ({ role: m.role, content: m.content })),
      null,
      uiTree,
      { systemPromptOverride: systemPrompt } // Support for prompt override
    )

    if (!response) {
      this.finish()
      return
    }

    // 3. Process Response
    this.onUpdate(this.state, response)

    // 4. Handle Action (with Shadow OS Verification)
    let actionResult = ''
    if (response.action && response.action.type !== 'none') {
      // SHADOW STEP: If DevOps tries to run a command, Security must verify
      if (this.state.activeAgent === AGENT_ROLES.DEVOPS && response.action.type === 'run_command') {
        console.log('[Orchestrator] Shadow Step: Consulting Security Department...')
        const previousAgent = this.state.activeAgent
        this.state.activeAgent = AGENT_ROLES.SECURITY
        this.onUpdate(this.state) // Trigger "Security Department" UI
        
        await new Promise(r => setTimeout(r, 800)) // Simulation of "Security Review"
        this.state.activeAgent = previousAgent
      }

      try {
        const output = await executeAction(response.action)
        actionResult = typeof output === 'string' ? output : 'Action complete'
      } catch (err) {
        actionResult = `Action Error: ${err instanceof Error ? err.message : String(err)}`
      }
    }

    // 5. Handle Handoff
    if (response.handoff && response.handoff.target && response.handoff.target !== this.state.activeAgent) {
      console.log(`[Orchestrator] Handoff: ${this.state.activeAgent} -> ${response.handoff.target}`)
      this.state.activeAgent = response.handoff.target as AgentRole
      this.state.handoffCount++
      
      const handoffInput = `Action Result: ${actionResult}. Handoff Reason: ${response.handoff.reason}. NEXT STEP.`
      await this.step(handoffInput)
      return
    }

    // 5.1 Handle Orchestration Plan (Task Decompositon)
    if (response.action && response.action.type === 'orchestrate_task') {
      const tree = response.action.payload?.taskTree || []
      if (tree.length > 0) {
        console.log(`[Orchestrator] TaskDecomposition: ${tree.length} steps planned.`)
        this.state.taskQueue = [...tree]
        // Auto-handoff to the first agent in the tree
        const first = this.state.taskQueue.shift()!
        this.state.activeAgent = first.agent as AgentRole
        await this.step(`Plan initiated. Your sub-task: "${first.task}"`)
        return
      }
    }

    // 6. Continue Task Check
    if (this.state.taskQueue.length > 0) {
      const next = this.state.taskQueue.shift()!
      console.log(`[Orchestrator] Next Step in Plan: ${next.agent} -> ${next.task}`)
      this.state.activeAgent = next.agent as AgentRole
      await this.step(`Previous result: ${actionResult}. Your next sub-task in the plan: "${next.task}"`)
      return
    }

    if (response.continue_task) {
      console.log('[Orchestrator] Continuing task loop...')
      await new Promise(r => setTimeout(r, 1000))
      await this.step(`Previous result: ${actionResult}. Proceed with next step.`)
    } else {
      this.finish()
    }
  }

  private finish() {
    this.state.isWorking = false
    this.onUpdate(this.state)
    console.log('[Orchestrator] Swarm task complete.')
  }
}
