export function stripComment(line) {
  let inQ = false, prev = ''
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if ((ch === '"' || ch === "'") && prev !== '\\') inQ = !inQ
    if (ch === '#' && !inQ) return line.slice(0, i).trimEnd()
    prev = ch
  }
  return line.trimEnd()
}

export function kv(line) {
  const idx = line.indexOf(' ')
  return idx === -1 ? [line, ''] : [line.slice(0, idx), line.slice(idx + 1).trim()]
}

export function kvLower(line) {
  const idx = line.indexOf(' ')
  const k = idx === -1 ? line : line.slice(0, idx)
  const v = idx === -1 ? '' : line.slice(idx + 1).trim()
  return [k.toLowerCase(), v]
}

export function splitSections(text, sectionRe) {
  const result = []
  let curType = null, curName = '', curLines = []
  for (const raw of text.split('\n')) {
    const line = stripComment(raw)
    const trimmed = line.trim()
    if (!trimmed) continue
    const m = trimmed.match(sectionRe)
    if (m) {
      if (curType !== null) result.push([curType, curName, curLines])
      curType = m[1]
      curName = (m[2] || '').trim()
      curLines = []
    } else if (curType !== null) {
      curLines.push(trimmed)
    }
  }
  if (curType !== null) result.push([curType, curName, curLines])
  return result
}

export function parseIntOr(val, fallback) {
  const n = parseInt(val)
  return isNaN(n) ? fallback : n
}
