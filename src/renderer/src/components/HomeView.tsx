import { type ReactElement } from 'react'
import { motion } from 'framer-motion'
import CommandBar from './CommandBar'
import { ContainerTextFlip } from './ContainerTextFlip'
import OrbShader from './OrbShader'
import logo from '../assets/logo.svg'





interface Props {
  onSubmit: (text: string) => void
  isListening: boolean
  toggleListening: () => void
  isWorking: boolean
  voiceTranscript?: string
  onNewChat?: () => void
}



export default function HomeView({
  onSubmit,
  isListening,
  toggleListening,
  isWorking,
  voiceTranscript,
  onNewChat
}: Props): ReactElement {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 48px 48px 48px',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(to bottom, #191B21, #0E0F13)',
        height: '100%',
        width: '100%',
        boxSizing: 'border-box',
        gap: 0
      }}
    >
      {/* Logo */}
      <motion.img
        src={logo}
        alt="Consciouss AI"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: 200, marginBottom: 32, opacity: 0.85 }}
      />

      {/* Shader Orb — hero centerpiece */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ marginBottom: 32 }}
      >
        <OrbShader isListening={isListening} isWorking={isWorking} size={260} />
      </motion.div>

      {/* Title + CommandBar */}
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          zIndex: 10
        }}
      >
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontSize: 52,
            fontWeight: 600,
            color: 'rgba(255, 255, 255, 0.4)',
            letterSpacing: '-0.04em',
            margin: '0 0 20px 0',
            lineHeight: 1.2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            textAlign: 'center'
          }}
        >
          <span>Your computer is now</span>
          <ContainerTextFlip
            words={['Consciouss', 'Intelligent', 'Limitless', 'Unstoppable']}
          />
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '100%' }}
        >
          <CommandBar
            onSubmit={onSubmit}
            onMicClick={toggleListening}
            isListening={isListening}
            isWorking={isWorking}
            voiceTranscript={voiceTranscript}
            onNewChat={onNewChat}
            placeholder="Type @ to ask questions about your browser tabs"
          />
        </motion.div>


      </div>
    </div>
  )
}
