import { useState, useEffect, memo, useMemo } from 'react'
import { Plus, Trash2, Save, ChevronDown, ChevronRight, Shield, Activity } from 'lucide-react'

const EMPTY = {
  name: '', address: '', port: 80,
  check: false, weight: null, maxconn: null,
  check_inter: null, check_rise: null, check_fall: null,
  ssl: false, verify: null, sni: null,
  backup: false, disabled: false,
  track: null, on_error: null, resolvers: null, init_addr: null,
  extra_params: [],
}

const KNOWN_PARAMS = [
  'send-proxy', 'send-proxy-v2', 'send-proxy-v2-ssl', 'send-proxy-v2-ssl-cn',
  'check-send-proxy', 'agent-check', 'agent-inter', 'agent-addr', 'agent-port', 'agent-send',
  'allow-0rtt', 'non-stick', 'error-limit', 'observe', 'health-check-up', 'health-check-down',
  'pool-max-conn', 'pool-purge-delay', 'pool-low-conn', 'max-reuse',
  'log-proto', 'pool-conn-name', 'namespace', 'guid',
  'init-state', 'sni-auto', 'no-sni-auto', 'check-sni-auto', 'no-check-sni-auto',
  'tcp-md5sig', 'cc', 'quic-cc-algo',
  'check-alpn', 'check-proto', 'check-sni', 'check-via-socks4', 'max-session-srv-conns',
]

