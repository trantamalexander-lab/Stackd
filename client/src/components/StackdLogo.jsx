import { C } from '../theme'

// Stackd mark — a gold pyramid of stacked chevrons. Flat, crisp, scalable.
export default function StackdLogo({ size = 26, color = C.accent, style }) {
  const cx = 60, t = 17, tv = 12
  const layers = [
    { yPeak: 24, yTip: 42, W: 28 },
    { yPeak: 39, yTip: 57, W: 38 },
    { yPeak: 54, yTip: 72, W: 48 },
    { yPeak: 69, yTip: 87, W: 57 },
  ]
  const chevron = ({ yPeak, yTip, W }) => [
    [cx - W, yTip], [cx, yPeak], [cx + W, yTip],
    [cx + W - t, yTip], [cx, yPeak + tv], [cx - W + t, yTip],
  ].map(p => p.join(',')).join(' ')
  return (
    <svg width={size} height={size} viewBox="0 0 120 96" fill="none" style={style} role="img" aria-label="Stackd">
      <polygon points="60,7 75,27 45,27" fill={color} />
      {layers.map((l, i) => <polygon key={i} points={chevron(l)} fill={color} />)}
    </svg>
  )
}
