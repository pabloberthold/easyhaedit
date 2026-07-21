import { useState, memo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, Save, ChevronDown } from 'lucide-react'
import { getAclExplanation } from '../lib/haproxy-explanations.js'
import InfoButton from './InfoButton'

const ACL_OPTIONS = [
  { group: 'URL / Path',      label: 'path_beg — comienza con',           value: 'path_beg' },
  { group: 'URL / Path',      label: 'path_end — termina con',            value: 'path_end' },
  { group: 'URL / Path',      label: 'path_reg — regex',                  value: 'path_reg' },
  { group: 'URL / Path',      label: 'path_dir — directorio exacto',      value: 'path_dir' },
  { group: 'URL / Path',      label: 'path_len — longitud',               value: 'path_len' },
  { group: 'URL / Path',      label: 'path — path completo exacto',       value: 'path' },
  { group: 'Host / SNI',      label: 'hdr(host) — header Host exacto',    value: 'hdr(host)' },
  { group: 'Host / SNI',      label: 'hdr_beg(host) — Host comienza con', value: 'hdr_beg(host)' },
  { group: 'Host / SNI',      label: 'hdr_end(host) — Host termina con',  value: 'hdr_end(host)' },
  { group: 'Host / SNI',      label: 'hdr_reg(host) — Host regex',        value: 'hdr_reg(host)' },
  { group: 'Host / SNI',      label: 'req.ssl_sni — SNI TLS',             value: 'req.ssl_sni' },
  { group: 'Headers',         label: 'hdr — header exacto',               value: 'hdr' },
  { group: 'Headers',         label: 'hdr_beg — header comienza con',     value: 'hdr_beg' },
  { group: 'Headers',         label: 'hdr_end — header termina con',      value: 'hdr_end' },
  { group: 'Headers',         label: 'hdr_reg — header regex',            value: 'hdr_reg' },
  { group: 'Headers',         label: 'hdr_cnt — cantidad de headers',     value: 'hdr_cnt' },
  { group: 'Headers',         label: 'hdr_val — header numérico',         value: 'hdr_val' },
  { group: 'Request',         label: 'method — método HTTP',              value: 'method' },
  { group: 'Request',         label: 'url_param — query string param',    value: 'url_param' },
  { group: 'Request',         label: 'query — query string completa',     value: 'query' },
  { group: 'IP / Red',        label: 'src — IP origen exacta/CIDR',       value: 'src' },
  { group: 'IP / Red',        label: 'dst — IP destino exacta/CIDR',      value: 'dst' },
  { group: 'IP / Red',        label: 'src_port — puerto origen',          value: 'src_port' },
  { group: 'IP / Red',        label: 'dst_port — puerto destino',         value: 'dst_port' },
  { group: 'TLS / SSL',       label: 'ssl_fc — conexión TLS frontend',    value: 'ssl_fc' },
  { group: 'TLS / SSL',       label: 'ssl_fc_has_crt — cliente cert',     value: 'ssl_fc_has_crt' },
  { group: 'TLS / SSL',       label: 'ssl_fc_protocol — protocolo TLS',   value: 'ssl_fc_protocol' },
  { group: 'TLS / SSL',       label: 'ssl_fc_cipher — cipher TLS',        value: 'ssl_fc_cipher' },
  { group: 'Cookies',         label: 'cook — cookie exacta',              value: 'cook' },
  { group: 'Cookies',         label: 'cook_beg — cookie comienza con',    value: 'cook_beg' },
  { group: 'Cookies',         label: 'cook_reg — cookie regex',           value: 'cook_reg' },
  { group: 'Cookies',         label: 'cook_cnt — cantidad de cookies',    value: 'cook_cnt' },
  { group: 'Variables',       label: 'var — variable de sesión',          value: 'var' },
  { group: 'Variables',       label: 'env — variable de entorno',         value: 'env' },
  { group: 'Estados',         label: 'nbsrv — cantidad servidores up',    value: 'nbsrv' },
  { group: 'Estados',         label: 'always_true — siempre verdadero',   value: 'always_true' },
  { group: 'Estados',         label: 'always_false — siempre falso',      value: 'always_false' },
  { group: 'TCP / Layer 4',   label: 'req.len — longitud payload TCP',    value: 'req.len' },
  { group: 'TCP / Layer 4',   label: 'req.payload — payload TCP',         value: 'req.payload' },
  { group: 'TCP / Layer 4',   label: 'tcp-request content', value: 'tcp-request content' },
  { group: 'Otro',            label: 'Criterio libre…',                   value: '__custom__' },
]

