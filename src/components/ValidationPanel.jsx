import { CheckCircle2, XCircle, Terminal, AlertTriangle } from 'lucide-react'

export default function ValidationPanel({ result, loading }) {
  if (loading) return (
    <div className="card p-4 flex items-center gap-3 text-slate-400">
      <Terminal size={16} className="text-brand-500 animate-pulse"/>
      <span className="text-sm font-mono">Validating configuration…</span>
    </div>
  )
  if (!result) return null

  return (
    <div className={`card p-5 border-l-4 ${result.valid ? 'border-l-emerald-500' : 'border-l-red-400'}`}>
      <div className="flex items-center gap-2 mb-3">
        {result.valid
          ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0"/>
          : <XCircle size={16} className="text-red-500 shrink-0"/>}
        <span className={`text-sm font-semibold ${result.valid ? 'text-emerald-700' : 'text-red-600'}`}>
          {result.message}
        </span>
      </div>

      {result.errors?.length > 0 && (
        <div className="space-y-1 mb-3">
          {result.errors.map((err, i) => (
            <div key={i} className="flex items-start gap-2 text-xs font-mono text-red-600 bg-red-50 px-2 py-1 rounded">
              <AlertTriangle size={11} className="shrink-0 mt-0.5"/>
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}

      {result.issues?.length > 0 && !result.errors && (
        <div className="space-y-1">
          {result.issues.map((iss, i) => (
            <div key={i} className={`flex items-start gap-2 text-xs font-mono px-2 py-1 rounded ${
              iss.severity === 'error' ? 'text-red-600 bg-red-50' : 'text-amber-700 bg-amber-50'
            }`}>
              <AlertTriangle size={11} className="shrink-0 mt-0.5"/>
              <span>Line {iss.line}: {iss.message}</span>
            </div>
          ))}
        </div>
      )}

      {result.raw_output && (
        <details className="mt-2">
          <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 select-none font-mono">
            Raw output
          </summary>
          <pre className="mt-2 text-xs font-mono bg-slate-100 border border-slate-200 p-3 rounded-lg overflow-x-auto text-slate-600 whitespace-pre-wrap">
            {result.raw_output}
          </pre>
        </details>
      )}
    </div>
  )
}
