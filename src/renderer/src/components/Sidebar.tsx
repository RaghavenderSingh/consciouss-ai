import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, PanelLeft, MessageSquare, Trash2, Zap, Activity, Send, User as UserIcon } from 'lucide-react'
import { ChatSession, User } from '../types'

interface Props {
  isCollapsed: boolean
  onToggle: () => void
  onNewChat: () => void
  sessions: ChatSession[]
  activeSessionId?: string
  onSelectSession: (id: string) => void
  onDeleteSession: (id: string, e?: React.MouseEvent) => void
  onClearAll: () => void
  activeTab: 'chats' | 'workflows' | 'logs' | 'telegram' | 'lab'
  onTabChange: (tab: 'chats' | 'workflows' | 'logs' | 'telegram' | 'lab') => void
  user?: User | null
  onLogout?: () => void
}

export default function Sidebar({
  isCollapsed,
  onToggle,
  onNewChat,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onClearAll,
  activeTab,
  onTabChange,
  user,
  onLogout
}: Props): React.ReactElement {

  return (
    <motion.div
      animate={{
        width: isCollapsed ? 68 : 280,
        minWidth: isCollapsed ? 68 : 280,
        padding: isCollapsed ? '24px 8px' : '24px 16px'
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 5,
        boxSizing: 'border-box',
        background: 'transparent'
      }}
    >
      {/* Main Sidebar Box */}
      <motion.div
        animate={{
          borderRadius: isCollapsed ? 40 : 28
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        style={{
          flex: 1,
          backgroundColor: 'rgba(18, 18, 18, 0.85)',
          backdropFilter: 'blur(40px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
          padding: '20px 0px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.06)'
        }}
      >
        {/* Top Header */}
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 400, damping: 40 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            padding: isCollapsed ? '0' : '0 20px',
            width: '100%',
            marginBottom: 32,
            position: 'relative',
            boxSizing: 'border-box'
          }}
        >
          <button
            onClick={onToggle}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: 0,
              opacity: 0.8
            }}
          >
            <PanelLeft size={20} strokeWidth={2} />
          </button>

          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  overflow: 'hidden'
                }}
              >
                <h2
                  style={{
                    color: 'white',
                    fontSize: 18,
                    fontWeight: 700,
                    margin: '0 12px 0 0',
                    letterSpacing: '-0.02em',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Consciouss
                </h2>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Navigation Section */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            boxSizing: 'border-box',
            flex: 1,
            overflow: 'hidden'
          }}
        >
          {/* Top Section: New Chat & Recent Chats */}
          <div style={{ padding: isCollapsed ? '0' : '0 10px', flexShrink: 0 }}>
            <NavItem
              label="New Chat"
              icon={<Plus size={18} strokeWidth={3} />}
              onClick={() => {
                onTabChange('chats')
                onNewChat()
              }}
              isCollapsed={isCollapsed}
              highlight
            />
          </div>

          <div style={{ height: 12, flexShrink: 0 }} />

          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                  color: 'rgba(255,255,255,0.3)',
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '0 14px',
                  flexShrink: 0
                }}
              >
                <span>Recent Chats</span>
                {sessions.length > 0 && (
                  <button
                    onClick={onClearAll}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(255,255,255,0.2)',
                      fontSize: 10,
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
                  >
                    Clear
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sessions List */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              overflowY: 'auto',
              flex: 1,
              padding: isCollapsed ? '0' : '0 10px',
              paddingRight: isCollapsed ? '0' : '4px',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            }}
          >
            {sessions.map((session) => (
              <NavItem
                key={session.id}
                label={session.title}
                icon={<MessageSquare size={16} />}
                onClick={() => {
                  onTabChange('chats')
                  onSelectSession(session.id)
                }}
                isCollapsed={isCollapsed}
                active={activeSessionId === session.id && activeTab === 'chats'}
                onDelete={(e) => onDeleteSession(session.id, e)}
              />
            ))}
          </div>

          <div style={{ height: 16, borderBottom: '1px solid rgba(255,255,255,0.06)', margin: '0 10px', flexShrink: 0 }} />

          {/* Settings Section */}
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: 8,
                  color: 'rgba(255,255,255,0.3)',
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '0 14px',
                  flexShrink: 0
                }}
              >
                <span>Settings</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ padding: isCollapsed ? '0' : '0 10px', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
            <NavItem
              label="Workflows"
              icon={<Zap size={18} strokeWidth={2.5} />}
              onClick={() => onTabChange('workflows')}
              isCollapsed={isCollapsed}
              active={activeTab === 'workflows'}
              brandActive
            />
            <NavItem
              label="Telegram Connect"
              icon={<Send size={18} strokeWidth={2.5} />}
              onClick={() => onTabChange('telegram')}
              isCollapsed={isCollapsed}
              active={activeTab === 'telegram'}
              brandActive
            />
            <NavItem
              label="Native Lab"
              icon={<Activity size={18} strokeWidth={2.5} />}
              onClick={() => onTabChange('lab')}
              isCollapsed={isCollapsed}
              active={activeTab === 'lab'}
              brandActive
            />
          </div>
        </div>
      </motion.div>

      {/* Profile Section (Bottom) */}
      <motion.button
        layout
        onClick={() => user ? onTabChange('logs') : undefined}
        whileHover={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        style={{
          margin: '24px auto 10px auto',
          padding: isCollapsed ? '10px 0' : '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          gap: isCollapsed ? 0 : 12,
          width: isCollapsed ? 44 : 'calc(100% - 20px)',
          background: 'rgba(18, 18, 18, 0.85)',
          backdropFilter: 'blur(40px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          borderRadius: 20,
          cursor: 'pointer',
          textAlign: 'left',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
          transition: 'background 0.2s ease, border 0.2s ease'
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: user?.avatarUrl ? 'transparent' : 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
            position: 'relative',
            zIndex: 1
          }}
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }}
            />
          ) : (
            <UserIcon size={18} color="white" strokeWidth={2.5} />
          )}
        </div>

        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                overflow: 'hidden',
                zIndex: 1,
                flex: 1
              }}
            >
              {user ? (
                <>
                  <span style={{ color: 'white', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: '-0.01em', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>
                    {user.name}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>
                    {user.email}
                  </span>
                </>
              ) : (
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: '-0.01em', lineHeight: 1 }}>
                  Sign In
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!isCollapsed && user && onLogout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={(e) => { e.stopPropagation(); onLogout() }}
            style={{ padding: '4px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 500, cursor: 'pointer', flexShrink: 0, zIndex: 1, whiteSpace: 'nowrap' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
          >
            Sign out
          </motion.div>
        )}
      </motion.button>
    </motion.div>
  )
}

