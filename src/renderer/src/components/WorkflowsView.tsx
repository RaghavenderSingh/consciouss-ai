import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiZap, FiPlus, FiPlay, FiTrash2, FiEdit2 } from 'react-icons/fi'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import type { Node, Edge } from '@xyflow/react'
import WorkflowCanvas from './workflow/WorkflowCanvas'
import type { Workflow, WorkflowNodeData, WorkflowProgress } from '../types'

type ViewMode = 'list' | 'editor'

export default function WorkflowsView(): React.ReactElement {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [activeWorkflow, setActiveWorkflow] = useState<Workflow | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  // ReactFlow state
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [workflowName, setWorkflowName] = useState('Untitled Workflow')

  // Load workflows on mount
  useEffect(() => {
    loadWorkflows()
    // Listen for progress
    const cleanup = window.electronAPI?.onWorkflowProgress?.((data: WorkflowProgress) => {
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== data.nodeId) return n
          return {
            ...n,
            data: {
              ...(n.data as WorkflowNodeData),
              status: data.status,
              error: data.error,
              output: data.output,
            } as WorkflowNodeData,
          }
        }) as Node[]
      )
      if (data.status === 'error') {
        setIsRunning(false)
      }
    })
    return () => { cleanup?.() }
  }, [])

  const loadWorkflows = async () => {
    try {
      const list = await window.electronAPI?.listWorkflows?.()
      setWorkflows(list || [])
    } catch (err) {
      console.error('[WorkflowsView] Failed to load workflows:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleNew = () => {
    const triggerNode: Node = {
      id: 'trigger_1',
      type: 'trigger',
      position: { x: 250, y: 50 },
      data: {
        label: 'Start',
        actionType: 'trigger',
        payload: {},
        status: 'idle',
      } as WorkflowNodeData,
    }
    setNodes([triggerNode])
    setEdges([])
    setWorkflowName('Untitled Workflow')
    setActiveWorkflow(null)
    setViewMode('editor')
  }

  const handleEdit = (wf: Workflow) => {
    setActiveWorkflow(wf)
    setWorkflowName(wf.name)
    setNodes(
      wf.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: { ...n.data, status: 'idle' } as WorkflowNodeData,
      })) as Node[]
    )
    setEdges(
      wf.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'animated',
      })) as Edge[]
    )
    setViewMode('editor')
  }

  const handleSave = useCallback(async (): Promise<string> => {
    const now = new Date().toISOString()
    const id = activeWorkflow?.id || `wf_${Date.now()}`
    const wf: Workflow = {
      id,
      name: workflowName || 'Untitled Workflow',
      description: '',
      icon: '⚡',
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type || 'action',
        position: n.position,
        data: n.data as unknown as WorkflowNodeData,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
      viewport: { x: 0, y: 0, zoom: 1 },
      createdAt: activeWorkflow?.createdAt || now,
      updatedAt: now,
      runCount: activeWorkflow?.runCount || 0,
    }

    try {
      await window.electronAPI?.saveWorkflow?.(wf)
      setActiveWorkflow(wf)
      await loadWorkflows()
    } catch (err) {
      console.error('[WorkflowsView] Failed to save:', err)
    }
    return id
  }, [nodes, edges, workflowName, activeWorkflow])

  const handleRun = useCallback(async () => {
    // Always save first to ensure the workflow exists on disk
    const savedId = await handleSave()

    // Reset all node statuses
    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        data: { ...(n.data as WorkflowNodeData), status: 'idle', error: undefined } as WorkflowNodeData,
      })) as Node[]
    )
    setIsRunning(true)
    try {
      await window.electronAPI?.runWorkflow?.(savedId)
    } catch (err) {
      console.error('[WorkflowsView] Run failed:', err)
    } finally {
      setIsRunning(false)
    }
  }, [handleSave])

  const handleStop = useCallback(async () => {
    await window.electronAPI?.stopWorkflow?.()
    setIsRunning(false)
  }, [])

  const handleDelete = async (id: string) => {
    try {
      await window.electronAPI?.deleteWorkflow?.(id)
      await loadWorkflows()
    } catch (err) {
      console.error('[WorkflowsView] Failed to delete:', err)
    }
  }

  const handleBack = () => {
    setViewMode('list')
    setActiveWorkflow(null)
    setIsRunning(false)
    // Reset statuses
    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        data: { ...(n.data as WorkflowNodeData), status: 'idle' } as WorkflowNodeData,
      })) as Node[]
    )
  }

  // ─── Render List Mode ──────────────────────────────────
  if (viewMode === 'list') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: '40px',
          overflowY: 'auto',
          gap: 32,
          maxWidth: 900,
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1
              style={{
                color: 'white',
                fontSize: 28,
                fontWeight: 700,
                margin: 0,
                letterSpacing: '-0.03em',
              }}
            >
              Workflows
            </h1>
            <p
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 15,
                marginTop: 4,
              }}
            >
              Build visual automations with drag-and-drop nodes
            </p>
          </div>
          <button
            onClick={handleNew}
            style={{
              background: 'linear-gradient(135deg, #FF54B0, #FF4B33)',
              border: 'none',
              borderRadius: 12,
              padding: '10px 20px',
              color: 'white',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <FiPlus size={16} />
            New Workflow
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 300,
                color: 'rgba(255,255,255,0.3)',
              }}
            >
              <AiOutlineLoading3Quarters size={24} style={{ animation: 'nodeRunningSpinner 1s linear infinite' }} />
            </motion.div>
          ) : workflows.length === 0 ? (
            <EmptyState onNew={handleNew} />
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280, 1fr))',
                gap: 16,
              }}
            >
              {workflows.map((wf) => (
                <WorkflowCard
                  key={wf.id}
                  workflow={wf}
                  onEdit={() => handleEdit(wf)}
                  onDelete={() => handleDelete(wf.id)}
                  onRun={() => {
                    handleEdit(wf)
                    setTimeout(() => handleRun(), 100)
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ─── Render Editor Mode ─────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ height: '100%', width: '100%' }}
    >
      <WorkflowCanvas
        nodes={nodes}
        edges={edges}
        onNodesChange={setNodes}
        onEdgesChange={setEdges}
        onSave={handleSave}
        onRun={handleRun}
        onStop={handleStop}
        onBack={handleBack}
        workflowName={workflowName}
        onNameChange={setWorkflowName}
        isRunning={isRunning}
      />
    </motion.div>
  )
}

// ─── Sub-components ───────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: 400,
        gap: 20,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(255,84,176,0.1), rgba(255,75,51,0.1))',
          border: '1px solid rgba(255,84,176,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FiZap size={32} color="#FF54B0" />
      </div>
      <div>
        <h2
          style={{
            color: 'white',
            fontSize: 22,
            fontWeight: 700,
            margin: '0 0 8px 0',
            letterSpacing: '-0.02em',
          }}
        >
          No workflows yet
        </h2>
        <p
          style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: 14,
            maxWidth: 360,
            lineHeight: 1.5,
          }}
        >
          Create your first automation by dragging nodes onto a canvas
          and connecting them together.
        </p>
      </div>
      <button
        onClick={onNew}
        style={{
          background: 'linear-gradient(135deg, #FF54B0, #FF4B33)',
          border: 'none',
          borderRadius: 14,
          padding: '12px 28px',
          color: 'white',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 4,
        }}
      >
        <FiPlus size={18} />
        Create Your First Workflow
      </button>
    </motion.div>
  )
}

