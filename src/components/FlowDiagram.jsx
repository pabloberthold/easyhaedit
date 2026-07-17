import { useEffect, useRef, useState, useCallback } from 'react'
import { ZoomIn, ZoomOut, RotateCcw, Search, Workflow, X } from 'lucide-react'

const TEAL   = { fill: '#059669', stroke: '#a7f3d0', text: '#ffffff' }
const PURPLE = { fill: '#7c3aed', stroke: '#ddd6fe', text: '#ffffff' }
const CORAL  = { fill: '#ea580c', stroke: '#fed7aa', text: '#ffffff' }
const BLUE   = { fill: '#2563eb', stroke: '#bfdbfe', text: '#ffffff' }
const GRAY   = { fill: '#64748b', stroke: '#e2e8f0', text: '#ffffff' }

const ZOOM_STEPS = [0.4, 0.5, 0.65, 0.8, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0]
const ZOOM_DEFAULT_IDX = 4
const BE_FILTER_THRESHOLD = 8
const TOOLTIP_DELAY_MS = 2000

const REAL_IP_RE = /^(?!0\.0\.0\.0$)(?!127\.)(?!\*$)(?!::$)\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/

function svgEl(tag, attrs, parent) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (parent) parent.appendChild(el)
  return el
}

function fitText(text, maxWidth, fontSize) {
  if (!text) return { text: '', attrs: {} }
  const estimated = text.length * fontSize * 0.6
  if (estimated <= maxWidth) return { text, attrs: {} }
  const maxChars = Math.floor(maxWidth / (fontSize * 0.6)) - 1
  if (estimated > maxWidth * 1.5 || text.length > maxChars + 2) {
    return { text: text.slice(0, Math.max(1, maxChars)) + '\u2026', attrs: {} }
  }
  return { text, attrs: { textLength: maxWidth, lengthAdjust: 'spacingAndGlyphs' } }
}

function makeNode(parent, x, y, w, h, label, sublabel, color, rx = 10, scale = 1, thirdLine = null, rawLine = null) {
  const g = svgEl('g', { style: 'cursor:default' }, parent)
  if (rawLine) g.setAttribute('data-raw', rawLine)
  svgEl('rect', { x, y, width: w, height: h, rx, fill: color.fill, stroke: color.stroke, 'stroke-width': '1.5' }, g)

  const FONT = 'IBM Plex Sans, sans-serif'
  const MONO = 'IBM Plex Mono, monospace'
  const mainSize = Math.max(9, Math.min(16, Math.round(13 * scale)))
  const subSize  = Math.max(7, Math.min(13, Math.round(10 * scale)))
  const maxW = w - 16

  if (thirdLine) {
    const [f1, f2, f3] = [fitText(label, maxW, mainSize), fitText(sublabel || '', maxW, subSize), fitText(thirdLine, maxW, subSize - 1)]
    const cx = x + w / 2
    svgEl('text', { x: cx, y: y + h/2 - 16, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: color.text, 'font-size': mainSize, 'font-weight': '500', 'font-family': FONT, ...f1.attrs }, g).textContent = f1.text
    svgEl('text', { x: cx, y: y + h/2,      'text-anchor': 'middle', 'dominant-baseline': 'central', fill: color.text, 'font-size': subSize,  'font-family': MONO, opacity: '0.85', ...f2.attrs }, g).textContent = f2.text
    svgEl('text', { x: cx, y: y + h/2 + 13, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: 'rgba(255,255,255,0.75)', 'font-size': subSize - 1, 'font-family': MONO, ...f3.attrs }, g).textContent = f3.text
  } else if (sublabel) {
    const [f1, f2] = [fitText(label, maxW, mainSize), fitText(sublabel, maxW, subSize)]
    const cx = x + w / 2
    svgEl('text', { x: cx, y: y + h/2 - 8, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: color.text, 'font-size': mainSize, 'font-weight': '500', 'font-family': FONT, ...f1.attrs }, g).textContent = f1.text
    svgEl('text', { x: cx, y: y + h/2 + 9, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: color.text, 'font-size': subSize,  'font-family': MONO, opacity: '0.85', ...f2.attrs }, g).textContent = f2.text
  } else {
    const f1 = fitText(label, maxW, mainSize)
    svgEl('text', { x: x + w/2, y: y + h/2, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: color.text, 'font-size': mainSize, 'font-weight': '500', 'font-family': FONT, ...f1.attrs }, g).textContent = f1.text
  }
  return g
}

