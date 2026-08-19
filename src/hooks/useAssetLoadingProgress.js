import { useEffect, useState } from 'react'
import { DefaultLoadingManager } from 'three'

function readManagerState() {
  const { itemsLoaded, itemsTotal } = DefaultLoadingManager
  return {
    progress: itemsTotal > 0 ? itemsLoaded / itemsTotal : 0,
    done: itemsTotal > 0 && itemsLoaded >= itemsTotal,
  }
}

// Every GLTFLoader/TextureLoader call in this codebase (module-level
// `useLoader.preload` calls plus each scene's own `useLoader`) reports to
// three's shared DefaultLoadingManager unless a loader is explicitly given
// its own manager, which none here are. Subscribing to it is therefore
// enough to track real progress across every model and texture in the
// experience without threading a manager through each loader call.
export function useAssetLoadingProgress() {
  const [state, setState] = useState(readManagerState)

  useEffect(() => {
    const manager = DefaultLoadingManager
    const previousOnStart = manager.onStart
    const previousOnProgress = manager.onProgress
    const previousOnLoad = manager.onLoad
    const previousOnError = manager.onError

    const handleProgress = (url, itemsLoaded, itemsTotal) => {
      setState({
        progress: itemsTotal > 0 ? itemsLoaded / itemsTotal : 0,
        done: itemsTotal > 0 && itemsLoaded >= itemsTotal,
      })
    }

    manager.onStart = (url, itemsLoaded, itemsTotal) => {
      handleProgress(url, itemsLoaded, itemsTotal)
      previousOnStart?.(url, itemsLoaded, itemsTotal)
    }
    manager.onProgress = (url, itemsLoaded, itemsTotal) => {
      handleProgress(url, itemsLoaded, itemsTotal)
      previousOnProgress?.(url, itemsLoaded, itemsTotal)
    }
    manager.onLoad = () => {
      setState({ progress: 1, done: true })
      previousOnLoad?.()
    }
    manager.onError = (url) => {
      console.error(`Failed to load asset: ${url}`)
      previousOnError?.(url)
    }

    // Loading may already be in progress (or finished, on a warm cache) by
    // the time this effect subscribes, since preload calls fire at module
    // evaluation time, before React's first render.
    setState(readManagerState())

    return () => {
      manager.onStart = previousOnStart
      manager.onProgress = previousOnProgress
      manager.onLoad = previousOnLoad
      manager.onError = previousOnError
    }
  }, [])

  return state
}
