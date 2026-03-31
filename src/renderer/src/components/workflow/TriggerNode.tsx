import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { FiZap } from 'react-icons/fi'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import type { WorkflowNodeData } from '../../types'

function TriggerNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as WorkflowNodeData
  const isRunning = nodeData.status === 'running'

  return (
    <>
      <div
        className={isRunning ? 'node-status-running' : ''}
        style={{
          minWidth: 180,
          background: '#1a0a14',
          borderRadius: 16,
          border: `2px solid ${selected ? '#FF54B0' : 'rgba(255, 84, 176, 0.25)'}`,
          overflow: 'hidden',
          position: 'relative',
          transition: 'border-color 0.2s ease, box-shadow 0.3s ease',
          boxShadow: selected
            ? '0 0 24px rgba(255, 84, 176, 0.15), 0 8px 32px rgba(0,0,0,0.3)'
            : '0 4px 16px rgba(0,0,0,0.2)',
        }}
      >
        {/* Gradient top strip */}
        <div
          style={{
            height: 3,
            background: 'linear-gradient(90deg, #FF54B0, #FF4B33)',
          }}
        />

        <div style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: 'linear-gradient(135deg, rgba(255,84,176,0.2), rgba(255,75,51,0.2))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isRunning ? (
                <AiOutlineLoading3Quarters
                  size={16}
                  color="#FF54B0"
                  style={{ animation: 'nodeRunningSpinner 1s linear infinite' }}
                />
              ) : (
                <FiZap size={16} color="#FF54B0" />
              )}
            </div>
            <div>
              <div
                style={{
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                }}
              >
                Start
              </div>
              <div
                style={{
                  color: 'rgba(255,255,255,0.35)',
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                Workflow trigger
              </div>
            </div>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#FF54B0',
          border: '2px solid rgba(255, 84, 176, 0.3)',
          width: 10,
          height: 10,
        }}
      />
    </>
  )
}

export default memo(TriggerNodeComponent)
