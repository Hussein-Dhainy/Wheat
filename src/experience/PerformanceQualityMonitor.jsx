import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'

const SETTLE_DURATION_SECONDS = 1
const SAMPLE_DURATION_SECONDS = 3
const SLOW_FRAME_THRESHOLD_MS = 24
const MAX_VALID_FRAME_MS = 100

function createSampleState() {
  return {
    elapsedSeconds: 0,
    frameCount: 0,
    settleSeconds: SETTLE_DURATION_SECONDS,
    slowFrameCount: 0,
    totalFrameMs: 0,
  }
}

export function PerformanceQualityMonitor({
  enabled,
  onSample,
  qualityTier,
}) {
  const sampleRef = useRef(createSampleState())

  useEffect(() => {
    sampleRef.current = createSampleState()
  }, [enabled, qualityTier])

  useFrame((_, delta) => {
    if (!enabled || qualityTier === 'low' || document.hidden) return

    const sample = sampleRef.current
    if (sample.settleSeconds > 0) {
      sample.settleSeconds -= delta
      return
    }

    const frameMs = Math.min(delta * 1000, MAX_VALID_FRAME_MS)
    if (frameMs <= 0) return

    sample.elapsedSeconds += frameMs / 1000
    sample.frameCount += 1
    sample.totalFrameMs += frameMs
    if (frameMs >= SLOW_FRAME_THRESHOLD_MS) sample.slowFrameCount += 1

    if (sample.elapsedSeconds < SAMPLE_DURATION_SECONDS) return

    onSample?.({
      averageFrameMs: sample.totalFrameMs / sample.frameCount,
      frameCount: sample.frameCount,
      sampleDurationMs: sample.elapsedSeconds * 1000,
      slowFrameRatio: sample.slowFrameCount / sample.frameCount,
    })
    sampleRef.current = createSampleState()
  }, -90)

  return null
}
