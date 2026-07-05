import { C, F } from '../theme'

const ITEMS = [
  ['AIR JORDAN 1', '+$165'],
  ['ROLEX SUB', '+$890'],
  ['SUPREME BOX LOGO', '+$95'],
  ['MURAKAMI BEANIE', '+$85'],
  ['TRAVIS SCOTT DUNK', '+$310'],
  ['YEEZY 350 V2', '+$55'],
  ['PS5 DISC', '+$65'],
  ['BAPE STA LOW', '+$120'],
  ['POKEMON CHARIZARD', '+$200'],
  ['LOUIS VUITTON WALLET', '+$180'],
]

function Strip() {
  return (
    <>
      {ITEMS.map(([name, profit], i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: F.display, fontWeight: 500, color: C.text3 }}>{name}</span>
          <span style={{ fontFamily: F.mono, fontWeight: 700, color: C.accent }}>{profit}</span>
          <span style={{ color: 'rgba(255,255,255,0.15)', padding: '0 18px' }}>·</span>
        </span>
      ))}
    </>
  )
}

export default function ProfitTicker() {
  return (
    <div
      style={{
        height: 42,
        background: C.bgRaised,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        zIndex: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          fontSize: 12,
          letterSpacing: '0.04em',
          animation: 'ticker-scroll 22s linear infinite',
        }}
      >
        <Strip />
        <Strip />
      </div>
    </div>
  )
}
