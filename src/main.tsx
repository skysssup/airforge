import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { openExampleFromUrl } from './examples'
import './styles/app.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

openExampleFromUrl()

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
