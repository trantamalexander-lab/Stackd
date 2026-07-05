import { useEffect, useRef, useState } from 'react'

export default function CountUp({ to, duration = 1200, prefix = '', suffix = '', style = {} }) {
  const [value, setValue] = useState(0)
  const [flashing, setFlashing] = useState(true)
  const raf = useRef(null)

  useEffect(() => {
    const start = performance.now()
    const end = Number(to) || 0

    // Flash random numbers briefly (cash register effect)
    const flashInterval = setInterval(() => {
      setValue(Math.floor(Math.random() * end))
    }, 60)

    setTimeout(() => {
      clearInterval(flashInterval)
      setFlashing(false)

      const animate = (now) => {
        const elapsed = now - start - 300
        const progress = Math.min(elapsed / duration, 1)
        // Ease out expo
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
        setValue(Math.round(eased * end))
        if (progress < 1) raf.current = requestAnimationFrame(animate)
      }
      raf.current = requestAnimationFrame(animate)
    }, 300)

    return () => {
      clearInterval(flashInterval)
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [to, duration])

  return (
    <span style={{
      ...style,
      animation: flashing ? 'count-up-flash 0.06s ease infinite alternate' : undefined,
      transition: 'color 0.3s',
    }}>
      {prefix}{value.toLocaleString()}{suffix}
    </span>
  )
}
