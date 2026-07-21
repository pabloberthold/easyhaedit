const TIMEOUTS = [
  { field: 'connect',        label: 'connect',         hint: '5s',   scope: 'all' },
  { field: 'client',         label: 'client',          hint: '30s',  scope: 'frontend' },
  { field: 'client_fin',     label: 'client-fin',      hint: '10s',  scope: 'frontend' },
  { field: 'server',         label: 'server',          hint: '30s',  scope: 'backend' },
  { field: 'server_fin',     label: 'server-fin',      hint: '10s',  scope: 'backend' },
  { field: 'http_request',   label: 'http-request',    hint: '10s',  scope: 'http' },
  { field: 'http_keep_alive',label: 'http-keep-alive', hint: '2s',   scope: 'http' },
  { field: 'tunnel',         label: 'tunnel',          hint: '1h',   scope: 'all' },
  { field: 'check',          label: 'check',           hint: '2s',   scope: 'backend' },
  { field: 'queue',          label: 'queue',           hint: '5s',   scope: 'backend' },
]

export default function TimeoutsEditor({ timeouts = {}, onChange, mode = 'http', sectionType = 'all' }) {
  const set = (field, value) => onChange({ ...timeouts, [field]: value || null })

  const relevantTimeouts = TIMEOUTS.filter(t => {
    if (t.scope === 'all') return true
    if (t.scope === 'frontend' && (sectionType === 'frontend' || sectionType === 'listen' || sectionType === 'defaults')) return true
    if (t.scope === 'backend'  && (sectionType === 'backend'  || sectionType === 'listen' || sectionType === 'defaults')) return true
    if (t.scope === 'http' && mode === 'http') return true
    return false
  })

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Timeouts</h4>
      <div className="grid grid-cols-3 gap-3">
        {relevantTimeouts.map(({ field, label, hint }) => (
          <div key={field}>
            <label className="label font-mono">{label}</label>
            <div className="relative">
              <input
                className="input-mono w-full pr-8"
                placeholder={hint}
                value={timeouts[field] || ''}
                onChange={e => set(field, e.target.value)}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-300 dark:text-slate-500 pointer-events-none">
                e.g. {hint}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
