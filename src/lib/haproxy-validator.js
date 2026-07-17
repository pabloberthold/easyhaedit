export function validateConfigText(text) {
  const issues = []
  const lines = text.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('global') ||
        trimmed.startsWith('defaults') || trimmed.startsWith('frontend') ||
        trimmed.startsWith('backend') || trimmed.startsWith('listen') ||
        trimmed.startsWith('resolvers') || trimmed.startsWith('peers') ||
        trimmed.startsWith('userlist') || trimmed.startsWith('program')) {
      continue
    }
    if (/^server\s/.test(trimmed)) {
      const parts = trimmed.split(/\s+/)
      if (parts.length < 3) issues.push({ line: i + 1, severity: 'error', message: 'Server directive missing address:port' })
      else if (!parts[2].includes(':')) issues.push({ line: i + 1, severity: 'error', message: `Server '${parts[1]}' missing port in address` })
    }
    if (/^bind\s/.test(trimmed)) {
      const bindVal = trimmed.slice(5).trim()
      if (!bindVal) issues.push({ line: i + 1, severity: 'error', message: 'Bind directive missing address:port' })
    }
    if (/^default_backend\s/.test(trimmed) && !trimmed.match(/^default_backend\s+\S+/)) {
      issues.push({ line: i + 1, severity: 'warning', message: 'default_backend has no value' })
    }
    if (/^balance\s/.test(trimmed)) {
      const val = trimmed.slice(8).trim()
      const valid = ['roundrobin', 'leastconn', 'source', 'random', 'uri', 'hdr', 'rdp-cookie', 'first', 'static-rr']
      if (val && !valid.includes(val) && !val.startsWith('uri ') && !val.startsWith('hdr(')) {
        issues.push({ line: i + 1, severity: 'warning', message: `Unknown balance algorithm '${val}'` })
      }
    }
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    message: issues.length ? `${issues.length} issue(s) found` : 'No issues detected',
    issues,
  }
}