const ACL_GROUPS = ACL_OPTIONS.reduce((acc, o) => {
  if (!acc[o.group]) acc[o.group] = []
  acc[o.group].push(o)
  return acc
}, {})

function parseCriterion(criterion = '') {
  const str = criterion.trim()
  if (!str) return { option: '', value: '' }
  const known = ACL_OPTIONS.filter(o => o.value !== '__custom__').sort((a, b) => b.value.length - a.value.length)
  for (const opt of known) {
    if (str === opt.value) return { option: opt.value, value: '' }
    if (str.startsWith(opt.value + ' ')) return { option: opt.value, value: str.slice(opt.value.length + 1) }
  }
  const parts = str.split(/\s+/)
  return { option: '__custom__', value: str }
}

function buildCriterion(option, value) {
  if (!option || option === '__custom__') return value.trim()
  const v = value.trim()
  return v ? `${option} ${v}` : option
}

function OptionDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)
  const portalRef = useRef(null)
  const [pos, setPos] = useState(null)

  const selectedOpt = ACL_OPTIONS.find(o => o.value === value)
  const displayLabel = selectedOpt && value !== '__custom__'
    ? selectedOpt.value
    : value === '__custom__' ? 'Libre…' : '— opción —'

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && ref.current.contains(e.target)) return
      if (portalRef.current && portalRef.current.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) { setPos(null); return }
    const update = () => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left + rect.width / 2, width: Math.max(280, rect.width) })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  const searchLower = search.toLowerCase()
  const filtered = search
    ? ACL_OPTIONS.filter(o => o.label.toLowerCase().includes(searchLower) || o.value.toLowerCase().includes(searchLower))
    : null

  const select = (val) => { onChange(val); setOpen(false); setSearch('') }

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        className="input-mono py-1 w-full flex items-center justify-between gap-1 cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}
      >
        <span className={`truncate ${!value ? 'text-slate-400' : ''}`}>{displayLabel}</span>
        <ChevronDown size={11} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}/>
      </button>

      {open && pos && createPortal(
        <div ref={portalRef}
          className="fixed z-[90] bg-surface dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl"
          style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: 320, overflowY: 'auto', transform: 'translateX(-50%)' }}
        >
          <div className="sticky top-0 bg-surface dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-2 py-1.5">
            <input
              autoFocus
              className="input text-xs py-1"
              placeholder="Buscar opción…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setOpen(false)}
            />
          </div>

          <div className="py-1">
            {filtered ? (
              filtered.length === 0
                ? <div className="px-3 py-2 text-xs text-slate-400 italic">Sin resultados</div>
                : filtered.map(opt => (
                    <OptionRow key={opt.value} opt={opt} selected={value === opt.value} onSelect={select}/>
                  ))
            ) : (
              Object.entries(ACL_GROUPS).map(([group, opts]) => (
                <div key={group}>
                  <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-700/50">
                    {group}
                  </div>
                  {opts.map(opt => (
                    <OptionRow key={opt.value} opt={opt} selected={value === opt.value} onSelect={select}/>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function OptionRow({ opt, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors flex items-center gap-2 ${selected ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-300'}`}
      onClick={() => onSelect(opt.value)}
    >
      <span className="font-semibold shrink-0" style={{ minWidth: 120 }}>{opt.value}</span>
      <span className="text-slate-400 dark:text-slate-500 text-[10px] truncate">
        {opt.label.includes('—') ? opt.label.split('—')[1].trim() : ''}
      </span>
      {selected && <span className="ml-auto text-brand-500">✓</span>}
    </button>
  )
}

function ACLEditor({ acls = [], onChange, sectionLabel = '' }) {
  const [rows, setRows] = useState(() =>
    acls.map((a, i) => {
      const { option, value } = parseCriterion(a.criterion)
      return { _id: i, name: a.name, option, value }
    })
  )
  const [nextId, setNextId] = useState(acls.length)
  const [dirty, setDirty] = useState(false)

  const update = (id, field, val) => {
    setRows(r => r.map(row => row._id === id ? { ...row, [field]: val } : row))
    setDirty(true)
  }

  const addRow = () => {
    setRows(r => [...r, { _id: nextId, name: '', option: '', value: '' }])
    setNextId(n => n + 1)
    setDirty(true)
  }

  const removeRow = (id) => { setRows(r => r.filter(row => row._id !== id)); setDirty(true) }

  const save = () => {
    onChange(
      rows
        .filter(r => r.name.trim())
        .map(({ _id, name, option, value }) => ({
          name: name.trim(),
          criterion: buildCriterion(option, value),
        }))
    )
    setDirty(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ACL Rules</h4>
        <div className="flex gap-2">
          {dirty && (
            <button onClick={save} className="btn-sm bg-brand-600 text-white hover:bg-brand-700">
              <Save size={11}/> Apply
            </button>
          )}
          <button onClick={addRow} className="btn-sm btn-secondary">
            <Plus size={11}/> Add ACL
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-slate-400 dark:text-slate-500 text-xs font-mono italic py-3 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-lg bg-surface/60 dark:bg-slate-800/40">
          No ACL rules
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface dark:bg-slate-800 dark:border-slate-700">
          <table className="w-full text-sm font-mono">
            <thead className="bg-slate-50 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-600">
              <tr>
                <th className="text-left py-2 px-3 text-slate-500 font-semibold text-[11px] w-[22%]">Nombre ACL</th>
                <th className="text-left py-2 px-3 text-slate-500 font-semibold text-[11px] w-[32%]">
                  Opción
                  <span className="ml-1 text-[10px] font-normal text-slate-400 normal-case tracking-normal">(fetch method)</span>
                </th>
                <th className="text-left py-2 px-3 text-slate-500 font-semibold text-[11px]">Criterio / Valor</th>
                <th className="w-8"/>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row._id} className="border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50/70 dark:hover:bg-slate-700/30 group">
                  <td className="py-1.5 px-2">
                    <input
                      className="input-mono py-1"
                      value={row.name}
                      onChange={e => update(row._id, 'name', e.target.value)}
                      placeholder="is_api"
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <OptionDropdown
                      value={row.option}
                      onChange={val => update(row._id, 'option', val)}
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <div className="flex items-center gap-1">
                      {row.option === '__custom__' ? (
                        <input
                          className="input-mono py-1 flex-1"
                          value={row.value}
                          onChange={e => update(row._id, 'value', e.target.value)}
                          placeholder="path_beg /api /health"
                        />
                      ) : (
                        <input
                          className="input-mono py-1 flex-1"
                          value={row.value}
                          onChange={e => update(row._id, 'value', e.target.value)}
                          placeholder={
                            row.option === 'src' ? '10.0.0.0/8' :
                            row.option === 'method' ? 'GET POST' :
                            row.option === 'hdr(host)' ? 'api.ejemplo.com' :
                            row.option.startsWith('path') ? '/api /health' :
                            row.option === 'always_true' || row.option === 'always_false' ? '(sin valor)' :
                            'valor…'
                          }
                          disabled={row.option === 'always_true' || row.option === 'always_false'}
                        />
                      )}
                      <InfoButton explanation={getAclExplanation(row.option)}/>
                    </div>
                  </td>
                  <td className="py-1.5 px-1">
                    <button
                      onClick={() => removeRow(row._id)}
                      className="opacity-0 group-hover:opacity-100 btn-icon text-red-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={12}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {rows.some(r => r.name.trim() || r.option) && (
            <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Preview cfg</div>
              <div className="space-y-0.5">
                {rows.filter(r => r.name.trim()).map(r => (
                  <div key={r._id} className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                    <span className="text-slate-400">acl </span>
                    <span className="text-blue-600 dark:text-blue-400">{r.name || '?'}</span>
                    <span className="text-slate-400"> </span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {buildCriterion(r.option, r.value) || <em className="text-slate-300">sin criterio</em>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default memo(ACLEditor, (prev, next) =>
  JSON.stringify(prev.acls) === JSON.stringify(next.acls) &&
  prev.sectionLabel === next.sectionLabel &&
  prev.onChange === next.onChange
)
