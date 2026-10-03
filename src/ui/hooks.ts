import { useCallback, useRef, useSyncExternalStore } from 'react'
import { appStore, type AppState } from '../store/appStore'
import { MouseStrokeAdapter } from '../input/mouse'

export function useAppState(): AppState {
  return useSyncExternalStore(
    appStore.subscribe,
    appStore.getState,
    appStore.getState,
  )
}

/** Attach mouse stroke adapter to a DOM element; feeds appStore. */
export function useMouseDrawing(enabled: boolean) {
  const adapterRef = useRef<MouseStrokeAdapter | null>(null)

  const refCallback = useCallback(
    (el: HTMLElement | null) => {
      if (adapterRef.current) {
        adapterRef.current.detach()
        adapterRef.current = null
      }
      if (!el || !enabled) return

      const adapter = new MouseStrokeAdapter()
      adapter.onEvent((ev) => {
        if (ev.type === 'STROKE_STARTED') {
          appStore.beginStroke(ev.source, ev.point)
        } else if (ev.type === 'POINT_ADDED') {
          appStore.setLiveStroke(
            (adapter.getCurrentPoints().length
              ? adapter.getCurrentPoints()
              : [...appStore.getState().liveStroke, ev.point]),
            'mouse',
          )
        } else if (ev.type === 'STROKE_ENDED') {
          appStore.endStroke(ev.source, ev.points)
        } else if (ev.type === 'STROKE_CANCELLED') {
          appStore.cancelStroke(ev.source, ev.reason)
        }
      })
      adapter.attach(el)
      adapterRef.current = adapter
    },
    [enabled],
  )

  return refCallback
}
