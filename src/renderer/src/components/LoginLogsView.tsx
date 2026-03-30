import React from 'react'
import { motion } from 'framer-motion'
import { Server, Activity, ArrowUpRight, CheckCircle2, XCircle } from 'lucide-react'
import { LoginLog } from '../types'

interface Props {
  logs: LoginLog[]
}

export default function LoginLogsView({ logs }: Props): React.ReactElement {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '32px 40px',
        boxSizing: 'border-box',
        overflowY: 'auto'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <div style={{ padding: 10, background: 'rgba(255,84,176,0.1)', borderRadius: 12 }}>
          <Activity size={24} color="#FF54B0" />
        </div>
        <div>
          <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, margin: 0 }}>Authentication Logs</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '4px 0 0 0' }}>Monitor session activity and security events.</p>
        </div>
      </div>

      <div style={{
        background: 'rgba(18, 18, 18, 0.4)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 16,
        overflow: 'hidden'
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(180px, 1fr) 120px 140px 100px',
          gap: 16,
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(255,255,255,0.02)',
          fontSize: 12,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.3)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          <div>Timestamp</div>
          <div>Method</div>
          <div>IP / Device</div>
          <div>Status</div>
        </div>

        {/* Table Body */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {logs.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
              No login logs recorded yet.
            </div>
          ) : (
            logs.map((log) => (
              <div 
                key={log.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(180px, 1fr) 120px 140px 100px',
                  gap: 16,
                  padding: '16px 24px',
                  borderBottom: '1px solid rgba(255,255,255,0.02)',
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.8)',
                  alignItems: 'center'
                }}
              >
                <div style={{ color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Server size={14} />
                  {new Date(log.timestamp).toLocaleString(undefined, { 
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' 
                  })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ 
                    width: 20, height: 20, borderRadius: 6, background: 'rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <ArrowUpRight size={12} color="rgba(255,255,255,0.6)" />
                  </div>
                  <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{log.method}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{log.ipAddress || 'Unknown IP'}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{log.device}</span>
                </div>
                <div>
                  {log.status === 'success' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34A853', background: 'rgba(52,168,83,0.1)', padding: '4px 8px', borderRadius: 8, width: 'fit-content' }}>
                      <CheckCircle2 size={14} />
                      <span style={{ fontWeight: 600, fontSize: 11 }}>Success</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#EA4335', background: 'rgba(234,67,53,0.1)', padding: '4px 8px', borderRadius: 8, width: 'fit-content' }}>
                      <XCircle size={14} />
                      <span style={{ fontWeight: 600, fontSize: 11 }}>Failed</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  )
}
