import { getVersionData, HAPROXY_VERSIONS } from './haproxy-versions.js'

const SECTION_RE = /^\s*(global|defaults|frontend|backend|listen|resolvers|peers|userlist|program)\s*(.*?)\s*$/

let VALID_BALANCE = new Set([
  'roundrobin', 'leastconn', 'source', 'random', 'uri', 'hdr',
  'rdp-cookie', 'first', 'static-rr',
])

const VALID_MODES = new Set(['http', 'tcp', 'health'])

const VALID_HASH_TYPES = new Set([
  'consistent', 'map-based', 'avalanche',
])

const VALID_HTTP_REUSE = new Set(['aggressive', 'always', 'never', 'safe'])

const VALID_STICK_TABLE_TYPES = new Set([
  'ip', 'ipv6', 'integer', 'string', 'binary',
])

const VALID_SERVER_VERIFY = new Set(['none', 'optional', 'required'])

const VALID_ON_ERROR = new Set([
  'fastinter', 'fail-check', 'log-health', 'sudden-death', 'mark-down',
])

const VALID_TCP_REQUEST_TYPES = new Set([
  'connection', 'content', 'session', 'inspect-delay',
])

const VALID_TCP_RESPONSE_TYPES = new Set(['content', 'inspect-delay'])

const VALID_TIMEOUT_SUBS = new Set([
  'connect', 'client', 'client-fin', 'client-hs', 'server', 'server-fin',
  'tunnel', 'http-request', 'http-keep-alive', 'check', 'queue', 'tarpit',
])

const VALID_COOKIE_METHODS = new Set(['rewrite', 'insert', 'prefix'])

const TIME_RE = /^\d+[dhms]?$/

function stripComment(line) {
  let inQ = false, prev = ''
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if ((ch === '"' || ch === "'") && prev !== '\\') inQ = !inQ
    if (ch === '#' && !inQ) return line.slice(0, i).trimEnd()
    prev = ch
  }
  return line.trimEnd()
}