function makeCurve(parent, x1, y1, x2, y2, strokeColor, dashed = false, label = null, scale = 1) {
  svgEl('path', {
    d: `M${x1} ${y1} C${x1+50} ${y1} ${x2-50} ${y2} ${x2} ${y2}`,
    fill: 'none', stroke: strokeColor, 'stroke-width': '1.5',
    'marker-end': 'url(#harrow)',
    ...(dashed ? { 'stroke-dasharray': '5 3' } : {})
  }, parent)
  if (label) {
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2 - 6
    const labelSize = Math.max(7, Math.min(11, Math.round(9 * scale)))
    const cw = label.length * (labelSize * 0.65) + 8
    svgEl('rect', { x: mx - cw/2, y: my - 8, width: cw, height: 14, rx: 3, fill: '#f1f5f9', opacity: '0.88' }, parent)
    svgEl('text', { x: mx, y: my, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: '#475569', 'font-size': labelSize, 'font-family': 'IBM Plex Mono, monospace' }, parent).textContent = label
  }
}

function sectionLabel(parent, x, y, text, scale = 1) {
  const sz = Math.max(8, Math.min(13, Math.round(10 * scale)))
  svgEl('text', { x, y, 'text-anchor': 'middle', fill: '#94a3b8', 'font-size': sz, 'font-family': 'IBM Plex Sans, sans-serif', 'letter-spacing': '0.06em' }, parent).textContent = text.toUpperCase()
}

function extractIP(bindStr) {
  if (!bindStr) return null
  const match = bindStr.match(/^([^\s:]+):/)
  if (!match) return null
  return REAL_IP_RE.test(match[1]) ? match[1] : null
}

function rawForFrontend(fe) {
  const binds = (fe.bind || []).map(b => `    bind ${b}`).join('\n')
  const mode  = fe.mode ? `    mode ${fe.mode}` : ''
  return [`frontend ${fe.name}`, binds, mode].filter(Boolean).join('\n')
}
function rawForAclRoute(node, aclDefs) {
  const lines = []
  node.aclNames.forEach(n => {
    if (aclDefs[n]) lines.push(`    acl ${n} ${aclDefs[n]}`)
  })
  if (node.kind === 'route' && node.backend) {
    lines.push(`    use_backend ${node.backend}${node.condition ? ' ' + node.condition : ''}`)
  }
  return lines.join('\n') || node.label
}
function rawForBackend(be) {
  const lines = [`backend ${be.name}`]
  if (be.balance) lines.push(`    balance ${be.balance}`)
  if (be.mode)    lines.push(`    mode ${be.mode}`)
  return lines.join('\n')
}
function rawForServer(srv) {
  const parts = [`    server ${srv.name} ${srv.address}:${srv.port}`]
  if (srv.weight != null)  parts.push(`weight ${srv.weight}`)
  if (srv.maxconn != null) parts.push(`maxconn ${srv.maxconn}`)
  if (srv.check)           parts.push('check')
  if (srv.check_inter)     parts.push(`inter ${srv.check_inter}`)
  if (srv.ssl)             parts.push('ssl')
  if (srv.verify)          parts.push(`verify ${srv.verify}`)
  if (srv.backup)          parts.push('backup')
  if (srv.disabled)        parts.push('disabled')
  if (srv.extra_params?.length) parts.push(srv.extra_params.join(' '))
  return parts.join(' ')
}