function ServerRow({ row, onUpdate, onRemove, feat }) {
  const [expanded, setExpanded] = useState(false)
  const set = (field, value) => onUpdate({ ...row, [field]: value })

  const [extraStr, setExtraStr] = useState(() => (row.extra_params || []).join(' '))
  useEffect(() => { setExtraStr((row.extra_params || []).join(' ')) }, [row.name, row.address])

  const availableParams = useMemo(() =>
    KNOWN_PARAMS.filter(p => feat?.server_params?.has(p)).sort(),
    [feat]
  )

  const addParam = (p) => {
    const current = row.extra_params || []
    if (!current.includes(p)) {
      onUpdate({ ...row, extra_params: [...current, p] })
    }
  }
  const removeParam = (p) => {
    onUpdate({ ...row, extra_params: (row.extra_params || []).filter(x => x !== p) })
  }

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        <button onClick={() => setExpanded(e => !e)}
          className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 shrink-0">
          {expanded ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
        </button>
        <input className="input-mono py-1 w-28 shrink-0" placeholder="name"
          value={row.name} onChange={e => set('name', e.target.value)}/>
        <input className="input-mono py-1 flex-1 min-w-0" placeholder="10.0.0.1"
          value={row.address} onChange={e => set('address', e.target.value)}/>
        <input className="input-mono py-1 w-20 shrink-0" type="number" placeholder="80"
          min="1" max="65535"
          value={row.port} onChange={e => set('port', parseInt(e.target.value) || 80)}/>

        <label className={`flex items-center gap-1 text-[11px] font-mono cursor-pointer px-2 py-1 rounded transition-colors shrink-0
          ${row.check ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700' : 'bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-400 border border-slate-200 dark:border-slate-600'}`}
          title="health check">
          <input type="checkbox" className="sr-only"
            checked={!!row.check} onChange={e => set('check', e.target.checked)}/>
          <Activity size={10}/> chk
        </label>
        <label className={`flex items-center gap-1 text-[11px] font-mono cursor-pointer px-2 py-1 rounded transition-colors shrink-0
          ${row.ssl ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700' : 'bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-400 border border-slate-200 dark:border-slate-600'}`}
          title="SSL">
          <input type="checkbox" className="sr-only"
            checked={!!row.ssl} onChange={e => set('ssl', e.target.checked)}/>
          <Shield size={10}/> ssl
        </label>
        <label className={`text-[11px] font-mono cursor-pointer px-2 py-1 rounded transition-colors shrink-0
          ${row.backup ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700' : 'bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-400 border border-slate-200 dark:border-slate-600'}`}>
          <input type="checkbox" className="sr-only"
            checked={!!row.backup} onChange={e => set('backup', e.target.checked)}/>
          bkp
        </label>
        <label className={`text-[11px] font-mono cursor-pointer px-2 py-1 rounded transition-colors shrink-0
          ${row.disabled ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700' : 'bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-400 border border-slate-200 dark:border-slate-600'}`}>
          <input type="checkbox" className="sr-only"
            checked={!!row.disabled} onChange={e => set('disabled', e.target.checked)}/>
          dis
        </label>

        <button onClick={onRemove}
          className="ml-auto text-slate-300 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded transition-colors shrink-0">
          <Trash2 size={12}/>
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/20">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="label">Weight</label>
              <input className="input-mono py-1 w-full" type="number" min="0" max="256"
                placeholder="—" value={row.weight ?? ''}
                onChange={e => set('weight', e.target.value ? parseInt(e.target.value) : null)}/>
            </div>
            <div>
              <label className="label">maxconn</label>
              <input className="input-mono py-1 w-full" type="number" min="0"
                placeholder="—" value={row.maxconn ?? ''}
                onChange={e => set('maxconn', e.target.value ? parseInt(e.target.value) : null)}/>
            </div>
            <div>
              <label className="label">inter</label>
              <input className="input-mono py-1 w-full" placeholder="2000ms"
                value={row.check_inter ?? ''}
                onChange={e => set('check_inter', e.target.value || null)}/>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">rise</label>
                <input className="input-mono py-1 w-full" type="number" min="1"
                  placeholder="—" value={row.check_rise ?? ''}
                  onChange={e => set('check_rise', e.target.value ? parseInt(e.target.value) : null)}/>
              </div>
              <div>
                <label className="label">fall</label>
                <input className="input-mono py-1 w-full" type="number" min="1"
                  placeholder="—" value={row.check_fall ?? ''}
                  onChange={e => set('check_fall', e.target.value ? parseInt(e.target.value) : null)}/>
              </div>
            </div>
            {row.ssl && <>
              <div>
                <label className="label">verify</label>
                <select className="input text-xs py-1 w-full"
                  value={row.verify ?? ''}
                  onChange={e => set('verify', e.target.value || null)}>
                  <option value="">—</option>
                  <option value="none">none</option>
                  <option value="required">required</option>
                </select>
              </div>
              <div className="col-span-3">
                <label className="label">sni</label>
                <input className="input-mono py-1 w-full" placeholder="req.hdr(Host)"
                  value={row.sni ?? ''}
                  onChange={e => set('sni', e.target.value || null)}/>
              </div>
            </>}
            <div>
              <label className="label">on-error</label>
              <select className="input text-xs py-1 w-full"
                value={row.on_error ?? ''}
                onChange={e => set('on_error', e.target.value || null)}>
                <option value="">—</option>
                <option value="fastinter">fastinter</option>
                <option value="fail-check">fail-check</option>
                <option value="sudden-death">sudden-death</option>
                <option value="mark-down">mark-down</option>
              </select>
            </div>
            <div>
              <label className="label">resolvers</label>
              <input className="input-mono py-1 w-full" placeholder="mydns"
                value={row.resolvers ?? ''}
                onChange={e => set('resolvers', e.target.value || null)}/>
            </div>
            <div>
              <label className="label">track</label>
              <input className="input-mono py-1 w-full" placeholder="be/srv"
                value={row.track ?? ''}
                onChange={e => set('track', e.target.value || null)}/>
            </div>
            <div>
              <label className="label">init-addr</label>
              <input className="input-mono py-1 w-full" placeholder="libc,none"
                value={row.init_addr ?? ''}
                onChange={e => set('init_addr', e.target.value || null)}/>
            </div>
          </div>

          <div className="mt-3">
            <label className="label">Extra params</label>
            <input className="input-mono py-1 w-full" placeholder="send-proxy observe layer7"
              value={extraStr}
              onChange={e => setExtraStr(e.target.value)}
              onBlur={e => set('extra_params', e.target.value.trim() ? e.target.value.trim().split(/\s+/) : [])}/>
          </div>

          {availableParams.length > 0 && (
            <details className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              <summary className="cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 font-medium">
                Available params for HAProxy {feat?._version}
              </summary>
              <div className="mt-1 flex flex-wrap gap-1 max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded p-1.5 bg-white dark:bg-slate-700">
                {availableParams.map(p => {
                  const active = (row.extra_params || []).includes(p)
                  return (
                    <button key={p}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
                        active
                          ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                          : 'bg-slate-50 dark:bg-slate-600 text-slate-500 dark:text-slate-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-600 dark:hover:text-brand-300'
                      }`}
                      onClick={() => active ? removeParam(p) : addParam(p)}>
                      {p}
                    </button>
                  )
                })}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

function ServerEditor({ servers = [], onChange, feat }) {
  const [rows, setRows] = useState(() => servers.map((s, i) => ({ ...EMPTY, ...s, _id: i })))
  const [nextId, setNextId] = useState(servers.length)
  const [dirty, setDirty] = useState(false)

  const addRow = () => {
    setRows(r => [...r, { ...EMPTY, _id: nextId }])
    setNextId(n => n + 1); setDirty(true)
  }
  const updateRow = (id, updated) => {
    setRows(r => r.map(row => row._id === id ? { ...updated, _id: id } : row))
    setDirty(true)
  }
  const removeRow = (id) => { setRows(r => r.filter(row => row._id !== id)); setDirty(true) }

  const save = () => {
    onChange(rows
      .filter(r => r.name.trim() && r.address.trim())
      .map(({ _id, ...rest }) => ({
        ...rest,
        port: Number(rest.port) || 80,
      }))
    )
    setDirty(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Servers</h4>
        <div className="flex gap-2">
          {dirty && (
            <button onClick={save} className="btn-sm bg-brand-600 text-white hover:bg-brand-700">
              <Save size={11}/> Apply
            </button>
          )}
          <button onClick={addRow} className="btn-sm btn-secondary">
            <Plus size={11}/> Add Server
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-slate-400 dark:text-slate-500 text-xs font-mono italic py-3 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-lg bg-white/60 dark:bg-slate-800/40">
          No servers defined
        </p>
      ) : (
        <div className="space-y-1.5">
          <div className="grid font-mono text-[10px] text-slate-400 dark:text-slate-500 px-8 gap-2"
            style={{gridTemplateColumns: '1.5rem 7rem 1fr 5rem 4.5rem 3rem 3rem 3rem 2rem'}}>
            <span/><span>name</span><span>address</span><span>port</span>
            <span>check</span><span>ssl</span><span>bkp</span><span>dis</span><span/>
          </div>
          {rows.map(row => (
            <ServerRow key={row._id} row={row} feat={feat}
              onUpdate={updated => updateRow(row._id, updated)}
              onRemove={() => removeRow(row._id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default memo(ServerEditor, (prev, next) =>
  JSON.stringify(prev.servers) === JSON.stringify(next.servers) &&
  prev.onChange === next.onChange &&
  prev.feat?._version === next.feat?._version
)
