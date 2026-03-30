import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { LogIn, Loader2 } from 'lucide-react'
import { User, LoginLog } from '../types'

interface Props {
  onLogin: (user: User, log: LoginLog) => void
  onSkip: () => void
}

export default function LoginView({ onLogin, onSkip }: Props): React.ReactElement {
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleLogin = async (): Promise<void> => {
    setIsLoading(true)
    try {
      const googleUser = await window.electronAPI.googleAuth()

      const user: User = {
        id: googleUser.id,
        name: googleUser.name,
        email: googleUser.email,
        avatarUrl: googleUser.avatarUrl,
        subscription: googleUser.subscription
      }

      const log: LoginLog = {
        id: `log_${Date.now()}`,
        timestamp: new Date(),
        method: 'google',
        status: 'success',
        device: navigator.userAgent.includes('Mac') ? 'macOS' : 'Desktop'
      }

      onLogin(user, log)
    } catch (err) {
      console.error('[Login] Google OAuth failed:', err)
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 50
      }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.2 }}
        style={{
          width: 380,
          backgroundColor: 'rgba(18, 18, 18, 0.75)',
          backdropFilter: 'blur(40px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
          borderRadius: 32,
          padding: '48px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        <div 
          style={{ 
            width: 64, 
            height: 64, 
            borderRadius: 20, 
            background: 'linear-gradient(135deg, #FF54B0 0%, #FF4B33 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
            boxShadow: '0 8px 24px rgba(255, 75, 51, 0.4)'
          }}
        >
          <LogIn size={28} color="white" />
        </div>

        <h1 style={{ color: 'white', fontSize: 28, fontWeight: 700, margin: '0 0 8px 0', letterSpacing: '-0.03em' }}>
          Welcome back
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '0 0 40px 0', textAlign: 'center' }}>
          Sign in to access your AI workflows, login logs, and premium features.
        </p>

        <motion.button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          whileHover={{ scale: isLoading ? 1 : 1.02 }}
          whileTap={{ scale: isLoading ? 1 : 0.98 }}
          style={{
            width: '100%',
            padding: '14px 20px',
            backgroundColor: 'white',
            border: 'none',
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            cursor: isLoading ? 'default' : 'pointer',
            boxShadow: '0 4px 12px rgba(255,255,255,0.1)',
            opacity: isLoading ? 0.8 : 1,
            transition: 'opacity 0.2s',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={20} color="#111" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          <span style={{ color: '#111', fontSize: 15, fontWeight: 600 }}>
            {isLoading ? 'Authenticating...' : 'Continue with Google'}
          </span>
        </motion.button>

        <motion.button
          onClick={onSkip}
          disabled={isLoading}
          whileHover={{ opacity: 0.7 }}
          whileTap={{ scale: 0.97 }}
          style={{
            marginTop: 16,
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.35)',
            fontSize: 13,
            cursor: 'pointer',
            padding: '6px 12px',
            borderRadius: 8
          }}
        >
          Skip for now
        </motion.button>
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.animate-spin{animation:spin 1s linear infinite}' }} />
    </motion.div>
  )
}