function NavItem({
  label,
  icon,
  onClick,
  isCollapsed,
  active,
  brandActive,
  highlight,
  onDelete
}: {
  label: string
  icon: React.ReactNode
  onClick: () => void
  isCollapsed: boolean
  active?: boolean
  brandActive?: boolean
  highlight?: boolean
  onDelete?: (e: React.MouseEvent) => void
}): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ backgroundColor: active && brandActive ? 'linear-gradient(135deg, #FF54B0 0%, #FF4B33 100%)' : 'rgba(255,255,255,0.06)' }}
      whileTap={{ scale: 0.98 }}
      animate={{
        width: isCollapsed ? 44 : '100%',
        padding: isCollapsed ? '10px 0px' : '10px 14px',
        justifyContent: isCollapsed ? 'center' : 'flex-start'
      }}
      transition={{ layout: { type: 'spring', stiffness: 400, damping: 40 } }}
      style={{
        background: active 
          ? brandActive 
            ? 'linear-gradient(135deg, #FF54B0 0%, #FF4B33 100%)'
            : 'rgba(255,255,255,0.08)' 
          : highlight 
            ? 'rgba(255,255,255,0.03)' 
            : 'transparent',
        border: '1px solid transparent',
        boxShadow: active && brandActive ? '0 4px 14px rgba(255, 75, 51, 0.3)' : 'none',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        color: active ? 'white' : 'rgba(255,255,255,0.7)',
        cursor: 'pointer',
        boxSizing: 'border-box',
        margin: '0 auto',
        transition: 'background 0.2s ease, border 0.2s ease, box-shadow 0.2s ease, color 0.2s ease',
        textAlign: 'left',
        position: 'relative'
      }}
    >
      {active && !brandActive && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 12,
            padding: 1,
            background: 'linear-gradient(135deg, #FF54B0 0%, #FF4B33 100%)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            pointerEvents: 'none'
          }}
        />
      )}

      <motion.div
        layout
        transition={{ layout: { type: 'spring', stiffness: 400, damping: 40 } }}
        style={{
          width: 24,
          minWidth: 24,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: active || highlight ? 1 : 0.6,
          flexShrink: 0,
          position: 'relative',
          zIndex: 1
        }}
      >
        {icon}
      </motion.div>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.span
            layout
            initial={{ opacity: 0, width: 0, marginLeft: 0 }}
            animate={{ opacity: 1, width: 'auto', marginLeft: 12 }}
            exit={{ opacity: 0, width: 0, marginLeft: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            style={{
              fontSize: 14,
              fontWeight: active || highlight ? 600 : 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
              position: 'relative',
              zIndex: 1
            }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isCollapsed && onDelete && (isHovered || active) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, width: 0, marginLeft: 0 }}
            animate={{ opacity: 1, scale: 1, width: 26, marginLeft: 8 }}
            exit={{ opacity: 0, scale: 0.8, width: 0, marginLeft: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            onClick={(e) => {
              e.stopPropagation()
              onDelete(e)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 26,
              borderRadius: 8,
              color: 'rgba(255,255,255,0.2)',
              flexShrink: 0,
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#f87171'
              e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.2)'
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <Trash2 size={14} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