function splitSections(text) {
  const result = []
  let curType = null, curName = '', curLines = []
  for (const raw of text.split('\n')) {
    const line = stripComment(raw)
    const trimmed = line.trim()
    if (!trimmed) continue
    const m = trimmed.match(SECTION_RE)
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

function kv(line) {
  const idx = line.indexOf(' ')
  return idx === -1 ? [line, ''] : [line.slice(0, idx), line.slice(idx + 1).trim()]
}

function kvLower(line) {
  const idx = line.indexOf(' ')
  const k = idx === -1 ? line : line.slice(0, idx)
  const v = idx === -1 ? '' : line.slice(idx + 1).trim()
  return [k.toLowerCase(), v]
}

function isTime(val) {
  return TIME_RE.test(val)
}

function isPort(n) {
  return Number.isInteger(n) && n >= 1 && n <= 65535
}

function isNumeric(val) {
  if (typeof val === 'number') return true
  return /^\d+$/.test(val.trim())
}

function hasValue(v) {
  return v && v.length > 0
}

const GLOBAL_DIRECTIVES = new Set([
  'chroot', 'user', 'group', 'uid', 'gid', 'daemon', 'master-worker',
  'expose-experimental-directives', 'nbproc', 'cpu-map',
  'numa-cpu-mapping', 'ulimit-n', 'pidfile', 'description', 'node', 'localpeer',
  'log-send-hostname', 'log-tag', 'ca-base', 'crt-base',
  'ssl-default-bind-ciphers', 'ssl-default-bind-ciphersuites',
  'ssl-default-bind-options', 'ssl-default-server-ciphers',
  'ssl-default-server-ciphersuites', 'ssl-default-server-options',
  'ssl-dh-param-file', 'ssl-server-verify', 'tune.ssl.maxrecord',
  'tune.maxrewrite', 'tune.bufsize', 'tune.http.maxhdr',
  'tune.idle-pool.shared', 'tune.rcvbuf.client', 'tune.rcvbuf.server',
  'tune.sndbuf.client', 'tune.sndbuf.server',
  'insecure-fork-wanted', 'set-var', 'setenv', 'presetenv',
])

// Directives valid in both global AND proxy sections
const SHARED_DIRECTIVES = new Set([
  'log', 'maxconn', 'stats', 'external-check',
])

const PROXY_DIRECTIVES = new Set([
  'mode', 'balance', 'hash-type', 'maxconn', 'fullconn', 'log', 'option',
  'timeout', 'retries', 'acl', 'http-request', 'http-response',
  'http-after-response', 'tcp-request', 'tcp-response', 'use_backend',
  'default_backend', 'stick-table', 'stick', 'cookie', 'compression',
  'server', 'server-template', 'default-server', 'http-reuse',
  'http-send-name-header', 'redirect', 'source', 'ignore-persist',
  'force-persist', 'external-check', 'errorfile', 'errorloc', 'errorloc302',
  'stats', 'unique-id-format', 'unique-id-header', 'capture',
  'monitor-uri', 'monitor', 'log-format', 'log-format-sd',
  'log-tag', 'load-server-state-from-file',
  'http-check', 'tcp-check', 'crt', 'http-error',
])

const FRONTEND_ONLY = new Set(['bind'])

const BACKEND_ONLY = new Set(['server', 'server-template'])

const LISTEN_ALLOWED = new Set(['bind', 'server', 'server-template'])

function validateBind(lineNum, line, issues, feat) {
  const rest = line.slice(5).trim()
  if (!rest) {
    issues.push({ line: lineNum, severity: 'error', message: 'bind directive missing address:port or path' })
    return
  }
  const parts = rest.split(/\s+/)
  const addr = parts[0]

  if (addr.startsWith('/')) return

  if (addr.includes(':')) {
    const lastColon = addr.lastIndexOf(':')
    const portStr = addr.slice(lastColon + 1)
    const port = parseInt(portStr)
    if (isNaN(port) || !isPort(port)) {
      issues.push({ line: lineNum, severity: 'error', message: `bind: invalid port '${portStr}' in '${addr}'` })
    }
    const params = parts.slice(1)
    validateBindParams(lineNum, params, issues, feat)
  } else if (addr === '*') {
    issues.push({ line: lineNum, severity: 'error', message: 'bind * requires a port (e.g. *:80)' })
  }
}

function validateBindParams(lineNum, params, issues, feat) {
  const needsVal = new Set([
    'accept-proxy', 'alpn', 'backlog', 'ca-file', 'ca-ignore-err',
    'ca-sign-file', 'ca-sign-pass', 'ca-verify-file', 'ciphers',
    'ciphersuites', 'crl-file', 'crl-ignore-err', 'crt', 'crt-ignore-err',
    'crt-list', 'curves', 'ecdhe', 'gid', 'group', 'id', 'interface',
    'level', 'maxconn', 'mode', 'mss', 'name', 'nice', 'npn', 'process',
    'protect', 'proto', 'quic-cc-algo', 'quic-retry-impact-key',
    'tcp-ut', 'thread', 'uid', 'user', 'verify',
  ])
  const noVal = new Set([
    'accept-nproxy', 'allow-0rtt', 'defer-accept', 'expose-fd',
    'force-sslv3', 'force-tlsv10', 'force-tlsv11', 'force-tlsv12',
    'force-tlsv13', 'generate-certificates', 'no-sslv3', 'no-tlsv10',
    'no-tlsv11', 'no-tlsv12', 'no-tlsv13', 'prefer-client-ciphers',
    'quic', 'quic-force-retry', 'quic-socket', 'ssl', 'strict-sni',
    'tfo', 'transparent', 'v4v6', 'v6only',
  ])
  let hasSsl = false, hasQuic = false

  let i = 0
  while (i < params.length) {
    const p = params[i].toLowerCase()

    if (p === 'ssl') hasSsl = true
    if (p === 'quic') hasQuic = true

    if (noVal.has(p)) {
      if (!feat.bind_params.has(p)) {
        issues.push({ line: lineNum, severity: 'warning', message: `bind: '${p}' requires HAProxy ${feat._version}+` })
      }
      i++
    }
    else if (needsVal.has(p)) {
      if (!feat.bind_params.has(p)) {
        issues.push({ line: lineNum, severity: 'warning', message: `bind: '${p}' requires HAProxy ${feat._version}+` })
      }
      if (i + 1 >= params.length) {
        issues.push({ line: lineNum, severity: 'error', message: `bind: ${p} requires a value` })
        i++
      } else i += 2
    }
    else if (feat.bind_params.has(p)) {
      if (i + 1 >= params.length) { i++ }
      else i += 2
    }
    else {
      issues.push({ line: lineNum, severity: 'warning', message: `bind: unknown parameter '${params[i]}' for HAProxy ${feat._version}` })
      i++
    }
  }

  if (hasQuic && !hasSsl) {
    issues.push({ line: lineNum, severity: 'warning', message: 'bind: quic requires ssl — add the ssl parameter' })
  }
}

function validateServer(lineNum, line, issues, feat) {
  const parts = line.split(/\s+/)
  if (parts.length < 3) {
    issues.push({ line: lineNum, severity: 'error', message: 'server: missing name and/or address:port' })
    return
  }
  const name = parts[1]
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    issues.push({ line: lineNum, severity: 'warning', message: `server: name '${name}' may contain invalid characters` })
  }
  const addrPort = parts[2]
  const lastColon = addrPort.lastIndexOf(':')
  if (lastColon === -1) {
    issues.push({ line: lineNum, severity: 'error', message: `server '${name}': missing port in '${addrPort}'` })
  } else {
    const portStr = addrPort.slice(lastColon + 1)
    const port = parseInt(portStr)
    if (isNaN(port) || !isPort(port)) {
      issues.push({ line: lineNum, severity: 'error', message: `server '${name}': invalid port '${portStr}'` })
    }
    const addr = addrPort.slice(0, lastColon)
    if (!addr || addr === '*') {
      issues.push({ line: lineNum, severity: 'error', message: `server '${name}': invalid address '${addr}'` })
    }
  }

  const params = parts.slice(3)
  const needsVal = new Set([
    'weight', 'maxconn', 'maxqueue', 'minconn', 'pool-max-conn',
    'max-session-srv-conns', 'inter', 'fastinter', 'downinter',
    'rise', 'fall',
  ])
  const noVal = new Set([
    'check', 'no-check', 'ssl', 'no-ssl', 'backup', 'disabled', 'no-backup',
    'no-sni', 'non-stick', 'check-ssl', 'no-check-ssl',
    'health-check-up', 'health-check-down', 'observe',
    'send-proxy', 'send-proxy-v2', 'send-proxy-v2-ssl', 'send-proxy-v2-ssl-cn',
  ])

  let i = 0
  while (i < params.length) {
    const p = params[i].toLowerCase()

    if (noVal.has(p)) {
      if (!feat.server_params.has(p)) {
        issues.push({ line: lineNum, severity: 'warning', message: `server '${name}': '${p}' requires HAProxy ${feat._version}+` })
      }
      i++
    }
    else if (needsVal.has(p)) {
      if (!feat.server_params.has(p)) {
        issues.push({ line: lineNum, severity: 'warning', message: `server '${name}': '${p}' requires HAProxy ${feat._version}+` })
      }
      if (i + 1 >= params.length) {
        issues.push({ line: lineNum, severity: 'error', message: `server '${name}': ${p} requires a value` })
        i++
      } else {
        const n = parseInt(params[i + 1])
        if (isNaN(n) || n < 0) {
          issues.push({ line: lineNum, severity: 'warning', message: `server '${name}': ${p} should be a positive number` })
        }
        i += 2
      }
    }
    else if (p === 'track') {
      if (i + 1 >= params.length) {
        issues.push({ line: lineNum, severity: 'error', message: `server '${name}': track requires a value (e.g. backend/server)` })
        i++
      } else i += 2
    }
    else if (p === 'on-error') {
      if (i + 1 >= params.length) { i++ }
      else {
        if (!VALID_ON_ERROR.has(params[i + 1].toLowerCase())) {
          issues.push({ line: lineNum, severity: 'warning', message: `server '${name}': unknown on-error method '${params[i + 1]}'` })
        }
        i += 2
      }
    }
    else if (p === 'verify') {
      if (i + 1 >= params.length) { i++ }
      else {
        if (!VALID_SERVER_VERIFY.has(params[i + 1].toLowerCase())) {
          issues.push({ line: lineNum, severity: 'warning', message: `server '${name}': unknown verify mode '${params[i + 1]}'` })
        }
        i += 2
      }
    }
    else if (feat.server_params.has(p)) {
      if (i + 1 >= params.length) { i++ }
      else i += 2
    }
    else {
      issues.push({ line: lineNum, severity: 'warning', message: `server '${name}': unknown parameter '${params[i]}' for HAProxy ${feat._version}` })
      i++
    }
  }
}

function validateMode(lineNum, mode, issues) {
  if (!VALID_MODES.has(mode.toLowerCase())) {
    issues.push({ line: lineNum, severity: 'warning', message: `Unknown mode '${mode}'. Valid: http, tcp, health` })
  }
}

function validateBalance(lineNum, bal, issues, feat) {
  const val = bal.toLowerCase()
  if (val.startsWith('uri ')) return
  if (val.startsWith('hdr(')) return
  if (val.startsWith('rdp-cookie(')) return
  if (!feat.balance.has(val)) {
    issues.push({ line: lineNum, severity: 'warning', message: `Unknown balance algorithm '${bal}' for HAProxy ${feat._version || 'this version'}` })
  }
}

function validateHashType(lineNum, hashType, issues) {
  const main = hashType.split(/\s+/)[0].toLowerCase()
  if (!VALID_HASH_TYPES.has(main)) {
    issues.push({ line: lineNum, severity: 'warning', message: `Unknown hash-type '${hashType}'` })
  }
}

function validateACL(lineNum, rest, issues) {
  const parts = rest.split(/\s+/, 2)
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    issues.push({ line: lineNum, severity: 'error', message: 'acl: requires name and criterion (e.g. acl is_static path_end .html)' })
  }
}

