import { useCallback, useMemo, useRef } from 'react'

export function useLandingPointer() {
  const pointerRef = useRef({
    ndcX: 0,
    ndcY: 0,
    active: false,
  })

  const handlePointerMove = useCallback((event) => {
    pointerRef.current.ndcX = (event.clientX / window.innerWidth) * 2 - 1
    pointerRef.current.ndcY = -((event.clientY / window.innerHeight) * 2 - 1)
    pointerRef.current.active = true
  }, [])

  const handlePointerLeave = useCallback(() => {
    pointerRef.current.ndcX = 0
    pointerRef.current.ndcY = 0
    pointerRef.current.active = false
  }, [])

  const pointerHandlers = useMemo(
    () => ({
      onPointerMove: handlePointerMove,
      onPointerLeave: handlePointerLeave,
    }),
    [handlePointerLeave, handlePointerMove],
  )

  return { pointerRef, pointerHandlers }
}
