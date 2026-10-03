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
import { useGlobalShortcuts } from './ui/useGlobalShortcuts'
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

  useGlobalShortcuts({
    dialogOpen: helpOpen || !tutorialDismissed,
    onToggleHelp: () => tutorialDismissed && setHelpOpen((v) => !v),
    onEscape: () => {
      setHelpOpen(false)
      setReplayOpen(false)
    },
  })

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
      {replayOpen && <ReplayPanel onClose={() => setReplayOpen(false)} />}
    </div>
  )
}