function validateHttpRequestRule(lineNum, rest, issues, feat) {
  const action = rest.split(/\s+/)[0].toLowerCase()
  if (!feat.http_request_actions.has(action)) {
    issues.push({ line: lineNum, severity: 'warning', message: `http-request: unknown action '${action}' for HAProxy ${feat._version}` })
  }
  if (!rest || rest.trim().length === 0) {
    issues.push({ line: lineNum, severity: 'error', message: 'http-request: missing action' })
  }
}

function validateHttpResponseRule(lineNum, rest, issues, feat) {
  if (!rest || rest.trim().length === 0) {
    issues.push({ line: lineNum, severity: 'error', message: 'http-response: missing action' })
    return
  }
  const action = rest.split(/\s+/)[0].toLowerCase()
  if (feat && !feat.http_request_actions.has(action)) {
    issues.push({ line: lineNum, severity: 'warning', message: `http-response: unknown action '${action}' for HAProxy ${feat._version}` })
  }
}

function validateTcpRequestRule(lineNum, rest, issues, feat) {
  const parts = rest.split(/\s+/)
  if (!parts.length || !VALID_TCP_REQUEST_TYPES.has(parts[0].toLowerCase())) {
    issues.push({ line: lineNum, severity: 'error', message: `tcp-request: requires a valid type (connection, content, session, inspect-delay)` })
    return
  }
  if (parts.length < 2) {
    issues.push({ line: lineNum, severity: 'error', message: 'tcp-request: missing action after type' })
    return
  }
  if (parts[0].toLowerCase() === 'content') {
    const action = parts[1].toLowerCase()
    if (!feat.http_request_actions.has(action)) {
      issues.push({ line: lineNum, severity: 'warning', message: `tcp-request content: unknown action '${action}' for HAProxy ${feat._version}` })
    }
  }
}

