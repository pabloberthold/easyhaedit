import { useState } from 'react'
import { Plus, Trash2, Activity } from 'lucide-react'

const CHECK_TYPES = [
  { value: 'none',      label: '— none —' },
  { value: 'httpchk',   label: 'HTTP check' },
  { value: 'tcp',       label: 'TCP check' },
  { value: 'ssl',       label: 'SSL hello check' },
  { value: 'redis',     label: 'Redis check' },
  { value: 'pgsql',     label: 'PostgreSQL check' },
  { value: 'mysql',     label: 'MySQL check' },
  { value: 'smtp',      label: 'SMTP check' },
]

function detectType(hc) {
  if (!hc) return 'none'
  if (hc.option_httpchk    !== null && hc.option_httpchk    !== undefined) return 'httpchk'
  if (hc.option_tcp_check)        return 'tcp'
  if (hc.option_ssl_hello_chk)    return 'ssl'
  if (hc.option_redis_check)      return 'redis'
  if (hc.option_pgsql_check)      return 'pgsql'
  if (hc.option_mysql_check !== null && hc.option_mysql_check !== undefined) return 'mysql'
  if (hc.option_smtpchk    !== null && hc.option_smtpchk    !== undefined) return 'smtp'
  return 'none'
}

function emptyHC() {
  return {
    option_httpchk: null, http_check_expect: null,
    http_check_send: null, http_check_connect: null,
    option_smtpchk: null, option_mysql_check: null,
    option_pgsql_check: false, option_redis_check: false,
    option_ssl_hello_chk: false, option_tcp_check: false,
    tcp_check_rules: [],
  }
}

export default function HealthCheckEditor({ healthCheck, onChange }) {
  const hc = healthCheck || emptyHC()
  const [tcpRule, setTcpRule] = useState('')

  const type = detectType(hc)

  const setType = (newType) => {
    const base = emptyHC()
    switch (newType) {
      case 'httpchk': onChange({ ...base, option_httpchk: '' }); break
      case 'tcp':     onChange({ ...base, option_tcp_check: true }); break
      case 'ssl':     onChange({ ...base, option_ssl_hello_chk: true }); break
      case 'redis':   onChange({ ...base, option_redis_check: true }); break
      case 'pgsql':   onChange({ ...base, option_pgsql_check: true }); break
      case 'mysql':   onChange({ ...base, option_mysql_check: '' }); break
      case 'smtp':    onChange({ ...base, option_smtpchk: '' }); break
      default:        onChange(base)
    }
  }

  const set = (field, value) => onChange({ ...hc, [field]: value })

  const addTcpRule = () => {
    if (!tcpRule.trim()) return
    set('tcp_check_rules', [...(hc.tcp_check_rules || []), tcpRule.trim()])
    setTcpRule('')
  }

  const removeTcpRule = (idx) => {
    set('tcp_check_rules', (hc.tcp_check_rules || []).filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Activity size={13} className="text-slate-400 shrink-0"/>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Health Check</h4>
      </div>

      <div>
        <label className="label">Check type</label>
        <select className="input text-sm w-full max-w-xs"
          value={type}
          onChange={e => setType(e.target.value)}>
          {CHECK_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {type === 'httpchk' && (
        <div className="space-y-3 pl-3 border-l-2 border-blue-200">
          <div>
            <label className="label">
              option httpchk
              <span className="ml-2 text-slate-400 font-normal normal-case">method + URI + version</span>
            </label>
            <input className="input-mono w-full"
              placeholder="GET /health HTTP/1.1\r\nHost: app.local"
              value={hc.option_httpchk ?? ''}
              onChange={e => set('option_httpchk', e.target.value)}/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">http-check expect</label>
              <input className="input-mono w-full" placeholder="status 200"
                value={hc.http_check_expect ?? ''}
                onChange={e => set('http_check_expect', e.target.value || null)}/>
            </div>
            <div>
              <label className="label">http-check send</label>
              <input className="input-mono w-full" placeholder="meth GET uri /ping"
                value={hc.http_check_send ?? ''}
                onChange={e => set('http_check_send', e.target.value || null)}/>
            </div>
            <div className="col-span-2">
              <label className="label">http-check connect</label>
              <input className="input-mono w-full" placeholder="port 443 ssl"
                value={hc.http_check_connect ?? ''}
                onChange={e => set('http_check_connect', e.target.value || null)}/>
            </div>
          </div>
        </div>
      )}

      {type === 'tcp' && (
        <div className="space-y-2 pl-3 border-l-2 border-blue-200">
          <label className="label">tcp-check rules</label>
          {(hc.tcp_check_rules || []).length === 0 ? (
            <p className="text-slate-400 text-xs font-mono italic py-2 text-center border border-dashed border-slate-200 rounded-lg">
              No tcp-check rules
            </p>
          ) : (
            <div className="space-y-1">
              {(hc.tcp_check_rules || []).map((rule, i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <code className="flex-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700">
                    tcp-check {rule}
                  </code>
                  <button onClick={() => removeTcpRule(i)}
                    className="opacity-0 group-hover:opacity-100 btn-icon text-red-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 size={12}/>
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input className="input-mono py-1 flex-1"
              placeholder="connect  /  send …  /  expect string …"
              value={tcpRule}
              onChange={e => setTcpRule(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTcpRule() } }}
            />
            <button onClick={addTcpRule} className="btn-sm btn-secondary">
              <Plus size={11}/> Add
            </button>
          </div>
        </div>
      )}

      {type === 'mysql' && (
        <div className="pl-3 border-l-2 border-blue-200">
          <label className="label">option mysql-check params</label>
          <input className="input-mono w-full" placeholder="user haproxy"
            value={hc.option_mysql_check ?? ''}
            onChange={e => set('option_mysql_check', e.target.value)}/>
        </div>
      )}

      {type === 'smtp' && (
        <div className="pl-3 border-l-2 border-blue-200">
          <label className="label">option smtpchk params</label>
          <input className="input-mono w-full" placeholder="EHLO haproxy.local"
            value={hc.option_smtpchk ?? ''}
            onChange={e => set('option_smtpchk', e.target.value)}/>
        </div>
      )}

      {['ssl', 'redis', 'pgsql'].includes(type) && (
        <p className="text-[11px] text-slate-400 pl-3 border-l-2 border-blue-200 py-1 font-mono">
          option {type === 'ssl' ? 'ssl-hello-chk' : type + '-check'} — no additional params
        </p>
      )}
    </div>
  )
}
