import { useState, useEffect, useMemo, memo } from 'react'
import {
  ChevronRight, Trash2,
  Globe, Server, Settings, List,
  Activity, Database, Clock, SlidersHorizontal, FileCode,
  Minimize2, Copy, CheckCircle2, XCircle, AlertCircle, Terminal
} from 'lucide-react'
import { getVersionData } from '../lib/haproxy-versions.js'
import { serializeFrontendSection, serializeBackendSection, serializeListenSection } from '../lib/haproxy-serializer.js'
import { validateConfigText } from '../lib/haproxy-validator.js'
import { getOptionExplanation } from '../lib/haproxy-explanations.js'
import InfoButton from './InfoButton'
import ACLEditor        from './ACLEditor'
import ServerEditor     from './ServerEditor'
import HttpRulesEditor  from './HttpRulesEditor'
import HealthCheckEditor from './HealthCheckEditor'
import PersistenceEditor from './PersistenceEditor'
import TimeoutsEditor   from './TimeoutsEditor'
import BindEditor       from './BindEditor'

const TYPE_BADGE = {
  frontend: 'badge-fe',
  backend:  'badge-be',
  listen:   'badge-ls',
}

const BALANCE_OPTIONS_BASE = [
  '', 'roundrobin', 'leastconn', 'source', 'random', 'uri',
  'hdr', 'rdp-cookie', 'first', 'static-rr', 'url_param',
  'hash', 'log-hash',
]

const TABS = [
  { id: 'overview',     label: 'Overview',     icon: Globe },
  { id: 'acls',        label: 'ACLs',          icon: List },
  { id: 'httprules',   label: 'HTTP Rules',    icon: FileCode },
  { id: 'health',      label: 'Health Check',  icon: Activity },
  { id: 'persistence', label: 'Persistence',   icon: Database },
  { id: 'timeouts',    label: 'Timeouts',      icon: Clock },
  { id: 'options',     label: 'Options',       icon: SlidersHorizontal },
]

const TAB_VISIBILITY = {
  frontend: ['overview', 'acls', 'httprules', 'timeouts', 'options'],
  backend:  ['overview', 'acls', 'httprules', 'health', 'persistence', 'timeouts', 'options'],
  listen:   ['overview', 'acls', 'httprules', 'health', 'persistence', 'timeouts', 'options'],
}