function validateTcpResponseRule(lineNum, rest, issues) {
  const parts = rest.split(/\s+/)
  if (!parts.length || !VALID_TCP_RESPONSE_TYPES.has(parts[0].toLowerCase())) {
    issues.push({ line: lineNum, severity: 'error', message: `tcp-response: requires a valid type (content, inspect-delay)` })
  }
}

function validateCookie(lineNum, rest, issues) {
  const parts = rest.split(/\s+/)
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    issues.push({ line: lineNum, severity: 'error', message: 'cookie: requires name and method (rewrite|insert|prefix)' })
    return
  }
  if (!VALID_COOKIE_METHODS.has(parts[1].toLowerCase())) {
    issues.push({ line: lineNum, severity: 'error', message: `cookie: method must be one of: ${[...VALID_COOKIE_METHODS].join(', ')}` })
  }
}

function validateStickTable(lineNum, rest, issues) {
  if (!rest || rest.trim().length === 0) {
    issues.push({ line: lineNum, severity: 'error', message: 'stick-table: requires type, size, and optionally expire/peers' })
    return
  }
  const tokens = rest.split(/\s+/)
  let hasType = false, hasSize = false
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i].toLowerCase()
    if (t === 'type') {
      if (i + 1 >= tokens.length) {
        issues.push({ line: lineNum, severity: 'error', message: 'stick-table: type requires a value' })
      } else {
        if (!VALID_STICK_TABLE_TYPES.has(tokens[i + 1].toLowerCase())) {
          issues.push({ line: lineNum, severity: 'warning', message: `stick-table: unknown type '${tokens[i + 1]}'` })
        }
        hasType = true
      }
    }
    if (t === 'size') {
      if (i + 1 >= tokens.length) {
        issues.push({ line: lineNum, severity: 'error', message: 'stick-table: size requires a value' })
      } else hasSize = true
    }
    if (t === 'store') {
      if (i + 1 >= tokens.length) {
        issues.push({ line: lineNum, severity: 'error', message: 'stick-table: store requires a value' })
      }
    }
    if (t === 'expire' && i + 1 < tokens.length && !isTime(tokens[i + 1])) {
      issues.push({ line: lineNum, severity: 'warning', message: `stick-table: expire '${tokens[i + 1]}' does not look like a valid time` })
    }
    if (t === 'peers' && i + 1 < tokens.length) i++
  }
  if (!hasType) {
    issues.push({ line: lineNum, severity: 'error', message: 'stick-table: missing type (ip, ipv6, integer, string, binary)' })
  }
  if (!hasSize) {
    issues.push({ line: lineNum, severity: 'warning', message: 'stick-table: missing size (will use default 100k)' })
  }
}

function validateOption(lineNum, sectionType, option, issues, feat) {
  const opt = option.split(/\s+/)[0].toLowerCase()

  const healthOptions = new Set([
    'httpchk', 'smtpchk', 'mysql-check', 'pgsql-check', 'redis-check',
    'ssl-hello-chk', 'tcp-check', 'ldap-check',
  ])

  if (!feat.options.has(opt)) {
    issues.push({ line: lineNum, severity: 'warning', message: `Unknown option '${option.split(/\s+/)[0]}' for HAProxy ${feat._version}` })
  }

  if (opt === 'forwardfor') {
    const val = option.slice(10).trim().toLowerCase()
    if (val && val !== 'except' && val !== 'header') {
      issues.push({ line: lineNum, severity: 'warning', message: 'option forwardfor: valid params are except <network> or header <name>' })
    }
  }
}

function validateTimeout(lineNum, rest, issues) {
  const parts = rest.split(/\s+/, 2)
  if (!parts.length) {
    issues.push({ line: lineNum, severity: 'error', message: 'timeout: requires a sub-option (connect, client, server, etc.)' })
    return
  }
  const sub = parts[0].toLowerCase()
  if (!VALID_TIMEOUT_SUBS.has(sub)) {
    issues.push({ line: lineNum, severity: 'warning', message: `timeout: unknown sub-option '${sub}'` })
    return
  }
  if (parts.length < 2 || !parts[1].trim()) {
    issues.push({ line: lineNum, severity: 'error', message: `timeout ${sub}: missing value` })
    return
  }
  const val = parts[1]
  if (!isTime(val) && !isNumeric(val)) {
    issues.push({ line: lineNum, severity: 'warning', message: `timeout ${sub}: '${val}' does not look like a valid time (e.g. 5s, 30s, 1m)` })
  }
}

function validateStats(lineNum, rest, issues) {
  if (!rest || rest.trim().length === 0) {
    issues.push({ line: lineNum, severity: 'warning', message: 'stats: missing keyword (uri, realm, auth, refresh, admin, etc.)' })
  }
}

function validateSource(lineNum, rest, issues) {
  if (!rest || rest.trim().length === 0) {
    issues.push({ line: lineNum, severity: 'warning', message: 'source: missing address or interface' })
  }
}

