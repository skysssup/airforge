import { useCallback, useEffect, useState } from 'react'
import { SceneCanvas } from './render/SceneCanvas'
import { Toolbar } from './ui/Toolbar'
import { DrawingOverlay } from './ui/DrawingOverlay'
import { Tutorial } from './ui/Tutorial'
import { SuggestionPicker } from './ui/SuggestionPicker'
import { GestureHelp } from './ui/GestureHelp'
import { WebcamPanel } from './ui/WebcamPanel'
import { ReplayPanel } from './ui/ReplayPanel'
import { StatusBar } from './ui/StatusBar'
import { useAppState } from './ui/hooks'
import { appStore } from './store/appStore'
import './styles/app.css'

export default function App() {
  const { tutorialDismissed, webcamEnabled, replayMode } = useAppState()
  const [helpOpen, setHelpOpen] = useState(false)
  const [replayOpen, setReplayOpen] = useState(false)

  const toggleWebcam = useCallback(() => {
    if (webcamEnabled) {
      appStore.setWebcamEnabled(false)
    } else {
      appStore.setWebcamEnabled(true)
    }
  }, [webcamEnabled])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        appStore.togglePause()
      } else if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault()
        appStore.undo()
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        appStore.resetScene()
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        appStore.dropBall()
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        appStore.freezeBalls()
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setHelpOpen((v) => !v)
      } else if (e.key === 'Escape') {
        setHelpOpen(false)
        setReplayOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Prefer reduced motion: tighten CSS transitions via class on <html>
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => document.documentElement.classList.toggle('reduced-motion', mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  return (
    <div className="app-shell">
      <Toolbar
        onToggleWebcam={toggleWebcam}
        onOpenHelp={() => setHelpOpen(true)}
        onOpenReplay={() => setReplayOpen(true)}
      />

      <main className="stage">
        <SceneCanvas />
        <DrawingOverlay enabled={!replayMode} />
        <SuggestionPicker />
        <WebcamPanel
          active={webcamEnabled && !replayMode}
          onClose={() => appStore.setWebcamEnabled(false)}
        />
      </main>

      <StatusBar />

      {!tutorialDismissed && <Tutorial />}
      <GestureHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ReplayPanel open={replayOpen} onClose={() => setReplayOpen(false)} />
    </div>
  )
}
