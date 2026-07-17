import { useState, useMemo, memo } from 'react'
import { Plus, Trash2, Save, ChevronDown } from 'lucide-react'
import { getVersionData } from '../lib/haproxy-versions.js'

const HTTP_REQ_TEMPLATES_BASE = [
  { label: 'set-header',     value: 'set-header X-Header value' },
  { label: 'add-header',     value: 'add-header X-Header value' },
  { label: 'del-header',     value: 'del-header X-Header' },
  { label: 'set-path',       value: 'set-path /new/path' },
  { label: 'set-query',      value: 'set-query new=param' },
  { label: 'redirect',       value: 'redirect scheme https' },
  { label: 'deny',           value: 'deny deny_status 403' },
  { label: 'allow',          value: 'allow' },
  { label: 'auth',           value: 'auth realm "My Realm"' },
  { label: 'set-var',        value: 'set-var(txn.my_var) str(value)' },
  { label: 'capture',        value: 'capture req.hdr(Host) len 64' },
  { label: 'set-log-level',  value: 'set-log-level silent' },
  { label: 'do-resolve',     value: 'do-resolve(txn.host) hdr(Host)' },
  { label: 'sc-inc-gpc',     value: 'sc-inc-gpc(0,0)' },
  { label: 'track-sc',       value: 'track-sc0 src' },
]

const HTTP_RESP_TEMPLATES_BASE = [
  { label: 'set-header',    value: 'set-header X-Header value' },
  { label: 'add-header',    value: 'add-header X-Header value' },
  { label: 'del-header',    value: 'del-header X-Header' },
  { label: 'set-status',    value: 'set-status 200' },
  { label: 'allow',         value: 'allow' },
  { label: 'deny',          value: 'deny' },
  { label: 'set-var',       value: 'set-var(txn.my_var) str(value)' },
  { label: 'replace-value', value: 'replace-value Content-Type text/html text/plain' },
]

const TCP_REQ_TYPES = ['connection', 'content', 'session', 'inspect-delay']

