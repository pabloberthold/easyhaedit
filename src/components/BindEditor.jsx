import { useState, useMemo } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { getBindParamExplanation } from '../lib/haproxy-explanations.js'
import InfoButton from './InfoButton'

const KNOWN_BIND_PARAMS = [
  'ssl', 'alpn', 'backlog', 'ca-file', 'ca-verify-file', 'ciphers', 'ciphersuites',
  'crl-file', 'crt', 'crt-list', 'curves', 'defer-accept', 'ecdhe',
  'force-sslv3', 'force-tlsv10', 'force-tlsv11', 'force-tlsv12', 'force-tlsv13',
  'generate-certificates', 'gid', 'group', 'id', 'interface', 'level', 'maxconn',
  'mode', 'mss', 'name', 'nice', 'no-sslv3', 'no-tlsv10', 'no-tlsv11',
  'no-tlsv12', 'no-tlsv13', 'npn', 'prefer-client-ciphers', 'process', 'protect',
  'proto', 'strict-sni', 'tcp-ut', 'tfo', 'thread', 'transparent', 'uid', 'user',
  'verify', 'v4v6', 'v6only', 'accept-nproxy', 'accept-proxy', 'allow-0rtt',
  'ca-ignore-err', 'ca-sign-file', 'ca-sign-pass', 'crt-ignore-err',
  'expose-fd', 'quic', 'quic-cc-algo', 'quic-force-retry', 'quic-retry-impact-key',
  'quic-socket', 'default-crt', 'namespace', 'ech', 'tcp-md5sig', 'ktls', 'qmux',
]

function BindRow({ line, onChange, onRemove, feat }) {
  const [expanded, setExpanded] = useState(false)
  const parts = line.split(/\s+/)
  const address = parts[0] || ''
  const params = parts.slice(1)

  const toggleParam = (p) => {
    const idx = params.indexOf(p)
    const newParams = idx === -1 ? [...params, p] : params.filter(x => x !== p)
    onChange(`${address}${newParams.length ? ' ' + newParams.join(' ') : ''}`)
  }

  const setAddress = (val) => {
    onChange(`${val}${params.length ? ' ' + params.join(' ') : ''}`)
  }

  const availableParams = useMemo(() =>
    KNOWN_BIND_PARAMS.filter(p => feat?.bind_params?.has(p)).sort(),
    [feat]
  )

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 overflow-hidden group">
      <div className="flex items-center gap-2 px-3 py-2">
        <button onClick={() => setExpanded(e => !e)}
          className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 shrink-0">
          {expanded ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
        </button>
        <input className="input-mono py-1 flex-1 font-mono text-xs" placeholder="*:443"
          value={address} onChange={e => setAddress(e.target.value)}/>
        <div className="flex gap-1 flex-wrap shrink-0 max-w-[200px] overflow-x-auto">
          {params.slice(0, 3).map(p => (
            <span key={p} className="text-[10px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded whitespace-nowrap">
              {p}
            </span>
          ))}
          {params.length > 3 && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500">+{params.length - 3}</span>
          )}
        </div>
        <button onClick={onRemove}
          className="text-slate-300 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded transition-colors shrink-0">
          <Trash2 size={12}/>
        </button>
      </div>
      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/20">
          <div className="text-xs text-slate-400 dark:text-slate-500 mb-2">
            Toggle params for <code className="font-mono text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 px-1 rounded">{address}</code>:
          </div>
          <div className="flex flex-wrap gap-1 max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded p-1.5 bg-white dark:bg-slate-700">
            {availableParams.map(p => {
              const active = params.includes(p)
              return (
                <div key={p} className="flex items-center gap-0.5">
                  <button
                    className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
                      active
                        ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                        : 'bg-slate-50 dark:bg-slate-600 text-slate-500 dark:text-slate-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-600 dark:hover:text-brand-300'
                    }`}
                    onClick={() => toggleParam(p)}>
                    {p}
                  </button>
                  <InfoButton explanation={getBindParamExplanation(p)}/>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function BindEditor({ bind = [], onChange, feat }) {
  const [rows, setRows] = useState(() => bind.map((l, i) => ({ _id: i, line: l })))
  const [nextId, setNextId] = useState(bind.length)

  const sync = (updated) => {
    onChange(updated.map(r => r.line).filter(Boolean))
  }

  const add = () => {
    const newRows = [...rows, { _id: nextId, line: '*:443' }]
    setRows(newRows); setNextId(n => n + 1)
    sync(newRows)
  }

  const update = (id, line) => {
    const newRows = rows.map(r => r._id === id ? { ...r, line } : r)
    setRows(newRows)
    sync(newRows)
  }

  const remove = (id) => {
    const newRows = rows.filter(r => r._id !== id)
    setRows(newRows)
    sync(newRows)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Bind <span className="text-slate-400 dark:text-slate-500 font-normal">params</span>
        </h4>
        <button onClick={add} className="btn-sm btn-secondary">
          <Plus size={11}/> Add bind
        </button>
      </div>
      {rows.map(row => (
        <BindRow key={row._id} line={row.line}
          onChange={line => update(row._id, line)}
          onRemove={() => remove(row._id)}
          feat={feat}
        />
      ))}
      {rows.length === 0 && (
        <p className="text-slate-400 dark:text-slate-500 text-xs font-mono italic py-2 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-lg bg-white/60 dark:bg-slate-800/40">
          No bind directives
        </p>
      )}
    </div>
  )
}