function validateRetries(lineNum, val, issues) {
  const n = parseInt(val)
  if (isNaN(n) || n < 0) {
    issues.push({ line: lineNum, severity: 'error', message: 'retries requires a non-negative integer' })
  }
}

function validateMaxconn(lineNum, val, issues) {
  const n = parseInt(val)
  if (isNaN(n) || n <= 0) {
    issues.push({ line: lineNum, severity: 'error', message: 'maxconn requires a positive integer' })
  }
}

function validateFullconn(lineNum, val, issues) {
  const n = parseInt(val)
  if (isNaN(n) || n <= 0) {
    issues.push({ line: lineNum, severity: 'error', message: 'fullconn requires a positive integer' })
  }
}

function validateLog(lineNum, rest, issues) {
  if (!rest || rest.trim().length === 0) {
    issues.push({ line: lineNum, severity: 'warning', message: 'log: missing address or socket' })
  }
}

function validateLogFormat(lineNum, rest, issues) {
  if (!rest || rest.trim().length === 0) {
    issues.push({ line: lineNum, severity: 'warning', message: 'log-format: missing format string' })
  }
}

function validateHttpReuse(lineNum, val, issues) {
  if (!VALID_HTTP_REUSE.has(val.toLowerCase())) {
    issues.push({ line: lineNum, severity: 'warning', message: `http-reuse: unknown mode '${val}'. Valid: ${[...VALID_HTTP_REUSE].join(', ')}` })
  }
}

function validateUniqueId(lineNum, kind, rest, issues) {
  if (!rest || rest.trim().length === 0) {
    issues.push({ line: lineNum, severity: 'warning', message: `${kind}: missing format/header value` })
  }
}

function validateServerTemplate(lineNum, line, issues) {
  const parts = line.split(/\s+/)
  if (parts.length < 4) {
    issues.push({ line: lineNum, severity: 'error', message: 'server-template: requires prefix, nb, address:port' })
    return
  }
  const count = parseInt(parts[2])
  if (isNaN(count) || count <= 0) {
    issues.push({ line: lineNum, severity: 'error', message: `server-template: count must be a positive number, got '${parts[2]}'` })
  }
  const addrPort = parts[3]
  const lastColon = addrPort.lastIndexOf(':')
  if (lastColon === -1) {
    issues.push({ line: lineNum, severity: 'error', message: `server-template: missing port in '${addrPort}'` })
  } else {
    const port = parseInt(addrPort.slice(lastColon + 1))
    if (isNaN(port) || !isPort(port)) {
      issues.push({ line: lineNum, severity: 'error', message: `server-template: invalid port '${addrPort.slice(lastColon + 1)}'` })
    }
  }
}

function validateUseBackend(lineNum, rest, issues, knownBackends) {
  const parts = rest.split(/\s+/, 2)
  if (!parts.length || !parts[0].trim()) {
    issues.push({ line: lineNum, severity: 'error', message: 'use_backend: missing backend name' })
    return
  }
  if (knownBackends && !knownBackends.has(parts[0])) {
    issues.push({ line: lineNum, severity: 'warning', message: `use_backend '${parts[0]}': backend does not exist in this config` })
  }
}

function validateDefaultBackend(lineNum, rest, issues, knownBackends) {
  const name = rest.split(/\s+/)[0]
  if (!name) {
    issues.push({ line: lineNum, severity: 'error', message: 'default_backend: missing backend name' })
    return
  }
  if (knownBackends && !knownBackends.has(name)) {
    issues.push({ line: lineNum, severity: 'warning', message: `default_backend '${name}': backend does not exist in this config` })
  }
}

function validateCapture(lineNum, rest, issues) {
  const parts = rest.split(/\s+/, 2)
  if (!parts.length) {
    issues.push({ line: lineNum, severity: 'error', message: 'capture: requires direction (request/response) and header specification' })
    return
  }
  const dir = parts[0].toLowerCase()
  if (dir !== 'request' && dir !== 'response') {
    issues.push({ line: lineNum, severity: 'error', message: "capture: direction must be 'request' or 'response'" })
    return
  }
  if (parts.length < 2 || !parts[1].trim()) {
    issues.push({ line: lineNum, severity: 'error', message: `capture ${dir}: missing specification` })
  }
}

function validateMonitorFail(lineNum, rest, issues) {
  if (!rest || rest.trim().length === 0) {
    issues.push({ line: lineNum, severity: 'error', message: 'monitor fail: missing condition' })
  }
}

function validateRedirect(lineNum, rest, issues) {
  if (!rest || rest.trim().length === 0) {
    issues.push({ line: lineNum, severity: 'error', message: 'redirect: missing rule specification' })
  }
}

function validateCompression(lineNum, line, issues) {
  const rest = line.slice(12).trim()
  if (!rest) {
    issues.push({ line: lineNum, severity: 'warning', message: 'compression: missing sub-option (algo, type, offload)' })
    return
  }
  const parts = rest.split(/\s+/, 2)
  const sub = parts[0].toLowerCase()
  if (!['algo', 'type', 'offload'].includes(sub)) {
    issues.push({ line: lineNum, severity: 'warning', message: `compression: unknown sub-option '${sub}'` })
  }
}

function validateHttpCheck(lineNum, rest, issues) {
  if (!rest || rest.trim().length === 0) {
    issues.push({ line: lineNum, severity: 'warning', message: 'http-check: missing sub-option (expect, send, connect, disable-on-404)' })
  }
}

