export default function LogoIcon({ size = 56, className }: { size?: number; className?: string }) {
  return (
    <div style={{ width: size, height: size }} className={className}>
      <svg width="100%" height="100%" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#FF54B0', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#FF4B33', stopOpacity: 1 }} />
          </linearGradient>

          <radialGradient id="gloss" cx="50%" cy="40%" r="60%" fx="50%" fy="30%">
            <stop offset="0%" style={{ stopColor: 'white', stopOpacity: 0.2 }} />
            <stop offset="100%" style={{ stopColor: 'white', stopOpacity: 0 }} />
          </radialGradient>
        </defs>

        <rect
          x="10"
          y="10"
          width="180"
          height="180"
          rx="40"
          fill="url(#bgGradient)"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="2"
        />

        <rect x="10" y="10" width="180" height="180" rx="40" fill="url(#gloss)" />

        <path
          d="
    M 55,50 h 30 v 30 h -30 z 
    M 115,50 h 30 v 30 h -30 z 
    M 55,90 h 30 v 50 h -30 z 
    M 115,90 h 30 v 50 h -30 z 
    M 85,115 h 30 v 50 h -30 z"
          fill="white"
        />
      </svg>
    </div>
  )
}
