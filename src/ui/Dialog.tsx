import { useLayoutEffect, useRef, type ReactNode } from 'react'

export function Dialog({ labelledBy, className = '', children }: {
  labelledBy: string
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const opener = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null)

  useLayoutEffect(() => {
    const dialog = ref.current!
    const controls = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    ))
    const focusFirst = () => (controls()[0] ?? dialog).focus()
    function onTab(event: KeyboardEvent) {
      if (event.key !== 'Tab') return
      event.preventDefault()
      const targets = controls()
      const index = targets.indexOf(document.activeElement as HTMLElement)
      const next = (index + (event.shiftKey ? -1 : 1) + targets.length) % targets.length
      const target = targets[next] ?? dialog
      target.focus()
    }
    function onFocus(event: FocusEvent) {
      if (event.target instanceof Node && !dialog.contains(event.target)) focusFirst()
    }
    dialog.addEventListener('keydown', onTab)
    document.addEventListener('focusin', onFocus)
    focusFirst()
    const previous = opener.current
    return () => {
      dialog.removeEventListener('keydown', onTab)
      document.removeEventListener('focusin', onFocus)
      // React must remove the background's inert attribute before restoring focus.
      queueMicrotask(() => { if (previous?.isConnected) previous.focus() })
    }
  }, [])

  return (
    <div ref={ref} className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1}>
      <div className={`modal ${className}`}>{children}</div>
    </div>
  )
}
