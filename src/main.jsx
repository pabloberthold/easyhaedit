import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

window.addEventListener('error', e => {
  const div = document.createElement('pre')
  div.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#fee;color:#c00;padding:12px;font-size:12px;font-family:monospace;z-index:9999;white-space:pre-wrap;max-height:200px;overflow:auto;border-top:2px solid red'
  div.textContent = `[JS ERROR] ${e.message}\n${e.error?.stack || ''}`
  document.body.appendChild(div)
})

window.addEventListener('unhandledrejection', e => {
  const div = document.createElement('pre')
  div.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#fee;color:#c00;padding:12px;font-size:12px;font-family:monospace;z-index:9999;white-space:pre-wrap;max-height:200px;overflow:auto;border-top:2px solid red'
  div.textContent = `[UNHANDLED REJECTION] ${e.reason?.message || e.reason}`
  document.body.appendChild(div)
})

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    const div = document.createElement('pre')
    div.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#fee;color:#c00;padding:12px;font-size:12px;font-family:monospace;z-index:9999;white-space:pre-wrap;max-height:200px;overflow:auto;border-top:2px solid red'
    div.textContent = `[REACT ERROR] ${error.message}\n${error.stack || ''}\n\nComponent Stack: ${info.componentStack || ''}`
    document.body.appendChild(div)
  }
  render() {
    if (this.state.error) {
      return null
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
