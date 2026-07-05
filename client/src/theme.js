// ── Stackd design system — dark / gold "holographic" ──
// Single source of truth for colors + fonts used across the frontend.

export const C = {
  bg: '#141414',         // dark charcoal — not pure black
  bgRaised: '#1C1C1C',   // cloudy mid-dark
  bgElevated: '#252525', // elevated panels

  panel: 'rgba(255,255,255,0.05)',
  panelBorder: 'rgba(255,255,255,0.07)',
  panelBorderStrong: 'rgba(255,255,255,0.11)',
  panelBorderHover: 'rgba(240,180,41,0.4)',

  accent: '#F0B429',
  accentHover: '#F5C842',
  accentDim: 'rgba(240,180,41,0.6)',
  accentBg: 'rgba(240,180,41,0.08)',
  accentBorder: 'rgba(240,180,41,0.25)',
  glow: 'rgba(240,180,41,0.15)',
  glowSubtle: 'rgba(240,180,41,0.06)',

  text: '#F0EFE8',      // warm off-white — softer than pure white
  text2: '#8A8A8A',     // medium grey
  text3: '#5A5A5A',     // subtle grey

  danger: '#FF6B6B',
  warn: '#F0B429',

  radius: 16,
}

// Font stacks
export const F = {
  display: "'Space Grotesk', system-ui, sans-serif", // headlines / body
  mono: "'Space Mono', ui-monospace, monospace",      // numbers / prices / data
}
