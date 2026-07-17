import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Upload, Download, Eye, RefreshCw, Terminal, Code2, Pencil, Workflow,
  Plus, Trash2, Globe, Server, Settings, FileText,
  CheckCircle2, XCircle, AlertCircle, Moon, Sun, Layers, X
} from 'lucide-react'
import SectionCard from './components/SectionCard'
import ValidationPanel from './components/ValidationPanel'
import FlowDiagram from './components/FlowDiagram'
import { parseConfigText, parseConfigFile } from './lib/haproxy-parser.js'
import { serializeConfig } from './lib/haproxy-serializer.js'
import { validateConfigText } from './lib/haproxy-validator.js'
import { HAPROXY_VERSIONS, DEFAULT_VERSION } from './lib/haproxy-versions.js'

const SAMPLE_CFG = `global
    log /dev/log local0
    user haproxy
    group haproxy
    daemon
    maxconn 50000

defaults
    log global
    mode http
    option httplog
    timeout connect 5s
    timeout client 30s
    timeout server 30s

frontend http_front
    bind *:80
    mode http
    default_backend web_backend

backend web_backend
    mode http
    balance roundrobin
    server web01 10.0.0.1:80 check
`

const APP_VERSION = '1.4.0'
const LOCAL_SESSION_KEY = 'easyhaedit_local_cfg'

function Notification({ notif }) {
  if (!notif) return null
  const cls = notif.type === 'ok' ? 'notif-ok' : notif.type === 'err' ? 'notif-err' : 'notif-info'
  const Icon = notif.type === 'ok' ? CheckCircle2 : notif.type === 'err' ? XCircle : AlertCircle
  return <div className={cls}><Icon size={15}/><span>{notif.msg}</span></div>
}

