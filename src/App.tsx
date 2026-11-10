import { useCallback, useEffect, useState } from 'react'
import { SceneCanvas } from './render/SceneCanvas'
import { TopBar } from './ui/TopBar'
import { EditControls, MoreButton, RunControls, WorldButton } from './ui/Controls'
import { MoreSheet } from './ui/MoreSheet'
import { WorldPanel } from './ui/WorldPanel'
import { StatusLine } from './ui/StatusLine'
import { SheetBackdrop } from './ui/SheetBackdrop'
import { EmptyState } from './ui/EmptyState'
import { DrawingOverlay } from './ui/DrawingOverlay'
import { Tutorial } from './ui/Tutorial'
import { PendingStrokePicker } from './ui/PendingStrokePicker'
import { SelectionBar } from './ui/SelectionBar'
import { MotionReadout } from './ui/MotionReadout'
import { ExampleNotes } from './ui/ExampleNotes'
import { HelpDialog } from './ui/HelpDialog'
import { WebcamPanel } from './ui/WebcamPanel'
import { useGlobalShortcuts } from './ui/useGlobalShortcuts'
import { useAppState } from './ui/hooks'
import { appStore } from './store/appStore'
import { TOKEN_COLORS } from './render/palette.generated'

/** Keep the document's theme attribute and the browser's theme color (the sheet's paper) in step with the store. */
function useDocumentTheme() {
  const theme = useAppState((s) => s.theme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', TOKEN_COLORS[theme].paper)
  }, [theme])

  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const query = matchMedia('(prefers-color-scheme: dark)')
    const follow = () => appStore.followSystemTheme(query.matches)
    query.addEventListener('change', follow)
    return () => query.removeEventListener('change', follow)
  }, [])
}

export default function App() {
  const tutorialDismissed = useAppState((s) => s.tutorialDismissed)
  const webcamEnabled = useAppState((s) => s.webcamEnabled)
  const [helpOpen, setHelpOpen] = useState(false)
  const [worldOpen, setWorldOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const closeWorld = useCallback(() => setWorldOpen(false), [])
  const closeMore = useCallback(() => setMoreOpen(false), [])
  const toggleMore = () => {
    setWorldOpen(false)
    setMoreOpen((open) => !open)
  }
  const dialogOpen = helpOpen || !tutorialDismissed

  useDocumentTheme()
  useGlobalShortcuts({
    dialogOpen,
    onToggleHelp: () => tutorialDismissed && setHelpOpen((open) => !open),
    onEscape: () => (tutorialDismissed ? setHelpOpen(false) : appStore.dismissTutorial()),
  })

  return (
    <>
      <div className="app" inert={dialogOpen} aria-hidden={dialogOpen || undefined}>
        <TopBar onOpenHelp={() => setHelpOpen(true)} moreOpen={moreOpen} onToggleMore={toggleMore} />
        <ExampleNotes />
        <main className="stage">
          <SheetBackdrop />
          <SceneCanvas />
          <EmptyState />
          <DrawingOverlay enabled={!dialogOpen} />
          <SelectionBar />
          <MotionReadout />
          <PendingStrokePicker />
          <WebcamPanel active={webcamEnabled && !dialogOpen} onClose={() => appStore.setWebcamEnabled(false)} />
        </main>
        <footer className="bottombar">
          <div className="bar-controls">
            <EditControls />
            <WorldButton open={worldOpen} onToggle={() => setWorldOpen((open) => !open)} />
            <RunControls />
            <MoreButton open={moreOpen} onToggle={toggleMore} className="more-bottom" />
          </div>
          <StatusLine />
          {worldOpen && !dialogOpen && <WorldPanel onClose={closeWorld} />}
          {moreOpen && !dialogOpen && (
            <MoreSheet onClose={closeMore} onOpenWorld={() => setWorldOpen(true)} onOpenHelp={() => setHelpOpen(true)} />
          )}
        </footer>
      </div>

      {!tutorialDismissed && <Tutorial />}
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
    </>
  )
}
