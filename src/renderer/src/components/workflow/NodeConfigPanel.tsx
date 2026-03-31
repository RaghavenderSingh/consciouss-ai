import React from 'react'
import { FiX } from 'react-icons/fi'
import type { WorkflowNodeData, WorkflowActionType } from '../../types'

interface Props {
  nodeId: string
  data: WorkflowNodeData
  onUpdate: (nodeId: string, data: Partial<WorkflowNodeData>) => void
  onClose: () => void
}

export default function NodeConfigPanel({ nodeId, data, onUpdate, onClose }: Props) {
  const updatePayload = (key: string, value: unknown) => {
    onUpdate(nodeId, {
      payload: { ...data.payload, [key]: value },
    })
  }

  const updateLabel = (label: string) => {
    onUpdate(nodeId, { label })
  }

  return (
    <div
      style={{
        width: 300,
        height: '100%',
        background: 'rgba(12, 12, 12, 0.95)',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Configure Node</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
            {data.actionType}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: 'none',
            borderRadius: 8,
            padding: 6,
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.4)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <FiX size={16} />
        </button>
      </div>

      {/* Form */}
      <div
        className="workflow-palette-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Label */}
        <FieldGroup label="Node Label">
          <input
            type="text"
            value={data.label}
            onChange={(e) => updateLabel(e.target.value)}
            style={inputStyle}
          />
        </FieldGroup>

        {/* Type-specific fields */}
        {renderFields(data.actionType, data, updatePayload)}

        {/* Delay after */}
        {data.actionType !== 'trigger' && (
          <FieldGroup label="Delay After (ms)">
            <input
              type="number"
              value={data.payload?.delayMs ?? 1000}
              onChange={(e) => updatePayload('delayMs', parseInt(e.target.value) || 0)}
              style={inputStyle}
              min={0}
              step={100}
            />
          </FieldGroup>
        )}
      </div>
    </div>
  )
}

// ─── Per-type field renderers ─────────────────────────────

function renderFields(
  actionType: WorkflowActionType,
  data: WorkflowNodeData,
  update: (key: string, value: unknown) => void
) {
  const p = data.payload || {}

  switch (actionType) {
    case 'click':
      return (
        <>
          <FieldGroup label="X Coordinate">
            <input type="number" value={p.x ?? 0} onChange={(e) => update('x', parseInt(e.target.value) || 0)} style={inputStyle} />
          </FieldGroup>
          <FieldGroup label="Y Coordinate">
            <input type="number" value={p.y ?? 0} onChange={(e) => update('y', parseInt(e.target.value) || 0)} style={inputStyle} />
          </FieldGroup>
        </>
      )

    case 'type_text':
      return (
        <FieldGroup label="Text to Type">
          <textarea
            value={p.text ?? ''}
            onChange={(e) => update('text', e.target.value)}
            rows={4}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace' }}
          />
        </FieldGroup>
      )

    case 'open_app':
      return (
        <FieldGroup label="Application Name">
          <input type="text" value={p.name ?? ''} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Safari, Finder, Slack" style={inputStyle} />
        </FieldGroup>
      )

    case 'open_url':
      return (
        <>
          <FieldGroup label="URL">
            <input type="url" value={p.url ?? ''} onChange={(e) => update('url', e.target.value)} placeholder="https://example.com" style={inputStyle} />
          </FieldGroup>
          <FieldGroup label="Browser (optional)">
            <input type="text" value={p.browser ?? ''} onChange={(e) => update('browser', e.target.value)} placeholder="e.g. Google Chrome" style={inputStyle} />
          </FieldGroup>
        </>
      )

    case 'run_command':
      return (
        <FieldGroup label="Shell Command">
          <textarea
            value={p.cmd ?? ''}
            onChange={(e) => update('cmd', e.target.value)}
            rows={3}
            placeholder="ls -la ~/Desktop"
            style={{ ...inputStyle, fontFamily: 'monospace', resize: 'vertical' }}
          />
        </FieldGroup>
      )

    case 'applescript':
      return (
        <FieldGroup label="AppleScript">
          <textarea
            value={p.script ?? ''}
            onChange={(e) => update('script', e.target.value)}
            rows={6}
            placeholder='tell application "Finder" to ...'
            style={{ ...inputStyle, fontFamily: 'monospace', resize: 'vertical', fontSize: 12 }}
          />
        </FieldGroup>
      )

    case 'delay':
      return (
        <FieldGroup label="Delay Duration (ms)">
          <input
            type="number"
            value={p.delayMs ?? 1000}
            onChange={(e) => update('delayMs', parseInt(e.target.value) || 0)}
            style={inputStyle}
            min={0}
            step={100}
          />
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
            = {((p.delayMs ?? 1000) / 1000).toFixed(1)}s
          </div>
        </FieldGroup>
      )

    case 'screenshot':
      return (
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontStyle: 'italic' }}>
          No configuration needed — captures the current screen.
        </div>
      )

    case 'trigger':
      return (
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontStyle: 'italic' }}>
          This node starts the workflow. Connect it to the first action.
        </div>
      )

    default:
      return null
  }
}

// ─── Shared components ────────────────────────────────────

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.35)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  padding: '10px 14px',
  color: 'white',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease',
}
