"use client"

import { useEffect, useRef, useState } from "react"

export function AnimatedCounter({ value, duration = 1200, prefix = "", suffix = "", className = "" }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const target = typeof value === "number" ? value : parseFloat(value) || 0
    if (target === 0) {
      setDisplay(0)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true
          animateValue(0, target, duration)
        }
      },
      { threshold: 0.3 }
    )

    if (ref.current) observer.observe(ref.current)

    return () => observer.disconnect()
  }, [value, duration])

  function animateValue(start, end, dur) {
    const startTime = performance.now()
    const isFloat = !Number.isInteger(end)

    function tick(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / dur, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = start + (end - start) * eased

      setDisplay(isFloat ? Math.round(current * 10) / 10 : Math.round(current))

      if (progress < 1) {
        requestAnimationFrame(tick)
      }
    }

    requestAnimationFrame(tick)
  }

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}{display}{suffix}
    </span>
  )
}