function WorkflowCard({
  workflow,
  onEdit,
  onDelete,
  onRun,
}: {
  workflow: Workflow
  onEdit: () => void
  onDelete: () => void
  onRun: () => void
}) {
  const nodeCount = workflow.nodes.filter((n) => n.type !== 'trigger').length
  const lastRun = workflow.lastRunAt
    ? new Date(workflow.lastRunAt).toLocaleDateString()
    : 'Never'

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.06)',
        padding: 24,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        position: 'relative',
        overflow: 'hidden',
      }}
      onClick={onEdit}
    >
      {/* Gradient bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'linear-gradient(90deg, #FF54B0, #FF4B33)',
          opacity: 0.5,
        }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'rgba(255,84,176,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}
          >
            <FiZap size={20} color="#FF54B0" />
          </div>
          <div>
            <div
              style={{
                color: 'white',
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: '-0.01em',
              }}
            >
              {workflow.name}
            </div>
            <div
              style={{
                color: 'rgba(255,255,255,0.35)',
                fontSize: 12,
                marginTop: 2,
              }}
            >
              {nodeCount} {nodeCount === 1 ? 'step' : 'steps'}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div
          style={{ display: 'flex', gap: 4 }}
          onClick={(e) => e.stopPropagation()}
        >
          <IconBtn onClick={onRun} title="Run">
            <FiPlay size={13} />
          </IconBtn>
          <IconBtn onClick={onEdit} title="Edit">
            <FiEdit2 size={13} />
          </IconBtn>
          <IconBtn onClick={onDelete} title="Delete" danger>
            <FiTrash2 size={13} />
          </IconBtn>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 16,
          fontSize: 11,
          color: 'rgba(255,255,255,0.25)',
        }}
      >
        <span>Last run: {lastRun}</span>
        <span>Runs: {workflow.runCount}</span>
      </div>
    </motion.div>
  )
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 8,
        padding: 6,
        cursor: 'pointer',
        color: danger ? '#f87171' : 'rgba(255,255,255,0.4)',
        display: 'flex',
        alignItems: 'center',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'
        ;(e.currentTarget as HTMLButtonElement).style.color = danger ? '#f87171' : 'white'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'
        ;(e.currentTarget as HTMLButtonElement).style.color = danger ? '#f87171' : 'rgba(255,255,255,0.4)'
      }}
    >
      {children}
    </button>
  )
}
