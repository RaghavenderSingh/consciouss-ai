import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

export default function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  })

  const status = (data as Record<string, unknown>)?.status as string | undefined

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        className={`animated-edge-path ${status || ''}`}
      />
      {status === 'running' && (
        <circle r="3" fill="#FF54B0" filter="url(#glow)">
          <animateMotion dur="0.8s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </>
  )
}