function SectionGroup({ label, icon: Icon, color, count, onAdd, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={14} className={color}/>
          <span className="text-sm font-semibold text-slate-600">{label}</span>
          <span className={`text-xs font-mono ${color} opacity-70`}>({count})</span>
        </div>
        {onAdd && <button className="btn-sm btn-ghost text-xs" onClick={onAdd}><Plus size={12}/> Add</button>}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function EmptySection({ label }) {
  return (
    <p className="text-slate-400 text-xs font-mono italic py-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
      {label}
    </p>
  )
}

// ── ConfigEditor ──────────────────────────────────────────────────────────

function ConfigEditor({ rawCfg, setRawCfg, config, setConfig, notify, dirty, setDirty, haVersion, onVersionChange, canUndo, canRedo, onUndo, onRedo }) {
  const [tab, setTab] = useState('editor')
  const [parseError, setParseError] = useState(null)
  const [validationResult, setValidationResult] = useState(null)
  const [validating, setValidating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sectionFilter, setSectionFilter] = useState('')
  const validationPanelRef = useRef(null)

  // Auto-validate when version changes
  useEffect(() => {
    if (rawCfg && rawCfg.trim()) {
      setValidating(true)
      const res = validateConfigText(rawCfg, haVersion)
      setValidating(false)
      setValidationResult(res)
    }
  }, [haVersion])

  const handleParse = useCallback(async () => {
    setLoading(true); setParseError(null)
    const res = parseConfigText(rawCfg)
    setLoading(false)
    if (res.success) { setConfig(res.config); setTab('editor'); notify('Parsed successfully', 'ok') }
    else setParseError(res.errors?.join('\n') || 'Parse failed')
  }, [rawCfg])

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setLoading(true)
    const res = await parseConfigFile(file)
    setLoading(false)
    if (res.success) {
      setConfig(res.config)
      const s = serializeConfig(res.config)
      setRawCfg(s)
      if (setDirty) setDirty(true)
      setTab('editor'); notify('Loaded ' + file.name, 'ok')
    } else setParseError(res.errors?.join('\n') || 'Failed')
    e.target.value = ''
  }

  const handleSerialize = () => {
    if (!config) return
    const res = serializeConfig(config)
    setRawCfg(res)
    if (setDirty) setDirty(true)
    setTab('raw')
  }

  const handleValidate = () => {
    setValidating(true)
    const res = validateConfigText(rawCfg, haVersion)
    setValidating(false)
    setValidationResult(res)
    if (!res.valid) {
      setTimeout(() => {
        validationPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 50)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([rawCfg], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'haproxy.cfg'; a.click()
    URL.revokeObjectURL(url)
  }

  const updateSection = useCallback((type, idx, updated) => {
    if (!config) return
    const key = `${type}s`
    const arr = [...(config[key] || [])]; arr[idx] = updated
    setConfig({ ...config, [key]: arr }); if (setDirty) setDirty(true)
  }, [config, setDirty])

  const addSection = useCallback((type) => {
    if (!config) return
    const key = `${type}s`
    const existing = config[key] || []
    const n = existing.length + 1
    const base = {
      name: `${type}_${n}`, mode: 'http',
      options: [], acls: [],
      http_request: [], http_response: [], http_after_response: [],
      tcp_request: [], tcp_response: [],
      timeouts: {}, extra_lines: [],
    }
    const ns = type === 'frontend'
      ? { ...base, bind: ['*:80'], use_backends: [], default_backend: null }
      : type === 'listen'
      ? { ...base, bind: ['*:8080'], balance: 'roundrobin', servers: [],
          health_check: null, cookie: null, stick_table: null, stick_rules: [] }
      : { ...base, balance: 'roundrobin', servers: [],
          health_check: null, cookie: null, stick_table: null, stick_rules: [],
          compression: null }
    setConfig({ ...config, [key]: [...existing, ns] }); if (setDirty) setDirty(true)
  }, [config, setDirty])

  const duplicateSection = useCallback((type, idx) => {
    if (!config) return
    const key = `${type}s`
    const arr = [...(config[key] || [])]
    const orig = arr[idx]
    const newSection = JSON.parse(JSON.stringify(orig))
    newSection.name = `${orig.name}_copy`
    arr.splice(idx + 1, 0, newSection)
    setConfig({ ...config, [key]: arr }); if (setDirty) setDirty(true)
  }, [config, setDirty])

  const removeSection = useCallback((type, idx) => {
    if (!config) return
    const key = `${type}s`
    const arr = [...(config[key] || [])]; arr.splice(idx, 1)
    setConfig({ ...config, [key]: arr }); if (setDirty) setDirty(true)
  }, [config, setDirty])

  const matchFilter = (s) => !sectionFilter || (s.name || '').toLowerCase().includes(sectionFilter.toLowerCase())

  const filteredFrontends = useMemo(() => (config?.frontends || []).map((s,i) => ({s,i})).filter(({s}) => matchFilter(s)).map(({s,i}) => ({...s, _origIdx: i})), [config, sectionFilter])
  const filteredBackends  = useMemo(() => (config?.backends  || []).map((s,i) => ({s,i})).filter(({s}) => matchFilter(s)).map(({s,i}) => ({...s, _origIdx: i})), [config, sectionFilter])
  const filteredListens   = useMemo(() => (config?.listens   || []).map((s,i) => ({s,i})).filter(({s}) => matchFilter(s)).map(({s,i}) => ({...s, _origIdx: i})), [config, sectionFilter])

  const stats = config ? {
    frontends: config.frontends?.length || 0,
    backends:  config.backends?.length  || 0,
    listens:   config.listens?.length   || 0,
    defaults:  config.defaults?.length  || 0,
    servers:   [...(config.backends||[]),...(config.listens||[])].reduce((s,b)=>s+(b.servers?.length||0),0),
  } : null

  const TABS = [
    { id: 'raw',    label: 'Raw Config', icon: Code2 },
    { id: 'editor', label: 'Visual',     icon: Pencil },
    { id: 'flow',   label: 'Flow',       icon: Workflow },
  ]

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex items-center gap-2 flex-wrap shrink-0">
        <label className="btn-sm btn-secondary cursor-pointer">
          <Upload size={13}/> Upload .cfg
          <input type="file" accept=".cfg,.conf,.txt" className="hidden" onChange={handleFileUpload}/>
        </label>
        <button className="btn-sm btn-secondary" onClick={handleParse} disabled={loading}>
          {loading ? <RefreshCw size={13} className="animate-spin"/> : <Eye size={13}/>} Parse
        </button>
        <select
          className="btn-sm btn-secondary text-xs font-mono cursor-pointer"
          value={haVersion}
          onChange={e => onVersionChange(e.target.value)}
          title="HAProxy version for validation"
        >
          {HAPROXY_VERSIONS.map(v => <option key={v} value={v}>HAProxy {v}</option>)}
        </select>
        <button className="btn-sm btn-secondary" onClick={handleValidate} disabled={validating}>
          {validating ? <RefreshCw size={13} className="animate-spin"/> : <Terminal size={13}/>} Validate
        </button>
        {config && (
          <button className="btn-sm btn-secondary" onClick={handleSerialize} title="Serialize visual editor config back to raw text">
            <RefreshCw size={13}/> ⟶ Raw
          </button>
        )}
        <button className="btn-sm btn-secondary" onClick={handleDownload}>
          <Download size={13}/> Download
        </button>
        <div className="flex items-center gap-1">
          <button className={`btn-sm ${canUndo ? 'btn-secondary' : 'btn-disabled'}`} onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
            ↩
          </button>
          <button className={`btn-sm ${canRedo ? 'btn-secondary' : 'btn-disabled'}`} onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
            ↪
          </button>
        </div>
        {dirty && <span className="ml-auto text-[11px] text-amber-500 font-medium">● Unsaved changes</span>}
      </div>

      {/* Validation result panel */}
      {(validationResult || validating) && (
        <div ref={validationPanelRef} className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-3 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal size={12}/> Validation result
            </span>
            {validationResult && (
              <button className="text-xs text-slate-400 hover:text-slate-600 transition-colors" onClick={() => setValidationResult(null)}>✕</button>
            )}
          </div>
          <ValidationPanel result={validationResult} loading={validating}/>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-6 py-2 flex items-center gap-6 shrink-0">
          {[
            { label: 'Frontends', val: stats.frontends, color: 'text-blue-500' },
            { label: 'Backends',  val: stats.backends,  color: 'text-emerald-500' },
            { label: 'Listen',    val: stats.listens,   color: 'text-purple-500' },
            { label: 'Servers',   val: stats.servers,   color: 'text-orange-500' },
            { label: 'Defaults',  val: stats.defaults,  color: 'text-slate-400' },
          ].map(({ label, val, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`text-base font-bold font-mono ${color}`}>{val}</span>
              <span className="text-xs text-slate-400">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 pt-3 shrink-0">
        <div className="tab-bar inline-flex">
          {TABS.map(t => (
            <button key={t.id} className={`tab-item ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              <t.icon size={13}/>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-slate-100 dark:bg-slate-900">
        {tab === 'raw' && (
          <div className="card overflow-hidden h-full flex flex-col">
            <div className="card-header">
              <span className="text-xs font-mono text-slate-400">haproxy.cfg</span>
              <span className="text-xs text-slate-400">{rawCfg.split('\n').length} lines</span>
            </div>
            <div className="flex flex-1 min-h-0">
              <div className="text-right text-xs font-mono text-slate-400 dark:text-slate-500 p-4 pr-2 select-none border-r border-slate-200 dark:border-slate-600 overflow-hidden leading-5" aria-hidden="true">
                {rawCfg.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
              </div>
              <textarea
                className="flex-1 bg-transparent text-sm font-mono text-slate-700 dark:text-slate-300 p-4 pl-2 resize-none focus:outline-none leading-5"
                value={rawCfg}
                onChange={e => { setRawCfg(e.target.value); if (setDirty) setDirty(true) }}
                spellCheck={false}
              />
            </div>
            {parseError && (
              <div className="border-t border-red-200 dark:border-red-800 px-4 py-2 bg-red-50 dark:bg-red-900/20">
                <pre className="text-xs font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap">{parseError}</pre>
              </div>
            )}
            <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-2 bg-white dark:bg-slate-800 rounded-b-xl">
              <button className="btn-primary text-xs" onClick={handleParse} disabled={loading}>
                {loading ? <RefreshCw size={13} className="animate-spin"/> : <Eye size={13}/>}
                Load into Visual Editor
              </button>
              <label className="btn-sm btn-secondary text-xs cursor-pointer">
                <Upload size={13}/> Upload .cfg
                <input type="file" accept=".cfg,.conf,.txt" className="hidden" onChange={handleFileUpload}/>
              </label>
            </div>
          </div>
        )}

        {tab === 'editor' && (
          <div className="space-y-4">
            {config && (
              <div className="flex items-center gap-3 mb-2">
                <div className="relative flex-1 max-w-xs">
                  <input className="input-mono py-1.5 pl-7 w-full text-xs"
                    placeholder="Filter sections by name…"
                    value={sectionFilter}
                    onChange={e => setSectionFilter(e.target.value)}
                  />
                  <svg className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                </div>
                {sectionFilter && (
                  <button className="text-xs text-slate-400 hover:text-slate-600" onClick={() => setSectionFilter('')}>
                    Clear
                  </button>
                )}
              </div>
            )}
            {parseError && (
              <div className="card border-l-2 border-l-red-400 p-4">
                <pre className="text-xs font-mono text-red-600 whitespace-pre-wrap">{parseError}</pre>
              </div>
            )}
            {!config ? (
              <div className="card p-14 text-center flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                  <Eye size={26} className="text-slate-400"/>
                </div>
                <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1.5">No config parsed yet</h3>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-5">
                  Click <span className="font-medium text-slate-500 dark:text-slate-400">Parse</span> to load the current raw config into the visual editor.
                </p>
                <button className="btn-primary" onClick={handleParse} disabled={loading}>
                  {loading ? <RefreshCw size={13} className="animate-spin"/> : <Eye size={13}/>}
                  Parse current config
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {config.global_section && (
                    <div className="card p-4">
                      <div className="flex items-center gap-2 mb-3"><span className="badge badge-gl">global</span></div>
                      <dl className="text-xs font-mono space-y-1 text-slate-500">
                        {config.global_section?.maxconn && <div><span className="text-slate-700">maxconn</span> {config.global_section.maxconn}</div>}
                        {config.global_section?.nbthread && <div><span className="text-slate-700">nbthread</span> {config.global_section.nbthread}</div>}
                        {config.global_section?.user   && <div><span className="text-slate-700">user</span> {config.global_section.user}</div>}
                        {config.global_section?.daemon && <div className="text-slate-700">daemon</div>}
                        {config.global_section?.log?.slice(0,2).map((l,i) => <div key={i}><span className="text-slate-700">log</span> {l}</div>)}
                      </dl>
                    </div>
                  )}
                  {(config.defaults || []).map((def, di) => (
                    <div key={di} className="card p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="badge badge-df">defaults</span>
                        {def.name && <span className="text-xs font-mono text-slate-500">{def.name}</span>}
                      </div>
                      <dl className="text-xs font-mono space-y-1 text-slate-500">
                        {def.mode && <div><span className="text-slate-700">mode</span> {def.mode}</div>}
                        {def.timeouts?.connect && <div><span className="text-slate-700">timeout connect</span> {def.timeouts.connect}</div>}
                        {def.timeouts?.client  && <div><span className="text-slate-700">timeout client</span>  {def.timeouts.client}</div>}
                        {def.timeouts?.server  && <div><span className="text-slate-700">timeout server</span>  {def.timeouts.server}</div>}
                        {def.retries != null   && <div><span className="text-slate-700">retries</span> {def.retries}</div>}
                        {(def.options||[]).slice(0,3).map((o,i) => <div key={i}><span className="text-slate-700">option</span> {o}</div>)}
                      </dl>
                    </div>
                  ))}
                </div>
                <SectionGroup label="Frontends" icon={Globe} color="text-blue-600" count={filteredFrontends.length} onAdd={() => addSection('frontend')}>
                  {filteredFrontends.map((fe,i) => <SectionCard key={`fe-${fe._origIdx}`} type="frontend" section={fe} onUpdate={u=>updateSection('frontend',fe._origIdx,u)} onRemove={()=>removeSection('frontend',fe._origIdx)} onDuplicate={()=>duplicateSection('frontend',fe._origIdx)} haVersion={haVersion}/>)}
                  {!filteredFrontends.length && <EmptySection label="No frontends — click Add"/>}
                </SectionGroup>
                <SectionGroup label="Backends" icon={Server} color="text-emerald-600" count={filteredBackends.length} onAdd={() => addSection('backend')}>
                  {filteredBackends.map((be,i) => <SectionCard key={`be-${be._origIdx}`} type="backend" section={be} onUpdate={u=>updateSection('backend',be._origIdx,u)} onRemove={()=>removeSection('backend',be._origIdx)} onDuplicate={()=>duplicateSection('backend',be._origIdx)} haVersion={haVersion}/>)}
                  {!filteredBackends.length && <EmptySection label="No backends — click Add"/>}
                </SectionGroup>
                <SectionGroup label="Listen" icon={Settings} color="text-purple-600" count={filteredListens.length} onAdd={() => addSection('listen')}>
                  {filteredListens.map((ls,i) => <SectionCard key={`ls-${ls._origIdx}`} type="listen" section={ls} onUpdate={u=>updateSection('listen',ls._origIdx,u)} onRemove={()=>removeSection('listen',ls._origIdx)} onDuplicate={()=>duplicateSection('listen',ls._origIdx)} haVersion={haVersion}/>)}
                  {!filteredListens.length && <EmptySection label="No listen sections — click Add"/>}
                </SectionGroup>
              </>
            )}
          </div>
        )}

        {tab === 'flow' && <FlowDiagram config={config}/>}
      </div>
    </div>
  )
}

// ── App Root ──────────────────────────────────────────────────────────────

export default function App() {
  const [rawCfg, setRawCfg] = useState(() => {
    try { return sessionStorage.getItem(LOCAL_SESSION_KEY) || SAMPLE_CFG } catch { return SAMPLE_CFG }
  })
  const [config, rawSetConfig] = useState(null)
  const [dirty, setDirty] = useState(false)
  const histRef = useRef([])
  const histPosRef = useRef(-1)
  const [histVer, setHistVer] = useState(0)

  const pushHistory = useCallback((cfg) => {
    const h = histRef.current
    const pos = histPosRef.current
    const trimmed = h.slice(0, pos + 1)
    trimmed.push(JSON.parse(JSON.stringify(cfg)))
    if (trimmed.length > 100) trimmed.shift()
    histRef.current = trimmed
    histPosRef.current = trimmed.length - 1
    setHistVer(v => v + 1)
  }, [])

  const setConfig = useCallback((val) => {
    if (typeof val === 'function') {
      rawSetConfig(prev => {
        const next = val(prev)
        if (next !== prev) pushHistory(next)
        return next
      })
    } else {
      rawSetConfig(prev => {
        if (val !== prev) pushHistory(val)
        return val
      })
    }
  }, [pushHistory])

  const undo = useCallback(() => {
    const pos = histPosRef.current
    if (pos <= 0) return
    histPosRef.current = pos - 1
    rawSetConfig(histRef.current[pos - 1])
    setHistVer(v => v + 1)
  }, [])

  const redo = useCallback(() => {
    const h = histRef.current
    const pos = histPosRef.current
    if (pos >= h.length - 1) return
    histPosRef.current = pos + 1
    rawSetConfig(h[pos + 1])
    setHistVer(v => v + 1)
  }, [])

  const canUndo = histPosRef.current > 0
  const canRedo = histPosRef.current < histRef.current.length - 1

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])
  const [notif, setNotif] = useState(null)
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('easyhaedit_theme') === 'dark' } catch { return false }
  })
  const [haVersion, setHaVersion] = useState(() => {
    try { return localStorage.getItem('easyhaedit_version') || DEFAULT_VERSION } catch { return DEFAULT_VERSION }
  })

  useEffect(() => {
    const html = document.documentElement
    if (darkMode) { html.classList.add('dark') } else { html.classList.remove('dark') }
    try { localStorage.setItem('easyhaedit_theme', darkMode ? 'dark' : 'light') } catch {}
  }, [darkMode])

  useEffect(() => {
    try { sessionStorage.setItem(LOCAL_SESSION_KEY, rawCfg) } catch {}
  }, [rawCfg])

  useEffect(() => {
    try { localStorage.setItem('easyhaedit_version', haVersion) } catch {}
  }, [haVersion])

  // Auto-parse session config on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(LOCAL_SESSION_KEY)
      if (saved) {
        const res = parseConfigText(saved)
        if (res.success) setConfig(res.config)
      }
    } catch {}
  }, [])

  const notify = useCallback((msg, type = 'info') => {
    setNotif({ msg, type })
    setTimeout(() => setNotif(null), 3500)
  }, [])

  const handleClearSession = () => {
    try { sessionStorage.removeItem(LOCAL_SESSION_KEY) } catch {}
    setRawCfg(SAMPLE_CFG)
    setConfig(null)
    setDirty(false)
    notify('Session cleared', 'info')
  }

  return (
    <div className="app-shell">
      <Notification notif={notif}/>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
            <Layers size={16} className="text-white"/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-base font-bold text-slate-800 dark:text-white">EasyHAEdit</h1>
              <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full font-medium">Local</span>
            </div>
            <p className="text-[11px] text-slate-400">Visual editor for HAProxy configuration files — all data stays in your browser</p>
          </div>
          {dirty && (
            <button className="btn-sm btn-secondary text-[11px]" onClick={handleClearSession} title="Reset to sample config">
              <X size={11}/> Clear
            </button>
          )}
          <button
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            onClick={() => setDarkMode(d => !d)}
            title={darkMode ? 'Light mode' : 'Dark mode'}
          >
            {darkMode ? <Sun size={16}/> : <Moon size={16}/>}
          </button>
        </header>

        {/* Editor */}
        <ConfigEditor
          rawCfg={rawCfg} setRawCfg={setRawCfg}
          config={config} setConfig={setConfig}
          notify={notify}
          dirty={dirty} setDirty={setDirty}
          haVersion={haVersion} onVersionChange={setHaVersion}
          canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo}
        />

        {/* Footer */}
        <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-6 py-2 shrink-0 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">v{APP_VERSION} · HAProxy {haVersion}</span>
          <span className="text-[11px] text-slate-400">Coding by <a href="https://github.com/pabloberthold" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-700 transition-colors">pabloberthold</a></span>
        </footer>
      </div>
    </div>
  )
}