function validateTcpCheck(lineNum, rest, issues) {
  if (!rest || rest.trim().length === 0) {
    issues.push({ line: lineNum, severity: 'warning', message: 'tcp-check: missing check content' })
  }
}

function validateMonitorUri(lineNum, rest, issues) {
  if (!rest || rest.trim().length === 0) {
    issues.push({ line: lineNum, severity: 'error', message: 'monitor-uri: missing URI' })
  }
}

function validateIgnorePersist(lineNum, rest, issues) {
  if (!rest || rest.trim().length === 0) {
    issues.push({ line: lineNum, severity: 'error', message: 'ignore-persist: missing condition' })
  }
}

function validateForcePersist(lineNum, rest, issues) {
  if (!rest || rest.trim().length === 0) {
    issues.push({ line: lineNum, severity: 'error', message: 'force-persist: missing condition' })
  }
}

function validateExternalCheck(lineNum, sectionType, rest, issues) {
  if (sectionType === 'global') return
  const parts = rest.split(/\s+/, 2)
  const sub = parts[0].toLowerCase()
  if (sub !== 'command' && sub !== 'path') {
    issues.push({ line: lineNum, severity: 'warning', message: "external-check: sub-option must be 'command' or 'path'" })
  } else if (parts.length < 2 || !parts[1].trim()) {
    issues.push({ line: lineNum, severity: 'error', message: `external-check ${sub}: missing value` })
  }
}

function validateGlobalDirective(lineNum, directive, rest, issues) {
  const kl = directive.toLowerCase()

  if (kl === 'log') validateLog(lineNum, rest, issues)
  else if (kl === 'maxconn') validateMaxconn(lineNum, rest, issues)
  else if (kl === 'nbproc' || kl === 'nbthread') {
    const n = parseInt(rest)
    if (isNaN(n) || n <= 0) {
      issues.push({ line: lineNum, severity: 'error', message: `${directive}: requires a positive integer` })
    }
  }
  else if (kl === 'uid' || kl === 'gid') {
    const n = parseInt(rest)
    if (isNaN(n)) {
      issues.push({ line: lineNum, severity: 'error', message: `${directive}: requires a numeric value` })
    }
  }
  else if (kl === 'ulimit-n' || kl === 'tune.ssl.maxrecord' ||
           kl === 'tune.maxrewrite' || kl === 'tune.bufsize' ||
           kl === 'tune.http.maxhdr' || kl === 'tune.rcvbuf.client' ||
           kl === 'tune.rcvbuf.server' || kl === 'tune.sndbuf.client' ||
           kl === 'tune.sndbuf.server') {
    const n = parseInt(rest)
    if (isNaN(n) || n <= 0) {
      issues.push({ line: lineNum, severity: 'error', message: `${directive}: requires a positive integer` })
    }
  }
  else if (kl === 'stats') {
    const parts = rest.split(/\s+/, 2)
    const sub = parts[0].toLowerCase()
    if (!['socket', 'timeout', 'maxconn'].includes(sub)) {
      issues.push({ line: lineNum, severity: 'warning', message: `stats: unknown sub-option '${sub}' in global. Valid: socket, timeout, maxconn` })
    }
  }
  else if (kl === 'ssl-server-verify') {
    if (!VALID_SERVER_VERIFY.has(rest.toLowerCase())) {
      issues.push({ line: lineNum, severity: 'warning', message: `ssl-server-verify: must be 'none', 'optional', or 'required'` })
    }
  }
  else if (kl === 'log-send-hostname' || kl === 'log-tag' ||
           kl === 'chroot' || kl === 'user' || kl === 'group' ||
           kl === 'pidfile' || kl === 'description' || kl === 'node' ||
           kl === 'localpeer' || kl === 'ca-base' || kl === 'crt-base' ||
           kl === 'ssl-default-bind-ciphers' ||
           kl === 'ssl-default-bind-ciphersuites' ||
           kl === 'ssl-default-bind-options' ||
           kl === 'ssl-default-server-ciphers' ||
           kl === 'ssl-default-server-ciphersuites' ||
           kl === 'ssl-default-server-options' ||
           kl === 'ssl-dh-param-file' ||
           kl === 'tune.idle-pool.shared' ||
           kl === 'numa-cpu-mapping') {
    if (!rest) {
      issues.push({ line: lineNum, severity: 'warning', message: `${directive}: missing value` })
    }
  }
  else if (kl === 'cpu-map') {
    if (!rest) {
      issues.push({ line: lineNum, severity: 'warning', message: 'cpu-map: missing mapping specification' })
    }
  }
  else if (kl === 'set-var' || kl === 'setenv' || kl === 'presetenv') {
    if (!rest) {
      issues.push({ line: lineNum, severity: 'warning', message: `${directive}: missing variable/environment specification` })
    }
  }
}

