import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

let errorContainer = null
function showError(msg) {
  if (!errorContainer) {
    errorContainer = document.createElement('pre')
    errorContainer.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#fee;color:#c00;padding:12px;font-size:12px;font-family:monospace;z-index:9999;white-space:pre-wrap;max-height:200px;overflow:auto;border-top:2px solid red'
    document.body.appendChild(errorContainer)
  }
  errorContainer.textContent += (errorContainer.textContent ? '\n\n' : '') + msg
}

window.addEventListener('error', e => {
  showError(`[JS ERROR] ${e.message}\n${e.error?.stack || ''}`)
})

window.addEventListener('unhandledrejection', e => {
  showError(`[UNHANDLED REJECTION] ${e.reason?.message || e.reason}`)
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
    showError(`[REACT ERROR] ${error.message}\n${error.stack || ''}\n\nComponent Stack: ${info.componentStack || ''}`)
  }
  render() {
    if (this.state.error) {
      return (
        <div className="app-shell items-center justify-center p-8">
          <div className="card max-w-md w-full p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Something went wrong</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">EasyHAEdit encountered an unexpected error. Your config is not lost — it's saved in your browser session.</p>
            <pre className="text-xs font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-left max-h-32 overflow-auto">{this.state.error.message}</pre>
            <button className="btn-primary" onClick={() => window.location.reload()}>Reload app</button>
          </div>
        </div>
      )
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
