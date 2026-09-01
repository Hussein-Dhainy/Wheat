import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getRuntimeQualityTier,
  readQualityOverride,
  resolveInitialQualityTier,
  selectLowerQualityTier,
} from '../experience/qualityTier.js'

function readCapabilitySnapshot() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {}
  }

  return {
    deviceMemory: navigator.deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
    pixelRatio: window.devicePixelRatio,
    saveData: navigator.connection?.saveData === true,
    viewportHeight: window.innerHeight,
    viewportWidth: window.innerWidth,
  }
}

export function useQualityTier() {
  const overrideRef = useRef(
    typeof window === 'undefined'
      ? null
      : readQualityOverride(window.location.search),
  )
  const [qualityTier, setQualityTier] = useState(() => (
    overrideRef.current ?? resolveInitialQualityTier(readCapabilitySnapshot())
  ))

  useEffect(() => {
    if (overrideRef.current || typeof window === 'undefined') return undefined

    let resizeFrame = 0
    const handleResize = () => {
      cancelAnimationFrame(resizeFrame)
      resizeFrame = requestAnimationFrame(() => {
        const candidate = resolveInitialQualityTier(readCapabilitySnapshot())
        setQualityTier((current) => selectLowerQualityTier(current, candidate))
      })
    }

    window.addEventListener('resize', handleResize, { passive: true })
    return () => {
      cancelAnimationFrame(resizeFrame)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const reportPerformanceSample = useCallback((sample) => {
    if (overrideRef.current) return
    setQualityTier((current) => getRuntimeQualityTier(current, sample))
  }, [])

  return { qualityTier, reportPerformanceSample }
}
