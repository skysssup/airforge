import { useCallback, useRef, useSyncExternalStore } from 'react'
import { appStore, type AppState } from '../store/appStore'
import { MouseStrokeAdapter } from '../input/mouse'
import { screenToWorld } from '../coords/transforms'

const whole = (state: AppState) => state

/** Subscribe to the store; pass a selector that returns a state field to re-render only when it changes. */
export function useAppState(): AppState
export function useAppState<T>(select: (state: AppState) => T): T
export function useAppState<T>(select: (state: AppState) => T | AppState = whole): T | AppState {
  const getSnapshot = () => select(appStore.getState())
  return useSyncExternalStore(appStore.subscribe, getSnapshot, getSnapshot)
}

/** Ref callback that turns pointer drags on the element into strokes while enabled. */
export function useMouseDrawing(enabled: boolean) {
  const adapterRef = useRef<MouseStrokeAdapter | null>(null)

  return useCallback(
    (el: HTMLElement | null) => {
      adapterRef.current?.detach()
      adapterRef.current = null
      if (!el || !enabled) return
      const adapter = new MouseStrokeAdapter({
        start: (point) => appStore.beginStroke(point),
        move: (points) => appStore.setLiveStroke(points),
        end: (points) => appStore.endStroke(points),
        cancel: () => appStore.cancelStroke(),
        // Pressing on the selected shape drags it instead of drawing.
        grab: (point) => {
          const { selectedId, view } = appStore.getState()
          if (!selectedId || appStore.objectAt(point)?.id !== selectedId || !appStore.beginMove()) return null
          const from = screenToWorld(point, view)
          return {
            move: (to, event) => {
              const world = screenToWorld(to, appStore.getState().view)
              appStore.moveBy(world.x - from.x, world.y - from.y, event.shiftKey)
            },
            end: () => appStore.endMove(),
            cancel: () => appStore.cancelMove(),
          }
        },
      })
      adapter.attach(el)
      adapterRef.current = adapter
    },
    [enabled],
  )
}

const noMatch = () => false
const noSubscribe = () => () => {}

/** Whether a media query matches, kept in sync; false where matchMedia is missing (tests, old engines). */
export function useMediaQuery(query: string): boolean {
  const supported = typeof matchMedia === 'function'
  const subscribe = useCallback(
    (listener: () => void) => {
      const list = matchMedia(query)
      list.addEventListener('change', listener)
      return () => list.removeEventListener('change', listener)
    },
    [query],
  )
  const get = useCallback(() => matchMedia(query).matches, [query])
  return useSyncExternalStore(supported ? subscribe : noSubscribe, supported ? get : noMatch, noMatch)
}

/** The phone layout (SPEC-v3 §9): one-row top bar, More sheet, bottom-sheet panels, 44px targets. */
export const COMPACT_QUERY = '(max-width: 640px)'
export const useCompact = () => useMediaQuery(COMPACT_QUERY)
/** Below 360px Redo moves into More so Drop keeps its width. */
export const useNarrow = () => useMediaQuery('(max-width: 359px)')
/** A touch screen without a fine pointer: Help and the Welcome lead with touch wording. */
export const useCoarsePointer = () => useMediaQuery('(pointer: coarse)')