export function validateConfigText(text, version = '2.9') {
  const issues = []
  const sections = splitSections(text)
  const knownBackends = new Set()
  const namedSections = { frontends: [], backends: [], listens: [] }
  const feat = getVersionData(version)

  if (!sections.length) {
    return { valid: false, message: 'No HAProxy sections found', issues: [] }
  }

  for (const [secType, secName, secLines] of sections) {
    if (secType === 'backend' && secName) knownBackends.add(secName)
    if (secType === 'listen' && secName) knownBackends.add(secName)
    if (secType === 'frontend' && secName) namedSections.frontends.push(secName)
    if (secType === 'backend' && secName) namedSections.backends.push(secName)
    if (secType === 'listen' && secName) namedSections.listens.push(secName)
  }

  let sectionStartLine = 1

  for (const [secType, secName, secLines] of sections) {
    let totalLinesBefore = 0
    for (const [st, sn, sl] of sections) {
      if (st === secType && sn === secName && sl === secLines) break
      totalLinesBefore += sl.length + 1
    }
    sectionStartLine = totalLinesBefore + 1

    if (secType === 'frontend' && !secName) {
      issues.push({ line: sectionStartLine, severity: 'error', message: 'frontend section requires a name' })
    }
    if (secType === 'backend' && !secName) {
      issues.push({ line: sectionStartLine, severity: 'error', message: 'backend section requires a name' })
    }
    if (secType === 'listen' && !secName) {
      issues.push({ line: sectionStartLine, severity: 'error', message: 'listen section requires a name' })
    }

    if (secType === 'program') {
      issues.push({ line: sectionStartLine, severity: 'warning', message: 'program section is removed in HAProxy 3.3+ — consider Lua scripts or other alternatives' })
    }
    if (secType === 'crt-store' && !feat.proxy_dirs.has('crt-store')) {
      issues.push({ line: sectionStartLine, severity: 'warning', message: `crt-store section requires HAProxy 3.0+ (current: ${feat._version})` })
    }
    if (secType === 'log-profile' && !feat.proxy_dirs.has('log-profile')) {
      issues.push({ line: sectionStartLine, severity: 'warning', message: `log-profile section requires HAProxy 3.1+ (current: ${feat._version})` })
    }
    if (secType === 'traces') {
      issues.push({ line: sectionStartLine, severity: 'warning', message: `traces section requires HAProxy 3.1+ (current: ${feat._version})` })
    }
    if (secType === 'acme' && !feat.global_dirs.has('acme')) {
      issues.push({ line: sectionStartLine, severity: 'warning', message: `acme section requires HAProxy 3.2+ (experimental, current: ${feat._version})` })
    }

    const hasBind = secLines.some(l => /^bind\s/i.test(l))
    const hasServer = secLines.some(l => /^server\s/i.test(l))

    if (secType === 'frontend' && !hasBind) {
      issues.push({ line: sectionStartLine, severity: 'warning', message: "frontend '" + (secName || 'unnamed') + "': no bind directive — frontend won't accept connections" })
    }
    if (secType === 'backend' && !hasServer) {
      const hasTmpl = secLines.some(l => /^server-template\s/i.test(l))
      if (!hasTmpl) {
        issues.push({ line: sectionStartLine, severity: 'warning', message: "backend '" + (secName || 'unnamed') + "': no server or server-template — no backends to route to" })
      }
    }

    for (let li = 0; li < secLines.length; li++) {
      const lineNum = sectionStartLine + 1 + li
      const line = secLines[li]
      const [k, rest] = kvLower(line)

      if (k === 'master-worker' && secType === 'global') {
        issues.push({ line: lineNum, severity: 'warning', message: 'master-worker is deprecated in HAProxy 3.3+ — use -W or -Ws command-line arguments instead' })
      }

      if (GLOBAL_DIRECTIVES.has(k) && !SHARED_DIRECTIVES.has(k)) {
        if (secType !== 'global') {
          issues.push({ line: lineNum, severity: 'error', message: `'${k}' is only allowed in the 'global' section, not in '${secType}'` })
        }
        continue
      }

      if (PROXY_DIRECTIVES.has(k) && !SHARED_DIRECTIVES.has(k)) {
        if (secType === 'global' || secType === 'resolvers' || secType === 'peers' || secType === 'userlist' || secType === 'program') {
          if (!FRONTEND_ONLY.has(k) && !BACKEND_ONLY.has(k)) {
            if (secType === 'global') {
              issues.push({ line: lineNum, severity: 'warning', message: `'${k}' is a proxy directive and is not valid in 'global' section` })
            }
          }
        }
      }

      if (!GLOBAL_DIRECTIVES.has(k) && !PROXY_DIRECTIVES.has(k) && !SHARED_DIRECTIVES.has(k)) {
        if (secType === 'global' && !feat.global_dirs.has(k)) {
          issues.push({ line: lineNum, severity: 'warning', message: `'${k}': unknown or unsupported global directive for HAProxy ${feat._version}` })
        } else if (secType !== 'global' && secType !== 'resolvers' && secType !== 'peers' && secType !== 'userlist' && secType !== 'program') {
          if (!feat.proxy_dirs.has(k)) {
            issues.push({ line: lineNum, severity: 'warning', message: `'${k}': unknown or unsupported directive for HAProxy ${feat._version}` })
          }
        }
      }

      if (k === 'bind' && (secType === 'backend' || secType === 'defaults')) {
        issues.push({ line: lineNum, severity: 'error', message: `bind is not allowed in '${secType}' sections` })
      }

      if ((k === 'server' || k === 'server-template') && secType === 'frontend') {
        issues.push({ line: lineNum, severity: 'error', message: `${k} is not allowed in 'frontend' sections` })
      }
      if ((k === 'server' || k === 'server-template') && secType === 'defaults') {
        issues.push({ line: lineNum, severity: 'error', message: `${k} is not allowed in 'defaults' sections` })
      }

      if (k === 'dispatch') {
        issues.push({ line: lineNum, severity: 'error', message: 'dispatch is removed in HAProxy 3.3+ — use server or use_backend instead' })
      }
      if (k === 'option' && rest.startsWith('transparent')) {
        issues.push({ line: lineNum, severity: 'error', message: 'option transparent is removed in HAProxy 3.3+ — use a different approach to handle transparent proxying' })
      }
      if (k === 'master-worker' && secType === 'global') {
        issues.push({ line: lineNum, severity: 'warning', message: 'master-worker is deprecated in HAProxy 3.3+ — use -W or -Ws command-line arguments instead' })
      }


      if (k === 'default_backend' && secType === 'frontend') {
        validateDefaultBackend(lineNum, rest, issues, knownBackends)
      }
      else if (k === 'default_backend' && secType === 'listen') {
        validateDefaultBackend(lineNum, rest, issues, knownBackends)
      }
      else if (k === 'default_backend' && secType === 'backend') {
        issues.push({ line: lineNum, severity: 'warning', message: 'default_backend in a backend section has no effect' })
      }
      else if (k === 'use_backend') validateUseBackend(lineNum, rest, issues, knownBackends)
      else if (k === 'server') validateServer(lineNum, line, issues, feat)
      else if (k === 'server-template') validateServerTemplate(lineNum, line, issues)
      else if (k === 'bind') validateBind(lineNum, line, issues, feat)
      else if (k === 'mode') validateMode(lineNum, rest, issues)
      else if (k === 'balance') validateBalance(lineNum, rest, issues, feat)
      else if (k === 'hash-type') validateHashType(lineNum, rest, issues)
      else if (k === 'acl') validateACL(lineNum, rest, issues)
      else if (k === 'http-request') validateHttpRequestRule(lineNum, rest, issues, feat)
      else if (k === 'http-response') validateHttpResponseRule(lineNum, rest, issues, feat)
      else if (k === 'http-after-response') validateHttpResponseRule(lineNum, rest, issues, feat)
      else if (k === 'tcp-request') validateTcpRequestRule(lineNum, rest, issues, feat)
      else if (k === 'tcp-response') validateTcpResponseRule(lineNum, rest, issues)
      else if (k === 'cookie') validateCookie(lineNum, rest, issues)
      else if (k === 'stick-table') validateStickTable(lineNum, rest, issues)
      else if (k === 'option') validateOption(lineNum, secType, rest, issues, feat)
      else if (k === 'timeout') validateTimeout(lineNum, rest, issues)
      else if (k === 'retries') validateRetries(lineNum, rest, issues)
      else if (k === 'maxconn') validateMaxconn(lineNum, rest, issues)
      else if (k === 'fullconn') validateFullconn(lineNum, rest, issues)
      else if (k === 'log') validateLog(lineNum, rest, issues)
      else if (k === 'log-format' || k === 'log-format-sd') validateLogFormat(lineNum, rest, issues)
      else if (k === 'http-reuse') validateHttpReuse(lineNum, rest, issues)
      else if (k === 'unique-id-format' || k === 'unique-id-header') validateUniqueId(lineNum, k, rest, issues)
      else if (k === 'stats') validateStats(lineNum, rest, issues)
      else if (k === 'source') validateSource(lineNum, rest, issues)
      else if (k === 'capture') validateCapture(lineNum, rest, issues)
      else if (k === 'redirect') validateRedirect(lineNum, rest, issues)
      else if (k === 'compression') validateCompression(lineNum, line, issues)
      else if (k === 'http-check') validateHttpCheck(lineNum, rest, issues)
      else if (k === 'tcp-check') validateTcpCheck(lineNum, rest, issues)
      else if (k === 'monitor-uri') validateMonitorUri(lineNum, rest, issues)
      else if (k === 'monitor' && rest.split(/\s+/)[0].toLowerCase() === 'fail') validateMonitorFail(lineNum, rest, issues)
      else if (k === 'ignore-persist' || k === 'ignore_persist') validateIgnorePersist(lineNum, rest, issues)
      else if (k === 'force-persist') validateForcePersist(lineNum, rest, issues)
      else if (k === 'external-check') validateExternalCheck(lineNum, secType, rest, issues)
      else if (GLOBAL_DIRECTIVES.has(k)) {
        if (secType === 'global') validateGlobalDirective(lineNum, k, rest, issues)
      }
    }
  }

  for (const st of ['frontend', 'backend', 'listen']) {
    const names = st === 'frontend' ? namedSections.frontends
      : st === 'backend' ? namedSections.backends
      : namedSections.listens
    const seen = new Set()
    for (const name of names) {
      if (seen.has(name)) {
        issues.push({ line: 1, severity: 'error', message: `Duplicate ${st} section name '${name}'` })
      }
      seen.add(name)
    }
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    message: issues.length
      ? `${issues.length} issue(s) found (${issues.filter(i => i.severity === 'error').length} errors, ${issues.filter(i => i.severity === 'warning').length} warnings)`
      : 'No issues detected',
    issues,
  }
}