function parseConditionAclNames(cond) {
  if (!cond) return []
  return cond
    .replace(/^\s*(if|unless)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .map(t => t.replace(/^!/, ''))
    .filter(t => t.length > 0)
}

function drawFlow(svgRoot, config, frontendIdx, filteredBEs, filteredSrvs, scale = 1) {
  const g = svgRoot
  while (g.firstChild) g.removeChild(g.firstChild)

  const fe = config.frontends?.[frontendIdx]
  if (!fe) return

  const beMap = {}
  ;(config.backends || []).forEach(b => { beMap[b.name] = b })
  ;(config.listens  || []).forEach(b => { beMap[b.name] = b })

  const allReferencedBEs = []
  ;(fe.use_backends || []).forEach(ub => {
    if (ub.backend && !allReferencedBEs.includes(ub.backend)) allReferencedBEs.push(ub.backend)
  })
  if (fe.default_backend?.backend && !allReferencedBEs.includes(fe.default_backend.backend)) {
    allReferencedBEs.push(fe.default_backend.backend)
  }

  const referencedBEs = filteredBEs !== null
    ? allReferencedBEs.filter(n => filteredBEs.includes(n))
    : allReferencedBEs

  const aclDefs = {}
  ;(fe.acls || []).forEach(a => { aclDefs[a.name] = a.criterion || '' })

  const visibleBESet = new Set(referencedBEs)
  const routes = (fe.use_backends || [])
    .filter(ub => filteredBEs === null || visibleBESet.has(ub.backend))
    .map(ub => ({
      kind: 'route',
      backend: ub.backend,
      condition: ub.condition || '',
      aclNames: parseConditionAclNames(ub.condition),
      label: ub.condition ? ub.condition.replace(/^\s*(if|unless)\s+/i, '').trim() : ub.backend || '',
      sublabel: aclDefs[parseConditionAclNames(ub.condition)[0]] || ub.condition || '',
    }))

  const routeAclNames = new Set(routes.flatMap(r => r.aclNames))
  const orphanNodes = filteredBEs !== null ? [] : Object.keys(aclDefs)
    .filter(name => !routeAclNames.has(name))
    .map(name => ({
      kind: 'orphan', backend: null, condition: '', aclNames: [name],
      label: name, sublabel: aclDefs[name] || '',
    }))

  const allAclNodes = [...routes, ...orphanNodes]
  const hasACLs = allAclNodes.length > 0 || fe.default_backend != null

  const ACL_H = 40, ACL_GAP = 12
  const BE_H  = 44, BE_GAP  = 16
  const SRV_H = 26, SRV_GAP = 8
  const TOP_PAD = 50, BOT_PAD = 30

  const srvTrimmed = filteredSrvs?.trim().toLowerCase() || ''
  const beVisibleServers = {}
  referencedBEs.forEach(name => {
    const be = beMap[name]
    const all = be?.servers || []
    beVisibleServers[name] = srvTrimmed
      ? all.filter(s => s.name.toLowerCase().includes(srvTrimmed) || (`${s.address}:${s.port}`).toLowerCase().includes(srvTrimmed))
      : all
  })
  const beServerRows = {}
  referencedBEs.forEach(name => {
    beServerRows[name] = Math.max(1, beVisibleServers[name].length)
  })

  const visibleDefaultBE  = fe.default_backend && (filteredBEs === null || visibleBESet.has(fe.default_backend?.backend || fe.default_backend))
  const totalAclNodes = allAclNodes.length + (visibleDefaultBE ? 1 : 0)
  const totalAclH = totalAclNodes > 0 ? totalAclNodes * ACL_H + (totalAclNodes - 1) * ACL_GAP : 0
  const totalBeH = referencedBEs.length > 0
    ? referencedBEs.reduce((sum, n) => sum + beServerRows[n] * (SRV_H + SRV_GAP) + BE_GAP, -BE_GAP)
    : 0
  const contentH = Math.max(80, totalAclH, totalBeH, BE_H)
  const totalH   = contentH + TOP_PAD + BOT_PAD

  const FE_W = 160, ACL_W = 170, BE_W = 150, SRV_W = 110, COL_GAP = 60
  const FE_X  = 20
  const ACL_X = FE_X + FE_W + COL_GAP
  const BE_X  = (hasACLs ? ACL_X + ACL_W : FE_X + FE_W) + COL_GAP
  const SRV_X = BE_X + BE_W + COL_GAP
  const totalW = SRV_X + SRV_W + 20

  const FE_H = 64

  if (referencedBEs.length === 0) {
    const bindLabel = (fe.bind?.[0] || '') + (fe.bind?.length > 1 ? ` +${fe.bind.length - 1}` : '')
    makeNode(g, FE_X, 100, FE_W, FE_H, fe.name, bindLabel + (fe.mode ? '  ' + fe.mode : ''), TEAL, 10, scale, null, rawForFrontend(fe))
    const sz = Math.max(9, Math.min(14, Math.round(12 * scale)))
    svgEl('text', { x: totalW/2, y: 132, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: '#94a3b8', 'font-size': sz, 'font-family': 'IBM Plex Sans, sans-serif' }, g).textContent = 'No backends configured'
    g.ownerDocument?.getElementById('haflow')?.setAttribute('viewBox', `0 0 ${totalW} 260`)
    return
  }

  g.ownerDocument?.getElementById('haflow')?.setAttribute('viewBox', `0 0 ${totalW} ${totalH}`)
  const defs = svgEl('defs', {}, g)
  const mk = svgEl('marker', { id: 'harrow', viewBox: '0 0 10 10', refX: '8', refY: '5', markerWidth: '6', markerHeight: '6', orient: 'auto-start-reverse' }, defs)
  svgEl('path', { d: 'M2 1L8 5L2 9', fill: 'none', stroke: 'context-stroke', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, mk)

  sectionLabel(g, FE_X + FE_W/2,   22, 'frontend', scale)
  if (hasACLs) sectionLabel(g, ACL_X + ACL_W/2, 22, 'acl / routes', scale)
  sectionLabel(g, BE_X + BE_W/2,   22, 'backends', scale)
  sectionLabel(g, SRV_X + SRV_W/2, 22, 'servers', scale)

  const feCY = totalH / 2
  const bindLabel = (fe.bind?.[0] || '') + (fe.bind?.length > 1 ? ` +${fe.bind.length - 1}` : '')
  const modeLabel = bindLabel + (fe.mode ? '  ' + fe.mode : '')
  makeNode(g, FE_X, feCY - FE_H/2, FE_W, FE_H, fe.name, modeLabel, TEAL, 10, scale, null, rawForFrontend(fe))

  const bePositions = {}
  {
    let cursor = TOP_PAD
    referencedBEs.forEach(name => {
      const rows = beServerRows[name]
      const blockH = rows * (SRV_H + SRV_GAP) - SRV_GAP
      bePositions[name] = cursor + blockH/2 - BE_H/2
      cursor += Math.max(blockH, BE_H) + BE_GAP
    })
    const usedH = Object.values(bePositions).reduce((max, y) => Math.max(max, y + BE_H), 0)
    const offset = (totalH - usedH) / 2 - TOP_PAD / 2
    if (offset > 0) referencedBEs.forEach(n => { bePositions[n] += offset })
  }

  referencedBEs.forEach(name => {
    const be = beMap[name]
    const beY = bePositions[name]
    makeNode(g, BE_X, beY, BE_W, BE_H, name, be?.balance || '', PURPLE, 10, scale, null, rawForBackend(be || { name, balance: '' }))

    const srvList = beVisibleServers[name]
    if (srvList.length === 0) {
      const srvY = beY + BE_H/2 - SRV_H/2
      svgEl('text', { x: SRV_X + SRV_W/2, y: srvY + SRV_H/2, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: '#94a3b8', 'font-size': Math.max(8, Math.round(9 * scale)), 'font-family': 'IBM Plex Sans, sans-serif' }, g).textContent = 'no match'
      svgEl('path', { d: `M${BE_X+BE_W} ${beY+BE_H/2} C${BE_X+BE_W+24} ${beY+BE_H/2} ${SRV_X-24} ${srvY+SRV_H/2} ${SRV_X} ${srvY+SRV_H/2}`, fill: 'none', stroke: '#cbd5e1', 'stroke-width': '1', 'stroke-dasharray': '4 3', 'marker-end': 'url(#harrow)' }, g)
      return
    }

    const blockH = srvList.length * (SRV_H + SRV_GAP) - SRV_GAP
    const srvStartY = beY + BE_H/2 - blockH/2
    srvList.forEach((srv, si) => {
      const srvY = srvStartY + si * (SRV_H + SRV_GAP)
      makeNode(g, SRV_X, srvY, SRV_W, SRV_H, srv.name, `${srv.address}:${srv.port}`, CORAL, 6, scale, null, rawForServer(srv))
      svgEl('path', {
        d: `M${BE_X+BE_W} ${beY+BE_H/2} C${BE_X+BE_W+24} ${beY+BE_H/2} ${SRV_X-24} ${srvY+SRV_H/2} ${SRV_X} ${srvY+SRV_H/2}`,
        fill: 'none', stroke: CORAL.fill, 'stroke-width': '1', 'marker-end': 'url(#harrow)'
      }, g)
    })

    const allSrvCount = (be?.servers || []).length
    if (srvTrimmed && allSrvCount > srvList.length) {
      const hiddenCount = allSrvCount - srvList.length
      const bx = SRV_X + SRV_W - 2
      const by = beY
      svgEl('rect', { x: bx - 28, y: by - 1, width: 30, height: 14, rx: 7, fill: '#f59e0b', opacity: '0.9' }, g)
      svgEl('text', { x: bx - 13, y: by + 6, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: '#fff', 'font-size': 9, 'font-family': 'IBM Plex Sans, sans-serif', 'font-weight': '600' }, g).textContent = `-${hiddenCount}`
    }
  })

  const defBEnameForCount = fe.default_backend?.backend || fe.default_backend
  const defaultVisible = fe.default_backend && (filteredBEs === null || visibleBESet.has(defBEnameForCount))
  const totalAclPlusDefault = allAclNodes.length + (defaultVisible ? 1 : 0)
  const aclBlockH = totalAclPlusDefault * ACL_H + (totalAclPlusDefault - 1) * ACL_GAP
  const aclStartY = totalH / 2 - aclBlockH / 2

  allAclNodes.forEach((node, i) => {
    const ay = aclStartY + i * (ACL_H + ACL_GAP)
    const color = node.kind === 'orphan' ? { ...BLUE, fill: '#3b82f6', stroke: '#93c5fd' } : BLUE

    const nodeLabel    = node.label || node.aclNames.join(' ')
    const nodeSublabel = node.sublabel || aclDefs[node.aclNames[0]] || ''
    const rawLine      = rawForAclRoute(node, aclDefs)

    makeNode(g, ACL_X, ay, ACL_W, ACL_H, nodeLabel, nodeSublabel, color, 8, scale, null, rawLine)

    makeCurve(g, FE_X + FE_W, feCY, ACL_X, ay + ACL_H/2,
      node.kind === 'orphan' ? '#93c5fd' : BLUE.fill,
      node.kind === 'orphan',
      null, scale)

    if (node.kind === 'route' && node.backend) {
      const beY = bePositions[node.backend]
      if (beY !== undefined) {
        const condLabel = node.condition
          ? (node.condition.length > 18 ? node.condition.slice(0, 16) + '\u2026' : node.condition)
          : null
        makeCurve(g, ACL_X + ACL_W, ay + ACL_H/2, BE_X, beY + BE_H/2, PURPLE.fill, false, condLabel, scale)
      }
    }
  })

  if (fe.default_backend) {
    const defBEname = fe.default_backend.backend || fe.default_backend
    const isVisible = filteredBEs === null || visibleBESet.has(defBEname)
    if (isVisible) {
      const i = allAclNodes.length
      const ay = aclStartY + i * (ACL_H + ACL_GAP)
      makeNode(g, ACL_X, ay, ACL_W, ACL_H, 'default', 'fallback', GRAY, 8, scale, null,
        `    default_backend ${defBEname}`)
      makeCurve(g, FE_X + FE_W, feCY, ACL_X, ay + ACL_H/2, GRAY.fill, true, null, scale)
      const beY = bePositions[defBEname]
      if (beY !== undefined) {
        makeCurve(g, ACL_X + ACL_W, ay + ACL_H/2, BE_X, beY + BE_H/2, GRAY.fill, true, 'default', scale)
      }
    }
  }

  if (!hasACLs && fe.default_backend) {
    const defBEname = fe.default_backend.backend || fe.default_backend
    const beY = bePositions[defBEname]
    if (beY !== undefined) {
      makeCurve(g, FE_X + FE_W, feCY, BE_X, beY + BE_H/2, TEAL.fill, false, null, scale)
    }
  }
}

export default function FlowDiagram({ config }) {
  const gRef    = useRef(null)
  const svgRef  = useRef(null)
  const wrapRef = useRef(null)

  const [selectedIdx,  setSelectedIdx]  = useState(0)
  const [zoomIdx,      setZoomIdx]      = useState(ZOOM_DEFAULT_IDX)
  const [beFilter,     setBeFilter]     = useState('')
  const [srvFilter,    setSrvFilter]    = useState('')

  const [tooltip, setTooltip]          = useState(null)
  const [pinnedTooltip, setPinnedTooltip] = useState(null)
  const tooltipTimerRef                = useRef(null)
  const tooltipPendingRef              = useRef(null)

  const prevDrawKey = useRef(null)

  const frontends = config?.frontends || []
  const scale = ZOOM_STEPS[zoomIdx]
  const zoomPct = Math.round(scale * 100)

  const allReferencedBEs = (() => {
    const fe = frontends[Math.min(selectedIdx, frontends.length - 1)]
    if (!fe) return []
    const list = []
    ;(fe.use_backends || []).forEach(ub => { if (ub.backend && !list.includes(ub.backend)) list.push(ub.backend) })
    if (fe.default_backend?.backend && !list.includes(fe.default_backend.backend)) list.push(fe.default_backend.backend)
    return list
  })()

  const allServers = (() => {
    const beMap = {}
    ;(config?.backends || []).forEach(b => { beMap[b.name] = b })
    ;(config?.listens  || []).forEach(b => { beMap[b.name] = b })
    return allReferencedBEs.flatMap(n => (beMap[n]?.servers || []))
  })()

  const beFilterTrimmed  = beFilter.trim().toLowerCase()
  const srvFilterTrimmed = srvFilter.trim().toLowerCase()

  const filteredBEs = beFilterTrimmed
    ? allReferencedBEs.filter(n => n.toLowerCase().includes(beFilterTrimmed))
    : null

  const showBeFilterWarning = allReferencedBEs.length > BE_FILTER_THRESHOLD && !beFilterTrimmed
  const showBeFilterResult  = beFilterTrimmed && filteredBEs !== null
  const showSrvFilterResult = srvFilterTrimmed

  const handleSvgMouseMove = useCallback((e) => {
    const nodeEl = e.target.closest('[data-raw]')
    if (!nodeEl) {
      if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null }
      tooltipPendingRef.current = null
      return
    }
    const rawText = nodeEl.getAttribute('data-raw')
    if (!rawText) return

    const wrapRect = wrapRef.current?.getBoundingClientRect()
    const x = e.clientX - (wrapRect?.left || 0) + (wrapRef.current?.scrollLeft || 0)
    const y = e.clientY - (wrapRect?.top  || 0) + (wrapRef.current?.scrollTop  || 0)

    const pending = tooltipPendingRef.current
    if (!pending || pending.text !== rawText) {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
      setTooltip(null)
      tooltipPendingRef.current = { text: rawText, x, y }
      tooltipTimerRef.current = setTimeout(() => {
        setTooltip({ text: rawText, x: tooltipPendingRef.current.x, y: tooltipPendingRef.current.y })
      }, TOOLTIP_DELAY_MS)
    } else {
      tooltipPendingRef.current = { text: rawText, x, y }
    }
  }, [])

  const handleSvgMouseLeave = useCallback(() => {
    if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null }
    tooltipPendingRef.current = null
    setTooltip(null)
  }, [])

  const handleSvgClick = useCallback((e) => {
    const nodeEl = e.target.closest('[data-raw]')
    if (!nodeEl) { setPinnedTooltip(null); return }
    const rawText = nodeEl.getAttribute('data-raw')
    if (!rawText) { setPinnedTooltip(null); return }
    const wrapRect = wrapRef.current?.getBoundingClientRect()
    const x = e.clientX - (wrapRect?.left || 0) + (wrapRef.current?.scrollLeft || 0)
    const y = e.clientY - (wrapRect?.top  || 0) + (wrapRef.current?.scrollTop  || 0)
    setPinnedTooltip(prev => (prev && prev.text === rawText) ? null : { text: rawText, x, y })
  }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setPinnedTooltip(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => () => { if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current) }, [])

  useEffect(() => {
    if (!gRef.current || !frontends.length) return
    const idx = Math.min(selectedIdx, frontends.length - 1)
    const drawKey = [JSON.stringify(config), idx, filteredBEs?.join(',') ?? '_all', srvFilterTrimmed].join('|')
    if (drawKey === prevDrawKey.current) return
    prevDrawKey.current = drawKey
    drawFlow(gRef.current, config, idx, filteredBEs, srvFilterTrimmed || null, scale)
  }, [config, selectedIdx, filteredBEs, srvFilterTrimmed])

  useEffect(() => {
    if (!gRef.current || !frontends.length) return
    prevDrawKey.current = null
    const idx = Math.min(selectedIdx, frontends.length - 1)
    drawFlow(gRef.current, config, idx, filteredBEs, srvFilterTrimmed || null, scale)
  }, [zoomIdx])

  const zoomIn    = useCallback(() => setZoomIdx(i => Math.min(i + 1, ZOOM_STEPS.length - 1)), [])
  const zoomOut   = useCallback(() => setZoomIdx(i => Math.max(i - 1, 0)), [])
  const zoomReset = useCallback(() => setZoomIdx(ZOOM_DEFAULT_IDX), [])

  if (!frontends.length) {
    return (
      <div className="card p-14 text-center flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <Workflow size={26} className="text-slate-400"/>
        </div>
        <h3 className="text-sm font-semibold text-slate-600 mb-1">No frontends to visualize</h3>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
          Parse a HAProxy configuration first. The flow diagram renders the full routing path — frontend → ACL rules → backends → servers.
        </p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">

      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 flex-wrap">

        <span className="text-xs font-mono text-slate-400 uppercase tracking-widest shrink-0">Frontend</span>
        <select
          className="input text-xs font-mono py-1 px-2"
          style={{ width: 'auto', minWidth: 140 }}
          value={selectedIdx}
          onChange={e => { setSelectedIdx(+e.target.value); setBeFilter(''); setSrvFilter('') }}
        >
          {frontends.map((fe, i) => (
            <option key={i} value={i}>{fe.name}  ({fe.bind?.[0] || '?'})</option>
          ))}
        </select>

        <div className="w-px h-5 bg-slate-200 mx-1 shrink-0"/>

        <div className="relative flex items-center shrink-0" title="Filter by backend name">
          <Search size={12} className="absolute left-2.5 text-slate-400 pointer-events-none"/>
          <input
            className="input text-xs py-1 pl-7 pr-6"
            style={{ width: 148 }}
            placeholder="Backend\u2026"
            value={beFilter}
            onChange={e => setBeFilter(e.target.value)}
          />
          {beFilter && (
            <button className="absolute right-1.5 text-slate-400 hover:text-slate-600" onClick={() => setBeFilter('')}>
              <X size={11}/>
            </button>
          )}
        </div>

        <div className="relative flex items-center shrink-0" title="Filter by server name or address">
          <Search size={12} className="absolute left-2.5 text-slate-400 pointer-events-none"/>
          <input
            className="input text-xs py-1 pl-7 pr-6"
            style={{ width: 148 }}
            placeholder="Server\u2026"
            value={srvFilter}
            onChange={e => setSrvFilter(e.target.value)}
          />
          {srvFilter && (
            <button className="absolute right-1.5 text-slate-400 hover:text-slate-600" onClick={() => setSrvFilter('')}>
              <X size={11}/>
            </button>
          )}
        </div>

        <div className="w-px h-5 bg-slate-200 mx-1 shrink-0"/>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={zoomOut} disabled={zoomIdx === 0}
            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Zoom out"><ZoomOut size={15}/></button>
          <button onClick={zoomReset}
            className="px-2 py-0.5 rounded text-xs font-mono text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors min-w-[42px] text-center"
            title="Reset zoom">{zoomPct}%</button>
          <button onClick={zoomIn} disabled={zoomIdx === ZOOM_STEPS.length - 1}
            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Zoom in"><ZoomIn size={15}/></button>
          <button onClick={zoomReset}
            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
            title="Reset zoom"><RotateCcw size={13}/></button>
        </div>

        <div className="ml-auto flex items-center gap-3 text-xs text-slate-400 font-mono shrink-0">
          {[['#059669','frontend'],['#2563eb','acl/route'],['#7c3aed','backend'],['#ea580c','server']].map(([color, label]) => (
            <span key={label} className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }}/>
              {label}
            </span>
          ))}
        </div>
      </div>

      {(showBeFilterWarning || showBeFilterResult || showSrvFilterResult) && (
        <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-700 flex items-center gap-3 flex-wrap">
          <Search size={11} className="shrink-0"/>
          {showBeFilterWarning && (
            <span><strong>{allReferencedBEs.length}</strong> backends — filter for focus</span>
          )}
          {showBeFilterResult && (
            <span>
              Backends: <strong>{filteredBEs.length}</strong> of <strong>{allReferencedBEs.length}</strong> visible
              {filteredBEs.length === 0 && ' — none match'}
            </span>
          )}
          {showSrvFilterResult && (
            <span>
              Servers filtered by "<strong>{srvFilter.trim()}</strong>"
              {allServers.length > 0 && ` — ${allServers.filter(s => s.name.toLowerCase().includes(srvFilterTrimmed) || (`${s.address}:${s.port}`).includes(srvFilterTrimmed)).length} of ${allServers.length} visible`}
            </span>
          )}
          {(beFilter || srvFilter) && (
            <button className="ml-auto text-amber-600 hover:text-amber-800 font-medium flex items-center gap-1"
              onClick={() => { setBeFilter(''); setSrvFilter('') }}>
              <X size={10}/> Clear filters
            </button>
          )}
        </div>
      )}

      <div
        ref={wrapRef}
        className="overflow-auto bg-slate-50 relative"
        style={{ maxHeight: 'calc(100vh - 220px)' }}
      >
        <svg
          id="haflow"
          ref={svgRef}
          width="100%"
          viewBox="0 0 750 400"
          style={{
            minWidth: 500,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            display: 'block',
            width: `${Math.round(100 / scale)}%`,
          }}
          role="img"
          onMouseMove={handleSvgMouseMove}
          onMouseLeave={handleSvgMouseLeave}
          onClick={handleSvgClick}
        >
          <g ref={gRef}/>
        </svg>

        {(() => {
          const active = pinnedTooltip || tooltip
          if (!active) return null
          const isPinned = !!pinnedTooltip
          const lines = active.text.split('\n')
          const longestChars = Math.max(...lines.map(l => l.length))
          const minW = Math.min(Math.max(longestChars * 7.2 + 24, 120), 560)
          return (
            <div
              className="absolute z-50"
              style={{ left: active.x + 14, top: active.y - 10, pointerEvents: isPinned ? 'auto' : 'none' }}
            >
              <div
                className={`border rounded-lg shadow-2xl px-3 py-2.5 ${isPinned ? 'bg-slate-800 border-brand-500 ring-1 ring-brand-500/40' : 'bg-slate-900 border-slate-600 pointer-events-none'}`}
                style={{ animation: 'fadeInTooltip 0.12s ease', width: minW }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[9px] text-slate-500 font-mono uppercase tracking-widest select-none">
                    config raw
                  </div>
                  {isPinned && (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-brand-400 font-mono select-none">pinned \u00b7 Esc to close</span>
                      <button
                        className="text-slate-400 hover:text-white transition-colors"
                        onClick={() => setPinnedTooltip(null)}
                        title="Close"
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                          <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                <pre className="text-xs font-mono text-emerald-300 whitespace-pre leading-relaxed m-0">{active.text}</pre>
              </div>
              <style>{`@keyframes fadeInTooltip{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}`}</style>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
