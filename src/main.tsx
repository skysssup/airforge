import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { openExampleFromUrl } from './examples'
import { openSceneLinkFromUrl } from './ui/sceneFiles'
import './styles/app.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

openExampleFromUrl()
void openSceneLinkFromUrl()
window.addEventListener('hashchange', () => void openSceneLinkFromUrl())

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
