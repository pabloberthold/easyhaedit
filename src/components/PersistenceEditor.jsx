import { useState } from 'react'
import { Plus, Trash2, Database } from 'lucide-react'
import { STICK_ACTION_EXPLANATIONS } from '../lib/haproxy-explanations.js'
import InfoButton from './InfoButton'

const STICK_ACTIONS = ['store-request', 'match', 'on', 'store-response']
const COOKIE_METHODS = ['insert', 'rewrite', 'prefix']
const STICK_TABLE_TYPES  = ['ip', 'ipv6', 'integer', 'string', 'binary']
const STICK_TABLE_STORES = [
  'conn_cur', 'conn_rate', 'sess_cnt', 'sess_rate',
  'http_req_cnt', 'http_req_rate', 'http_err_cnt', 'http_err_rate',
  'bytes_in_rate', 'bytes_out_rate', 'gpc0', 'gpc1',
]

export default function PersistenceEditor({ section, onUpdate }) {
  const cookie = section.cookie || null
  const stickTable = section.stick_table || null
  const stickRules = section.stick_rules || []

  const setCookie = (updates) => {
    if (updates === null) {
      onUpdate({ ...section, cookie: null })
      return
    }
    const base = cookie || {
      name: 'SERVERID', method: 'insert',
      indirect: false, nocache: false, postonly: false,
      preserve: false, httponly: false, secure: false,
    }
    onUpdate({ ...section, cookie: { ...base, ...updates } })
  }

  const setStickTable = (updates) => {
    if (updates === null) {
      onUpdate({ ...section, stick_table: null })
      return
    }
    const base = stickTable || { type: 'ip', size: '100k', store: [] }
    onUpdate({ ...section, stick_table: { ...base, ...updates } })
  }

  const addStickRule = () => {
    onUpdate({ ...section, stick_rules: [
      ...stickRules,
      { action: 'on', expression: 'src', table: null, condition: null }
    ]})
  }
  const updateStickRule = (i, updates) => {
    const next = stickRules.map((r, idx) => idx === i ? { ...r, ...updates } : r)
    onUpdate({ ...section, stick_rules: next })
  }
  const removeStickRule = (i) => {
    onUpdate({ ...section, stick_rules: stickRules.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Database size={13} className="text-slate-400 dark:text-slate-500 shrink-0"/>
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Persistence</h4>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-slate-600 dark:text-slate-300 font-medium">Cookie</span>
          {cookie
            ? <button onClick={() => setCookie(null)}
                className="text-[11px] text-red-400 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300">remove</button>
            : <button onClick={() => setCookie({})}
                className="btn-sm btn-secondary"><Plus size={11}/> Enable</button>
          }
        </div>

        {cookie && (
          <div className="pl-3 border-l-2 border-purple-200 dark:border-purple-700 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Cookie name</label>
                <input className="input-mono w-full" placeholder="SERVERID"
                  value={cookie.name || ''}
                  onChange={e => setCookie({ name: e.target.value })}/>
              </div>
              <div>
                <label className="label">Method</label>
                <select className="input text-sm w-full"
                  value={cookie.method || 'insert'}
                  onChange={e => setCookie({ method: e.target.value })}>
                  {COOKIE_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">domain</label>
                <input className="input-mono w-full" placeholder=".example.com"
                  value={cookie.domain || ''}
                  onChange={e => setCookie({ domain: e.target.value || null })}/>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ['indirect', 'indirect'], ['nocache', 'nocache'], ['postonly', 'postonly'],
                ['preserve', 'preserve'], ['httponly', 'httponly'], ['secure', 'secure'],
              ].map(([field, label]) => (
                <label key={field}
                  className={`flex items-center gap-1 text-[11px] font-mono cursor-pointer px-2 py-1 rounded border transition-colors
                    ${cookie[field]
                      ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700'
                      : 'bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-400 border-slate-200 dark:border-slate-600'}`}>
                  <input type="checkbox" className="sr-only"
                    checked={!!cookie[field]}
                    onChange={e => setCookie({ [field]: e.target.checked })}/>
                  {label}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">maxidle</label>
                <input className="input-mono w-full" placeholder="1d"
                  value={cookie.maxidle || ''}
                  onChange={e => setCookie({ maxidle: e.target.value || null })}/>
              </div>
              <div>
                <label className="label">maxlife</label>
                <input className="input-mono w-full" placeholder="7d"
                  value={cookie.maxlife || ''}
                  onChange={e => setCookie({ maxlife: e.target.value || null })}/>
              </div>
              <div>
                <label className="label">attr</label>
                <input className="input-mono w-full" placeholder="SameSite=None"
                  value={cookie.attr || ''}
                  onChange={e => setCookie({ attr: e.target.value || null })}/>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-slate-600 dark:text-slate-300 font-medium">Stick table</span>
          {stickTable
            ? <button onClick={() => setStickTable(null)}
                className="text-[11px] text-red-400 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300">remove</button>
            : <button onClick={() => setStickTable({})}
                className="btn-sm btn-secondary"><Plus size={11}/> Enable</button>
          }
        </div>

        {stickTable && (
          <div className="pl-3 border-l-2 border-amber-200 dark:border-amber-700 space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="label">type</label>
                <select className="input text-sm w-full"
                  value={stickTable.type || 'ip'}
                  onChange={e => setStickTable({ type: e.target.value })}>
                  {STICK_TABLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">size</label>
                <input className="input-mono w-full" placeholder="100k"
                  value={stickTable.size || ''}
                  onChange={e => setStickTable({ size: e.target.value })}/>
              </div>
              <div>
                <label className="label">expire</label>
                <input className="input-mono w-full" placeholder="30m"
                  value={stickTable.expire || ''}
                  onChange={e => setStickTable({ expire: e.target.value || null })}/>
              </div>
              <div>
                <label className="label">peers</label>
                <input className="input-mono w-full" placeholder="mypeers"
                  value={stickTable.peers || ''}
                  onChange={e => setStickTable({ peers: e.target.value || null })}/>
              </div>
            </div>
            <div>
              <label className="label">store counters <span className="text-slate-400 font-normal">(comma separated)</span></label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {STICK_TABLE_STORES.map(s => {
                  const active = (stickTable.store || []).some(x => x.startsWith(s))
                  return (
                    <button key={s}
                      className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors
                        ${active
                          ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                          : 'bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'}`}
                      onClick={() => {
                        const cur = stickTable.store || []
                        const next = active ? cur.filter(x => !x.startsWith(s)) : [...cur, s]
                        setStickTable({ store: next })
                      }}>
                      {s}
                    </button>
                  )
                })}
              </div>
              <input className="input-mono w-full text-xs"
                placeholder="conn_cur,conn_rate(3s),http_req_rate(10s)"
                value={(stickTable.store || []).join(',')}
                onChange={e => {
                  const vals = e.target.value ? e.target.value.split(',').map(s => s.trim()) : []
                  setStickTable({ store: vals })
                }}/>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input type="checkbox"
                checked={!!stickTable.nopurge}
                onChange={e => setStickTable({ nopurge: e.target.checked })}/>
              nopurge
            </label>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-slate-600 dark:text-slate-300 font-medium">Stick rules</span>
          <button onClick={addStickRule} className="btn-sm btn-secondary">
            <Plus size={11}/> Add rule
          </button>
        </div>
        {stickRules.length === 0 ? (
          <p className="text-slate-400 dark:text-slate-500 text-xs font-mono italic py-2.5 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-lg bg-surface/60 dark:bg-slate-800/40">
            No stick rules
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800">
            <table className="w-full text-sm font-mono">
              <thead className="bg-slate-50 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-600">
                <tr>
                  <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-semibold text-[11px] w-36">action</th>
                  <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-semibold text-[11px]">expression</th>
                  <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-semibold text-[11px] w-32">table</th>
                  <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-semibold text-[11px] w-40">condition</th>
                  <th className="w-8"/>
                </tr>
              </thead>
              <tbody>
                {stickRules.map((rule, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50/70 dark:hover:bg-slate-700/30 group">
                    <td className="py-1.5 px-2">
                      <div className="flex items-center gap-1">
                        <select className="input text-xs py-1 flex-1"
                          value={rule.action}
                          onChange={e => updateStickRule(i, { action: e.target.value })}>
                          {STICK_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                        <InfoButton explanation={STICK_ACTION_EXPLANATIONS[rule.action]}/>
                      </div>
                    </td>
                    <td className="py-1.5 px-2">
                      <input className="input-mono py-1 w-full" placeholder="src"
                        value={rule.expression || ''}
                        onChange={e => updateStickRule(i, { expression: e.target.value })}/>
                    </td>
                    <td className="py-1.5 px-2">
                      <input className="input-mono py-1 w-full" placeholder="optional"
                        value={rule.table || ''}
                        onChange={e => updateStickRule(i, { table: e.target.value || null })}/>
                    </td>
                    <td className="py-1.5 px-2">
                      <input className="input-mono py-1 w-full" placeholder="if is_post"
                        value={rule.condition || ''}
                        onChange={e => updateStickRule(i, { condition: e.target.value || null })}/>
                    </td>
                    <td className="py-1.5 px-1">
                      <button onClick={() => removeStickRule(i)}
                        className="opacity-0 group-hover:opacity-100 btn-icon text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
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
    </div>
  )
}