function RuleRow({ rule, onUpdate, onRemove, templates }) {
  const [showTpl, setShowTpl] = useState(false)
  const set = (field, val) => onUpdate({ ...rule, [field]: val })

  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 group">
      <td className="py-1.5 px-2">
        <div className="relative flex items-center">
          <input
            className="input-mono py-1 w-full pr-6"
            value={rule.action}
            onChange={e => set('action', e.target.value)}
            placeholder="set-header X-Real-IP %[src]"
          />
          {templates && (
            <>
              <button
                className="absolute right-1 text-slate-300 hover:text-slate-600"
                onClick={() => setShowTpl(s => !s)}
                title="Insert template"
              ><ChevronDown size={11}/></button>
              {showTpl && (
                <div className="absolute top-full left-0 z-20 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[220px]">
                  {templates.map(t => (
                    <button key={t.value}
                      className="w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-brand-50 hover:text-brand-700"
                      onClick={() => { set('action', t.value); setShowTpl(false) }}>
                      <span className="text-brand-600 font-semibold">{t.label}</span>
                      <span className="text-slate-400 ml-2">{t.value}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </td>
      <td className="py-1.5 px-2">
        <input
          className="input-mono py-1 w-full"
          value={rule.condition || ''}
          onChange={e => set('condition', e.target.value || null)}
          placeholder="if is_api"
        />
      </td>
      <td className="py-1.5 px-1">
        <button onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 btn-icon text-red-400 hover:text-red-600 hover:bg-red-50">
          <Trash2 size={12}/>
        </button>
      </td>
    </tr>
  )
}

function RuleTable({ label, rules, onChange, emptyLabel, templates, extraCol }) {
  const [rows, setRows] = useState(() => rules.map((r, i) => ({ ...r, _id: i })))
  const [nextId, setNextId] = useState(rules.length)
  const [dirty, setDirty] = useState(false)

  const addRow = () => {
    setRows(r => [...r, { action: '', condition: null, _id: nextId }])
    setNextId(n => n + 1); setDirty(true)
  }
  const updateRow = (id, updated) => {
    setRows(r => r.map(row => row._id === id ? { ...updated, _id: id } : row))
    setDirty(true)
  }
  const removeRow = (id) => { setRows(r => r.filter(row => row._id !== id)); setDirty(true) }
  const save = () => {
    onChange(rows.filter(r => r.action.trim()).map(({ _id, ...rest }) => rest))
    setDirty(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">{label}</h4>
        <div className="flex gap-2">
          {dirty && (
            <button onClick={save} className="btn-sm bg-brand-600 text-white hover:bg-brand-700">
              <Save size={11}/> Apply
            </button>
          )}
          <button onClick={addRow} className="btn-sm btn-secondary">
            <Plus size={11}/> Add
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-slate-400 text-xs font-mono italic py-2.5 text-center border border-dashed border-slate-200 rounded-lg bg-white/60">
          {emptyLabel || `No ${label} rules`}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm font-mono">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-2 px-3 text-slate-500 font-semibold text-[11px]">
                  action {templates && <span className="text-slate-300 font-normal">(▾ templates)</span>}
                </th>
                <th className="text-left py-2 px-3 text-slate-500 font-semibold text-[11px] w-48">
                  condition <span className="text-slate-300 font-normal">(if/unless …)</span>
                </th>
                <th className="w-8"/>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <RuleRow key={row._id} rule={row} templates={templates}
                  onUpdate={updated => updateRow(row._id, updated)}
                  onRemove={() => removeRow(row._id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function TcpRuleTable({ label, rules, onChange, types }) {
  const [rows, setRows] = useState(() => rules.map((r, i) => ({ ...r, _id: i })))
  const [nextId, setNextId] = useState(rules.length)
  const [dirty, setDirty] = useState(false)

  const addRow = () => {
    setRows(r => [...r, { type: types[0], action: '', condition: null, _id: nextId }])
    setNextId(n => n + 1); setDirty(true)
  }
  const updateRow = (id, updated) => {
    setRows(r => r.map(row => row._id === id ? { ...updated, _id: id } : row))
    setDirty(true)
  }
  const removeRow = (id) => { setRows(r => r.filter(row => row._id !== id)); setDirty(true) }
  const save = () => {
    onChange(rows.filter(r => r.action.trim()).map(({ _id, ...rest }) => rest))
    setDirty(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">{label}</h4>
        <div className="flex gap-2">
          {dirty && (
            <button onClick={save} className="btn-sm bg-brand-600 text-white hover:bg-brand-700">
              <Save size={11}/> Apply
            </button>
          )}
          <button onClick={addRow} className="btn-sm btn-secondary">
            <Plus size={11}/> Add
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-slate-400 text-xs font-mono italic py-2.5 text-center border border-dashed border-slate-200 rounded-lg bg-white/60">
          No {label} rules
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm font-mono">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-2 px-3 text-slate-500 font-semibold text-[11px] w-36">type</th>
                <th className="text-left py-2 px-3 text-slate-500 font-semibold text-[11px]">action</th>
                <th className="text-left py-2 px-3 text-slate-500 font-semibold text-[11px] w-48">condition</th>
                <th className="w-8"/>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 group">
                  <td className="py-1.5 px-2">
                    <select className="input text-xs py-1 w-full"
                      value={row.type}
                      onChange={e => updateRow(row._id, { ...row, type: e.target.value })}>
                      {types.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="py-1.5 px-2">
                    <input className="input-mono py-1 w-full" value={row.action}
                      onChange={e => updateRow(row._id, { ...row, action: e.target.value })}
                      placeholder="accept / reject / track-sc0 src"/>
                  </td>
                  <td className="py-1.5 px-2">
                    <input className="input-mono py-1 w-full" value={row.condition || ''}
                      onChange={e => updateRow(row._id, { ...row, condition: e.target.value || null })}
                      placeholder="if is_internal"/>
                  </td>
                  <td className="py-1.5 px-1">
                    <button onClick={() => removeRow(row._id)}
                      className="opacity-0 group-hover:opacity-100 btn-icon text-red-400 hover:text-red-600 hover:bg-red-50">
                      <Trash2 size={12}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function HttpRulesEditor({ section, onUpdate, sectionType, haVersion }) {
  const feat = useMemo(() => getVersionData(haVersion), [haVersion])
  const reqTemplates = useMemo(() =>
    HTTP_REQ_TEMPLATES_BASE.filter(t => feat.http_request_actions.has(t.label)),
    [feat]
  )
  const respTemplates = useMemo(() =>
    HTTP_RESP_TEMPLATES_BASE.filter(t => feat.http_request_actions.has(t.label)),
    [feat]
  )
  const isBackendLike = sectionType === 'backend' || sectionType === 'listen'

  return (
    <div className="space-y-5">
      <TcpRuleTable
        label="tcp-request"
        rules={section.tcp_request || []}
        types={TCP_REQ_TYPES}
        onChange={v => onUpdate({ ...section, tcp_request: v })}
      />
      <RuleTable
        label="http-request"
        rules={section.http_request || []}
        templates={reqTemplates}
        onChange={v => onUpdate({ ...section, http_request: v })}
      />
      <RuleTable
        label="http-response"
        rules={section.http_response || []}
        templates={respTemplates}
        onChange={v => onUpdate({ ...section, http_response: v })}
      />
      <RuleTable
        label="http-after-response"
        rules={section.http_after_response || []}
        templates={respTemplates}
        onChange={v => onUpdate({ ...section, http_after_response: v })}
      />
      {isBackendLike && (
        <TcpRuleTable
          label="tcp-response"
          rules={section.tcp_response || []}
          types={['content', 'inspect-delay']}
          onChange={v => onUpdate({ ...section, tcp_response: v })}
        />
      )}
    </div>
  )
}

export default memo(HttpRulesEditor, (prev, next) =>
  JSON.stringify(prev.section) === JSON.stringify(next.section) &&
  prev.sectionType === next.sectionType &&
  prev.onUpdate === next.onUpdate &&
  prev.haVersion === next.haVersion
)
