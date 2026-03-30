import React, { useState, useEffect, useId, useRef } from 'react'
import { motion } from 'framer-motion'

export interface ContainerTextFlipProps {
  words?: string[]
  interval?: number
  style?: React.CSSProperties
  textStyle?: React.CSSProperties
  animationDuration?: number
}

export function ContainerTextFlip({
  words = ['better', 'modern', 'beautiful', 'awesome'],
  interval = 3000,
  style,
  textStyle,
  animationDuration = 700
}: ContainerTextFlipProps): React.ReactElement {
  const id = useId()
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [width, setWidth] = useState(100)
  const textRef = useRef<HTMLDivElement>(null)

  const updateWidthForWord = (): void => {
    if (textRef.current) {
      // Add padding (30px on each side = 60px, but user said 30 in total)
      const textWidth = textRef.current.scrollWidth + 30
      setWidth(textWidth)
    }
  }

  useEffect(() => {
    // Need a tiny delay for React to flush the DOM with the new word so we can measure scrollWidth
    setTimeout(updateWidthForWord, 10)
  }, [currentWordIndex])

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentWordIndex((prevIndex) => (prevIndex + 1) % words.length)
    }, interval)
    return () => clearInterval(intervalId)
  }, [words, interval])

  return (
    <motion.span
      layout
      layoutId={`words-here-${id}`}
      animate={{ width }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        display: 'inline-flex',
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        padding: '0 16px',
        background: 'linear-gradient(to bottom, #191B21, #0E0F13)',
        boxShadow:
          'inset 0 -1px rgba(16, 23, 30, 0.8), inset 0 0 0 1px rgba(255, 255, 255, 0.05), 0 4px 8px rgba(0, 0, 0, 0.5)',
        verticalAlign: 'middle',
        overflow: 'hidden',
        color: '#fff',
        ...style
      }}
      key={words[currentWordIndex]}
    >
      <motion.div
        transition={{
          duration: animationDuration / 1000,
          ease: 'easeInOut'
        }}
        style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          ...textStyle
        }}
        ref={textRef}
        layoutId={`word-div-${words[currentWordIndex]}-${id}`}
      >
        <motion.div style={{ display: 'inline-block' }}>
          {words[currentWordIndex].split('').map((letter, index) => (
            <motion.span
              key={index}
              initial={{
                opacity: 0,
                filter: 'blur(10px)'
              }}
              animate={{
                opacity: 1,
                filter: 'blur(0px)'
              }}
              transition={{
                delay: index * 0.02
              }}
            >
              {letter === ' ' ? '\u00A0' : letter}
            </motion.span>
          ))}
        </motion.div>
      </motion.div>
    </motion.span>
  )
}
