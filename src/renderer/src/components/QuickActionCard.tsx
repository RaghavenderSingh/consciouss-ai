import { motion } from 'framer-motion'
import { ReactElement, ElementType } from 'react'

interface Props {
  icon: ElementType
  title: string
  description: string
  onClick: () => void
  delay?: number
}

export default function QuickActionCard({
  icon: Icon,
  title,
  description,
  onClick,
  delay = 0
}: Props): ReactElement {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="group relative flex flex-col items-start p-5 rounded-2xl text-left outline-none cursor-pointer"
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
        overflow: 'hidden'
      }}
    >
      {/* Background Hover Glow */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: 'linear-gradient(135deg, rgba(220,38,38,0.1) 0%, rgba(220,38,38,0) 100%)',
          zIndex: 0
        }}
      />

      {/* Top Gradient Border on Hover */}
      <div 
        className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(220,38,38,0.8), transparent)'
        }}
      />

      <div className="relative z-10 flex flex-col gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-white/60 group-hover:text-red-400 group-hover:border-red-500/30 transition-colors duration-300">
          <Icon size={20} strokeWidth={1.5} />
        </div>
        
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium text-white/90 tracking-wide">{title}</h3>
          <p className="text-xs text-white/40 leading-relaxed font-light">{description}</p>
        </div>
      </div>
    </motion.button>
  )
}