function OptionsList({ options = [], onChange, feat }) {
  const [newOpt, setNewOpt] = useState('')
  const add = (opt) => {
    const val = opt || newOpt.trim()
    if (!val) return
    onChange([...options, val])
    setNewOpt('')
  }
  const remove = (i) => onChange(options.filter((_, idx) => idx !== i))
  const availableOptions = useMemo(() => [...feat.options].sort(), [feat])
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Options</h4>
      <div className="space-y-1">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-1.5 group">
            <code className="flex-1 text-xs font-mono bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-slate-700 dark:text-slate-300">
              option {opt}
            </code>
            <InfoButton explanation={getOptionExplanation(opt)}/>
            <button onClick={() => remove(i)}
              className="opacity-0 group-hover:opacity-100 btn-icon text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
              <Trash2 size={12}/>
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="input-mono py-1 flex-1" placeholder="httplog / forwardfor / redispatch …"
          value={newOpt} onChange={e => setNewOpt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}/>
        <button onClick={() => add()} className="btn-sm btn-secondary">+ Add</button>
      </div>
      <details className="text-xs text-slate-400 dark:text-slate-500">
        <summary className="cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 font-medium">Available options for HAProxy {feat._version}</summary>
        <div className="mt-1 flex flex-wrap gap-1 max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded p-1.5 bg-surface dark:bg-slate-700">
          {availableOptions.map(opt => (
            <div key={opt} className="flex items-center gap-0.5">
              <button
                className={`text-[11px] font-mono px-2 py-0.5 rounded transition-colors ${
                  options.includes(opt)
                    ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 cursor-default'
                    : 'bg-slate-50 dark:bg-slate-600 text-slate-500 dark:text-slate-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-600 dark:hover:text-brand-300'
                }`}
                onClick={() => { if (!options.includes(opt)) add(opt) }}>
                {opt}
              </button>
              <InfoButton explanation={getOptionExplanation(opt)}/>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}

function ExtraLines({ extra = [], onChange }) {
  const [val, setVal] = useState(extra.join('\n'))
  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        Extra lines <span className="text-slate-300 dark:text-slate-500 font-normal">(verbatim, order preserved)</span>
      </h4>
      <textarea
        className="input-mono w-full min-h-[80px] resize-y text-xs"
        placeholder="Any directive not covered by the editor above"
        value={val}
        onChange={e => { setVal(e.target.value); onChange(e.target.value.split('\n').filter(l => l.trim())) }}
      />
    </div>
  )
}

function UseBackendsTextarea({ section, onUpdate }) {
  const toText = (ubs) => (ubs || []).map(u =>
    u.condition ? `${u.backend} ${u.condition}` : u.backend
  ).join('\n')

  const [text, setText] = useState(() => toText(section.use_backends))

  useEffect(() => {
    setText(toText(section.use_backends))
  }, [section.name])

  const parseAndSave = (raw) => {
    const rules = raw.split('\n')
      .map(l => l.trimEnd()).filter(l => l.trimStart())
      .map(l => {
        const m = l.match(/^(\S+)\s+((?:if|unless).+)$/)
        return m ? { backend: m[1], condition: m[2] } : { backend: l.trim(), condition: null }
      })
    onUpdate({ ...section, use_backends: rules })
  }

  return (
    <div>
      <label className="label">
        use_backend rules <span className="text-slate-400 font-normal">(one per line: backend_name [if condition])</span>
      </label>
      <textarea
        className="input-mono w-full min-h-[56px] resize-y text-xs"
        placeholder={"api_backend if is_api\nstatic_backend if is_static"}
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={e => parseAndSave(e.target.value)}
      />
    </div>
  )
}

function EditorPanel({ type, section, onUpdate, visibleTabs, activeTab, setActiveTab,
                       acls, hreq, hresp, haVersion, expanded }) {
  const feat = useMemo(() => getVersionData(haVersion), [haVersion])

  const srv = section.servers?.length || 0
  const estimatedRows =
    (activeTab === 'overview'  ? Math.max(6, (srv * 2) + 4) : 0) +
    (activeTab === 'acls'      ? Math.max(4, acls * 2 + 3)  : 0) +
    (activeTab === 'httprules' ? Math.max(4, (hreq + hresp) * 2 + 3) : 0) +
    (activeTab !== 'overview' && activeTab !== 'acls' && activeTab !== 'httprules' ? 8 : 0)
  const minContentH = expanded ? undefined : Math.min(Math.max(estimatedRows * 28, 200), 520)

  return (
    <div className={`flex flex-col ${expanded ? 'h-full' : ''} border-t border-slate-100 dark:border-slate-700`}>
      <div className="flex gap-0 px-4 pt-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 overflow-x-auto shrink-0">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px whitespace-nowrap transition-colors
              ${activeTab === tab.id
                ? 'border-brand-600 text-brand-700 dark:text-brand-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'}`}
          >
            <tab.icon size={12}/>
            {tab.label}
            {tab.id === 'acls'        && acls > 0           && <span className="ml-1 text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded-full px-1.5">{acls}</span>}
            {tab.id === 'httprules'   && (hreq+hresp) > 0   && <span className="ml-1 text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 rounded-full px-1.5">{hreq+hresp}</span>}
            {tab.id === 'health'      && section.health_check?.option_httpchk !== null && section.health_check?.option_httpchk !== undefined && <span className="ml-1 w-1.5 h-1.5 bg-amber-400 rounded-full inline-block"/>}
            {tab.id === 'persistence' && (section.cookie || section.stick_table) && <span className="ml-1 w-1.5 h-1.5 bg-pink-400 rounded-full inline-block"/>}
          </button>
        ))}
      </div>

      <div
        className="overflow-y-auto px-5 pb-5 pt-4 bg-slate-50/40 dark:bg-slate-900/30 space-y-5"
        style={expanded ? { flex: 1 } : { minHeight: minContentH }}
      >

        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input className="input-mono w-full max-w-xs"
                value={section.name}
                onChange={e => onUpdate({ ...section, name: e.target.value })}/>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {type !== 'backend' && (
                <BindEditor
                  bind={section.bind || []}
                  onChange={bind => onUpdate({ ...section, bind })}
                  feat={feat}
                />
              )}

              <div className="space-y-3">
                <div>
                  <label className="label">Mode</label>
                  <select className="input text-sm w-full"
                    value={section.mode || ''}
                    onChange={e => onUpdate({ ...section, mode: e.target.value || undefined })}>
                    <option value="">— inherit —</option>
                    <option value="http">http</option>
                    <option value="tcp">tcp</option>
                    <option value="health">health</option>
                  </select>
                </div>

                  {type !== 'frontend' && (
                  <div>
                    <label className="label">Balance</label>
                    <select className="input text-sm w-full"
                      value={section.balance || ''}
                      onChange={e => onUpdate({ ...section, balance: e.target.value || undefined })}>
                      {BALANCE_OPTIONS_BASE.filter(b => !b || feat.balance.has(b)).map(b => (
                        <option key={b} value={b}>{b || '— none —'}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="label">maxconn</label>
                  <input className="input-mono w-full" type="number" min="0"
                    placeholder="—"
                    value={section.maxconn ?? ''}
                    onChange={e => onUpdate({ ...section, maxconn: e.target.value ? parseInt(e.target.value) : null })}/>
                </div>
              </div>
            </div>

            {type !== 'backend' && (
              <div className="space-y-3">
                <div>
                  <label className="label">default_backend</label>
                  <input className="input-mono w-full max-w-sm"
                    value={section.default_backend || ''}
                    onChange={e => onUpdate({ ...section, default_backend: e.target.value || null })}
                    placeholder="web_backend"/>
                </div>
                <UseBackendsTextarea section={section} onUpdate={onUpdate} />
              </div>
            )}

            {type !== 'frontend' && (
              <div>
                <label className="label">http-reuse</label>
                <select className="input text-sm w-full max-w-xs"
                  value={section.http_reuse || ''}
                  onChange={e => onUpdate({ ...section, http_reuse: e.target.value || null })}>
                  <option value="">— none —</option>
                  <option value="never">never</option>
                  <option value="safe">safe</option>
                  <option value="aggressive">aggressive</option>
                  <option value="always">always</option>
                </select>
              </div>
            )}

            {type !== 'frontend' && (
              <ServerEditor
                servers={section.servers || []}
                onChange={servers => onUpdate({ ...section, servers })}
                feat={feat}
              />
            )}

            <ExtraLines
              extra={section.extra_lines || []}
              onChange={extra_lines => onUpdate({ ...section, extra_lines })}
            />
          </div>
        )}

        {activeTab === 'acls' && (
          <ACLEditor
            acls={section.acls || []}
            onChange={acls => onUpdate({ ...section, acls })}
            sectionLabel={section.name}
          />
        )}

        {activeTab === 'httprules' && (
          <HttpRulesEditor
            section={section}
            onUpdate={onUpdate}
            sectionType={type}
            feat={feat}
          />
        )}

        {activeTab === 'health' && (
          <HealthCheckEditor
            healthCheck={section.health_check || null}
            onChange={hc => onUpdate({ ...section, health_check: hc })}
          />
        )}

        {activeTab === 'persistence' && (
          <PersistenceEditor
            section={section}
            onUpdate={onUpdate}
          />
        )}

        {activeTab === 'timeouts' && (
          <TimeoutsEditor
            timeouts={section.timeouts || {}}
            onChange={timeouts => onUpdate({ ...section, timeouts })}
            mode={section.mode || 'http'}
            sectionType={type}
          />
        )}

        {activeTab === 'options' && (
          <OptionsList
            options={section.options || []}
            onChange={options => onUpdate({ ...section, options })}
            feat={feat}
          />
        )}

      </div>
    </div>
  )
}

function SectionCard({ type, section, onUpdate, onRemove, onDuplicate, haVersion }) {
  const [expanded, setExpanded]   = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
  const [validating, setValidating] = useState(false)

  useEffect(() => {
    if (!expanded) return
    const handler = (e) => { if (e.key === 'Escape') setExpanded(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [expanded])

  const visibleTabs = TABS.filter(t => (TAB_VISIBILITY[type] || []).includes(t.id))

  const validateSection = () => {
    const serializer = type === 'frontend' ? serializeFrontendSection
      : type === 'backend' ? serializeBackendSection
      : serializeListenSection
    const text = `global\n    daemon\ndefaults\n    mode http\n\n${serializer(section)}`
    setValidating(true)
    const result = validateConfigText(text, haVersion)
    setValidationResult(result)
    setValidating(false)
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    if (confirmDelete) { onRemove() }
    else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000) }
  }

  const srv    = section.servers?.length || 0
  const acls   = section.acls?.length || 0
  const hreq   = section.http_request?.length || 0
  const hresp  = section.http_response?.length || 0

  const editorPanelProps = {
    type, section, onUpdate, visibleTabs,
    activeTab, setActiveTab,
    acls, hreq, hresp, haVersion: haVersion,
  }

  return (
    <>
      <div className={`card overflow-hidden transition-shadow ${expanded ? 'ring-2 ring-brand-400 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-800' : ''}`}>

        <button
          onClick={() => setExpanded(x => !x)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
        >
          <ChevronRight size={13} className="text-slate-400 dark:text-slate-500 shrink-0"/>

          <span className={TYPE_BADGE[type] || 'badge-gl'}>{type}</span>
          <span className="font-mono text-sm font-medium text-slate-700 dark:text-slate-200">{section.name}</span>

          <div className="ml-auto flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 font-mono">
            {section.bind?.length  > 0 && <span className="text-slate-500 dark:text-slate-400">{section.bind.join(', ')}</span>}
            {section.mode          && <span className="text-slate-300 dark:text-slate-500">mode/{section.mode}</span>}
            {section.balance       && <span className="text-slate-300 dark:text-slate-500">balance/{section.balance}</span>}
            {srv  > 0              && <span className="text-emerald-600 dark:text-emerald-400">{srv} srv</span>}
            {acls > 0              && <span className="text-blue-600 dark:text-blue-400">{acls} acl</span>}
            {hreq > 0              && <span className="text-purple-600 dark:text-purple-400">{hreq} http-req</span>}
            {hresp > 0             && <span className="text-indigo-600 dark:text-indigo-400">{hresp} http-resp</span>}
            {section.health_check?.option_httpchk !== null &&
             section.health_check?.option_httpchk !== undefined &&
              <span className="text-amber-600 dark:text-amber-400">httpchk</span>}
            {section.cookie        && <span className="text-pink-600 dark:text-pink-400">cookie</span>}
            {section.stick_table   && <span className="text-orange-600 dark:text-orange-400">stick</span>}

            {onDuplicate && (
              <button
                onClick={(e) => { e.stopPropagation(); onDuplicate() }}
                className="p-1 rounded text-slate-300 dark:text-slate-500 hover:text-brand-500 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all"
                title="Duplicate section"
              >
                <Copy size={12}/>
              </button>
            )}
            {onRemove && (
              <button
                onClick={handleDelete}
                className={`p-1 rounded transition-all ${
                  confirmDelete
                    ? 'text-white bg-red-500 hover:bg-red-600'
                    : 'text-slate-300 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                }`}
              >
                <Trash2 size={12}/>
              </button>
            )}
          </div>
        </button>
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-[80] flex items-stretch justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          onClick={e => { if (e.target === e.currentTarget) setExpanded(false) }}
        >
          <div className="flex flex-col w-full max-w-6xl bg-surface dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">

            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 shrink-0">
              <span className={TYPE_BADGE[type] || 'badge-gl'}>{type}</span>
              <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-200">{section.name}</span>
              <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 font-mono ml-2">
                {srv  > 0             && <span className="text-emerald-600 dark:text-emerald-400">{srv} srv</span>}
                {acls > 0             && <span className="text-blue-600 dark:text-blue-400">{acls} acl</span>}
                {(hreq + hresp) > 0   && <span className="text-purple-600 dark:text-purple-400">{hreq + hresp} http-rules</span>}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={validateSection}
                  disabled={validating}
                  className="btn-sm btn-secondary text-xs"
                  title={`Validate this ${type} section (HAProxy ${haVersion})`}
                >
                  {validating
                    ? <Activity size={11} className="animate-spin"/>
                    : <Terminal size={11}/>}
                  Validate
                </button>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:block select-none">Esc para cerrar</span>
                <button
                  onClick={() => setExpanded(false)}
                  className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Cerrar (Esc)"
                >
                  <Minimize2 size={14}/>
                </button>
              </div>
            </div>

            {validationResult && (
              <div className={`shrink-0 px-5 py-2.5 border-b ${
                validationResult.valid
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {validationResult.valid
                    ? <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400"/>
                    : <XCircle size={14} className="text-red-600 dark:text-red-400"/>}
                  <span className={`text-xs font-semibold ${
                    validationResult.valid ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                  }`}>{validationResult.message}</span>
                  <button
                    onClick={() => setValidationResult(null)}
                    className="ml-auto text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  >✕</button>
                </div>
                {validationResult.issues.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-0.5">
                    {validationResult.issues.map((iss, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs font-mono">
                        <span className={`shrink-0 mt-0.5 ${
                          iss.severity === 'error' ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400'
                        }`}>
                          {iss.severity === 'error' ? <XCircle size={10}/> : <AlertCircle size={10}/>}
                        </span>
                        <span className={`${
                          iss.severity === 'error' ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'
                        }`}>{iss.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 overflow-hidden flex flex-col">
              <EditorPanel {...editorPanelProps} expanded={true}/>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default memo(SectionCard, (prev, next) =>
  JSON.stringify(prev.section) === JSON.stringify(next.section) &&
  prev.type === next.type &&
  prev.onUpdate === next.onUpdate &&
  prev.onRemove === next.onRemove &&
  prev.onDuplicate === next.onDuplicate &&
  prev.haVersion === next.haVersion
)
