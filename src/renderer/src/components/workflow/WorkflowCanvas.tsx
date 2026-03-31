import React, { useCallback, useRef, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  BackgroundVariant,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './workflowStyles.css'

import ActionNode from './ActionNode'
import TriggerNode from './TriggerNode'
import AnimatedEdge from './AnimatedEdge'
import NodePalette from './NodePalette'
import NodeConfigPanel from './NodeConfigPanel'
import type { WorkflowNodeData } from '../../types'

interface Props {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: (nodes: Node[]) => void
  onEdgesChange: (edges: Edge[]) => void
  onSave: () => void
  onRun: () => void
  onStop: () => void
  onBack: () => void
  workflowName: string
  onNameChange: (name: string) => void
  isRunning: boolean
}

let nodeIdCounter = 0
function getNextId() {
  return `node_${Date.now()}_${nodeIdCounter++}`
}

function WorkflowCanvasInner({
  nodes,
  edges,
  onNodesChange: setNodes,
  onEdgesChange: setEdges,
  onSave,
  onRun,
  onStop,
  onBack,
  workflowName,
  onNameChange,
  isRunning,
}: Props) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const nodeTypes = useMemo(() => ({
    trigger: TriggerNode,
    action: ActionNode,
  }), [])

  const edgeTypes = useMemo(() => ({
    animated: AnimatedEdge,
  }), [])

  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const updated = applyNodeChanges(changes, nodes) as Node[]
      setNodes(updated)
    },
    [nodes, setNodes]
  )

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const updated = applyEdgeChanges(changes, edges) as Edge[]
      setEdges(updated)
    },
    [edges, setEdges]
  )

  const handleConnect: OnConnect = useCallback(
    (connection) => {
      const updated = addEdge(
        { ...connection, type: 'animated' },
        edges
      ) as Edge[]
      setEdges(updated)
    },
    [edges, setEdges]
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const nodeType = e.dataTransfer.getData('application/reactflow-type')
      const actionType = e.dataTransfer.getData('application/reactflow-action')
      const label = e.dataTransfer.getData('application/reactflow-label')

      if (!nodeType || !actionType) return

      const bounds = reactFlowWrapper.current?.getBoundingClientRect()
      if (!bounds) return

      const position = {
        x: e.clientX - bounds.left - 100,
        y: e.clientY - bounds.top - 30,
      }

      const newNode: Node = {
        id: getNextId(),
        type: nodeType,
        position,
        data: {
          label: label || actionType,
          actionType,
          payload: actionType === 'delay' ? { delayMs: 1000 } : {},
          status: 'idle',
        } as WorkflowNodeData,
      }

      setNodes([...nodes, newNode])
    },
    [nodes, setNodes]
  )

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id)
  }, [])

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  const handleNodeDataUpdate = useCallback(
    (nodeId: string, updates: Partial<WorkflowNodeData>) => {
      const updated = nodes.map((n) => {
        if (n.id !== nodeId) return n
        return {
          ...n,
          data: { ...(n.data as WorkflowNodeData), ...updates } as WorkflowNodeData,
        }
      }) as Node[]
      setNodes(updated)
    },
    [nodes, setNodes]
  )

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', flexDirection: 'column' }}>
      {/* Top Toolbar */}
      <div
        style={{
          height: 52,
          background: 'rgba(12, 12, 12, 0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              borderRadius: 8,
              padding: '6px 12px',
              color: 'rgba(255,255,255,0.5)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ← Back
          </button>
          <input
            type="text"
            value={workflowName}
            onChange={(e) => onNameChange(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: 15,
              fontWeight: 700,
              outline: 'none',
              letterSpacing: '-0.02em',
              width: 240,
            }}
            placeholder="Untitled Workflow"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={onSave}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              padding: '7px 16px',
              color: 'white',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Save
          </button>
          {isRunning ? (
            <button
              onClick={onStop}
              style={{
                background: 'rgba(248,113,113,0.15)',
                border: '1px solid rgba(248,113,113,0.3)',
                borderRadius: 10,
                padding: '7px 16px',
                color: '#f87171',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ■ Stop
            </button>
          ) : (
            <button
              onClick={onRun}
              style={{
                background: 'linear-gradient(135deg, #FF54B0, #FF4B33)',
                border: 'none',
                borderRadius: 10,
                padding: '7px 16px',
                color: 'white',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ▶ Run
            </button>
          )}
        </div>
      </div>

      {/* Canvas + Panels */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Node Palette */}
        <NodePalette />

        {/* React Flow Canvas */}
        <div ref={reactFlowWrapper} style={{ flex: 1, height: '100%' }}>
          <ReactFlow
            className="workflow-canvas"
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{ type: 'animated' }}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            deleteKeyCode="Backspace"
            minZoom={0.2}
            maxZoom={2}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255,255,255,0.04)" />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={() => 'rgba(255,255,255,0.15)'}
              maskColor="rgba(255, 84, 176, 0.06)"
              style={{ background: 'rgba(0,0,0,0.5)' }}
            />
          </ReactFlow>
        </div>

        {/* Config Panel */}
        {selectedNode && (
          <NodeConfigPanel
            nodeId={selectedNode.id}
            data={selectedNode.data as unknown as WorkflowNodeData}
            onUpdate={handleNodeDataUpdate}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>
    </div>
  )
}

export default function WorkflowCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
