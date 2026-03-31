import React, { useState } from 'react'
import { HiCursorClick } from 'react-icons/hi'
import {
  FiTerminal, FiCamera, FiClock, FiGlobe, FiType, FiZap, FiChevronDown, FiChevronRight, FiSearch
} from 'react-icons/fi'
import { VscRocket } from 'react-icons/vsc'
import { SiApple } from 'react-icons/si'

interface PaletteItem {
  actionType: string
  label: string
  icon: React.ReactNode
  color: string
  nodeType: string
}

const PALETTE_SECTIONS: { title: string; items: PaletteItem[] }[] = [
  {
    title: 'Triggers',
    items: [
      { actionType: 'trigger', label: 'Manual Start', icon: <FiZap size={15} />, color: '#FF54B0', nodeType: 'trigger' },
    ],
  },
  {
    title: 'Actions',
    items: [
      { actionType: 'click', label: 'Click', icon: <HiCursorClick size={15} />, color: '#f59e0b', nodeType: 'action' },
      { actionType: 'type_text', label: 'Type Text', icon: <FiType size={15} />, color: '#3b82f6', nodeType: 'action' },
      { actionType: 'open_app', label: 'Open App', icon: <VscRocket size={15} />, color: '#8b5cf6', nodeType: 'action' },
      { actionType: 'open_url', label: 'Open URL', icon: <FiGlobe size={15} />, color: '#06b6d4', nodeType: 'action' },
      { actionType: 'run_command', label: 'Run Command', icon: <FiTerminal size={15} />, color: '#10b981', nodeType: 'action' },
      { actionType: 'applescript', label: 'AppleScript', icon: <SiApple size={15} />, color: '#ec4899', nodeType: 'action' },
      { actionType: 'screenshot', label: 'Screenshot', icon: <FiCamera size={15} />, color: '#f97316', nodeType: 'action' },
    ],
  },
  {
    title: 'Flow Control',
    items: [
      { actionType: 'delay', label: 'Delay / Wait', icon: <FiClock size={15} />, color: '#6b7280', nodeType: 'action' },
    ],
  },
]

interface Props {
  collapsed?: boolean
}

export default function NodePalette({ collapsed }: Props) {
  const [search, setSearch] = useState('')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    Triggers: true,
    Actions: true,
    'Flow Control': true,
  })

  if (collapsed) return null

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  const onDragStart = (e: React.DragEvent, item: PaletteItem) => {
    e.dataTransfer.setData('application/reactflow-type', item.nodeType)
    e.dataTransfer.setData('application/reactflow-action', item.actionType)
    e.dataTransfer.setData('application/reactflow-label', item.label)
    e.dataTransfer.effectAllowed = 'move'
  }

  const filteredSections = PALETTE_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) =>
      item.label.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((s) => s.items.length > 0)

  return (
    <div
      style={{
        width: 220,
        height: '100%',
        background: 'rgba(12, 12, 12, 0.95)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 10,
          }}
        >
          Nodes
        </div>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <FiSearch
            size={13}
            color="rgba(255,255,255,0.25)"
            style={{ position: 'absolute', left: 10, top: 9 }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes…"
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8,
              padding: '7px 10px 7px 30px',
              color: 'white',
              fontSize: 12,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Sections */}
      <div
        className="workflow-palette-scroll"
        style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}
      >
        {filteredSections.map((section) => (
          <div key={section.title} style={{ marginBottom: 4 }}>
            {/* Section header */}
            <button
              onClick={() => toggleSection(section.title)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 16px',
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.4)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {expandedSections[section.title] ? (
                <FiChevronDown size={12} />
              ) : (
                <FiChevronRight size={12} />
              )}
              {section.title}
            </button>

            {/* Items */}
            {expandedSections[section.title] && (
              <div style={{ padding: '2px 12px' }}>
                {section.items.map((item) => (
                  <div
                    key={item.actionType}
                    className="node-palette-item"
                    draggable
                    onDragStart={(e) => onDragStart(e, item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 10,
                      marginBottom: 2,
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid transparent',
                    }}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)'
                      ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)'
                      ;(e.currentTarget as HTMLDivElement).style.borderColor = 'transparent'
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: `${item.color}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: item.color,
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </div>
                    <span
                      style={{
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
