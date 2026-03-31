import React, { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { HiCursorClick } from 'react-icons/hi'
import {
  FiTerminal, FiCamera, FiClock, FiGlobe, FiType
} from 'react-icons/fi'
import { VscRocket } from 'react-icons/vsc'
import { SiApple } from 'react-icons/si'
import { AiOutlineLoading3Quarters, AiOutlineCheck, AiOutlineClose } from 'react-icons/ai'
import type { WorkflowNodeData } from '../../types'

// ─── Color config per action type ─────────────────────────
const NODE_COLORS: Record<string, { bg: string; border: string; accent: string }> = {
  click:       { bg: '#1a1400', border: '#f59e0b', accent: '#f59e0b' },
  type_text:   { bg: '#0a1420', border: '#3b82f6', accent: '#3b82f6' },
  open_app:    { bg: '#140a20', border: '#8b5cf6', accent: '#8b5cf6' },
  open_url:    { bg: '#0a1a1e', border: '#06b6d4', accent: '#06b6d4' },
  run_command: { bg: '#0a1a14', border: '#10b981', accent: '#10b981' },
  applescript: { bg: '#1a0a18', border: '#ec4899', accent: '#ec4899' },
  screenshot:  { bg: '#1a0e0a', border: '#f97316', accent: '#f97316' },
  delay:       { bg: '#14141a', border: '#6b7280', accent: '#6b7280' },
  none:        { bg: '#141414', border: '#444',    accent: '#888'    },
}

const NODE_ICONS: Record<string, React.ReactNode> = {
  click:       <HiCursorClick size={16} />,
  type_text:   <FiType size={16} />,
  open_app:    <VscRocket size={16} />,
  open_url:    <FiGlobe size={16} />,
  run_command: <FiTerminal size={16} />,
  applescript: <SiApple size={16} />,
  screenshot:  <FiCamera size={16} />,
  delay:       <FiClock size={16} />,
  none:        <FiClock size={16} />,
}

function getPayloadSummary(data: WorkflowNodeData): string {
  const p = data.payload || {}
  switch (data.actionType) {
    case 'click':       return p.x != null ? `(${p.x}, ${p.y})` : 'Set coordinates'
    case 'type_text':   return p.text ? `"${p.text.slice(0, 30)}${p.text.length > 30 ? '…' : ''}"` : 'Set text'
    case 'open_app':    return p.name || p.app_name || 'Set app name'
    case 'open_url':    return p.url ? p.url.replace('https://', '').slice(0, 35) : 'Set URL'
    case 'run_command': return p.cmd ? `$ ${p.cmd.slice(0, 30)}` : 'Set command'
    case 'applescript': return p.script ? p.script.slice(0, 30) + '…' : 'Set script'
    case 'screenshot':  return 'Capture screen'
    case 'delay':       return `${p.delayMs || 1000}ms`
    default:            return ''
  }
}

function ActionNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as WorkflowNodeData
  const colors = NODE_COLORS[nodeData.actionType] || NODE_COLORS.none
  const icon = NODE_ICONS[nodeData.actionType] || NODE_ICONS.none
  const summary = getPayloadSummary(nodeData)
  const isRunning = nodeData.status === 'running'
  const isSuccess = nodeData.status === 'success'
  const isError = nodeData.status === 'error'

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: '2px solid rgba(255,255,255,0.1)',
          width: 10,
          height: 10,
        }}
      />

      <div
        className={isRunning ? 'node-status-running' : ''}
        style={{
          minWidth: 200,
          background: colors.bg,
          borderRadius: 16,
          border: `1.5px solid ${selected ? colors.accent : 'rgba(255,255,255,0.08)'}`,
          overflow: 'hidden',
          transition: 'border-color 0.2s ease, box-shadow 0.3s ease',
          boxShadow: selected
            ? `0 0 20px ${colors.accent}22, 0 8px 32px rgba(0,0,0,0.3)`
            : '0 4px 16px rgba(0,0,0,0.2)',
        }}
      >
        {/* Color header strip */}
        <div
          style={{
            height: 3,
            background: `linear-gradient(90deg, ${colors.accent}, ${colors.accent}88)`,
          }}
        />

        {/* Node body */}
        <div style={{ padding: '12px 16px' }}>
          {/* Header row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: `${colors.accent}18`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.accent,
                  flexShrink: 0,
                }}
              >
                {icon}
              </div>
              <span
                style={{
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                }}
              >
                {nodeData.label}
              </span>
            </div>

            {/* Status indicator */}
            <div style={{ flexShrink: 0 }}>
              {isRunning && (
                <AiOutlineLoading3Quarters
                  size={14}
                  color={colors.accent}
                  style={{ animation: 'nodeRunningSpinner 1s linear infinite' }}
                />
              )}
              {isSuccess && <AiOutlineCheck size={14} color="#4ade80" />}
              {isError && <AiOutlineClose size={14} color="#f87171" />}
            </div>
          </div>

          {/* Payload summary */}
          {summary && (
            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color: 'rgba(255,255,255,0.35)',
                fontFamily: 'monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {summary}
            </div>
          )}

          {/* Execution output */}
          {(isSuccess || isError) && nodeData.output && (
            <div
              style={{
                marginTop: 8,
                padding: '8px 10px',
                borderRadius: 8,
                background: isError
                  ? 'rgba(248,113,113,0.08)'
                  : 'rgba(74,222,128,0.06)',
                border: `1px solid ${isError ? 'rgba(248,113,113,0.15)' : 'rgba(74,222,128,0.12)'}`,
                maxHeight: 80,
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: isError ? '#f87171' : '#4ade80',
                  marginBottom: 4,
                }}
              >
                {isError ? '✗ Error' : '✓ Output'}
              </div>
              <pre
                style={{
                  fontSize: 10,
                  color: isError
                    ? 'rgba(248,113,113,0.8)'
                    : 'rgba(255,255,255,0.5)',
                  fontFamily: 'monospace',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: 1.4,
                }}
              >
                {nodeData.output.slice(0, 200)}{nodeData.output.length > 200 ? '…' : ''}
              </pre>
            </div>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: '2px solid rgba(255,255,255,0.1)',
          width: 10,
          height: 10,
        }}
      />
    </>
  )
}

export default memo(ActionNodeComponent)
