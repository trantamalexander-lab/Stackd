import { useMemo } from 'react'

// Ambient hero/world backdrop: faint grid + central lime glow + rising particles.
export default function Background() {
  const particles = useMemo(
    () =>
      Array.from({ length: 25 }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${60 + Math.random() * 50}%`,
        duration: `${8 + Math.random() * 12}s`,
        delay: `${Math.random() * 10}s`,
      })),
    []
  )

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {/* faint grid */}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* central radial glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 800,
          height: 800,
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(240,180,41,0.03) 0%, transparent 70%)',
        }}
      />

      {/* rising particles */}
      {particles.map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: p.left,
            top: p.top,
            width: 2,
            height: 2,
            borderRadius: '50%',
            background: 'rgba(240,180,41,0.4)',
            animation: `particle-rise ${p.duration} linear ${p.delay} infinite`,
          }}
        />
      ))}
    </div>
  )
}
