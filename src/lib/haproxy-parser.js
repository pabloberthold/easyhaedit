// HAProxy .cfg Parser — pure JavaScript port of backend/app/services/parser.py
// Parses raw haproxy.cfg text into a structured config object

const SECTION_RE = /^(global|defaults|frontend|backend|listen|resolvers|peers|userlist|program)\s*(.*)?$/

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
    const stripped = line.trim()
    if (!stripped) continue
    const m = stripped.match(SECTION_RE)
    if (m) {
      if (curType !== null) result.push([curType, curName, curLines])
      curType = m[1]
      curName = (m[2] || '').trim()
      curLines = []
    } else if (curType !== null) {
      curLines.push(stripped)
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

function parseIntOr(val, fallback) {
  const n = parseInt(val)
  return isNaN(n) ? fallback : n
}

// ── Timeout parser ──────────────────────────────────────────────────────────

const TIMEOUT_MAP = {
  connect: 'connect', client: 'client', 'client-fin': 'client_fin',
  server: 'server', 'server-fin': 'server_fin', tunnel: 'tunnel',
  'http-request': 'http_request', 'http-keep-alive': 'http_keep_alive',
  check: 'check', queue: 'queue',
}

function parseTimeout(rest, ts) {
  const parts = rest.split(/\s+/, 2)
  if (!parts.length) return false
  const sub = parts[0].toLowerCase()
  const val = parts.length > 1 ? parts[1] : ''
  if (sub in TIMEOUT_MAP) {
    ts[TIMEOUT_MAP[sub]] = val
    return true
  }
  return false
}

// ── Global handlers ─────────────────────────────────────────────────────────

const GLOBAL_HANDLERS = []

// (handlers are registered below)

function parseGlobal(lines) {
  const d = {
    log: [], stats_socket: [], cpu_map: [], set_var: [],
    setenv: [], presetenv: [], extra_lines: [],
    daemon: false, master_worker: false,
    expose_experimental_directives: false,
    external_check: false, insecure_fork_wanted: false,
  }
  for (const line of lines) {
    const [k, rest] = kv(line)
    const kl = k.toLowerCase()
    const handled = GLOBAL_HANDLERS.some(h => h(kl, rest, line, d))
    if (!handled) d.extra_lines.push(line)
  }
  return d
}

function gLog(kl, rest, line, d) { if (kl === 'log') { d.log.push(rest); return true } return false }
function gChroot(kl, rest, line, d) { if (kl === 'chroot') { d.chroot = rest; return true } return false }
function gUser(kl, rest, line, d) { if (kl === 'user') { d.user = rest; return true } return false }
function gGroup(kl, rest, line, d) { if (kl === 'group') { d.group = rest; return true } return false }
function gUid(kl, rest, line, d) { if (kl === 'uid') { d.uid = parseIntOr(rest); if (d.uid == null) d.extra_lines.push(line); return true } return false }
function gGid(kl, rest, line, d) { if (kl === 'gid') { d.gid = parseIntOr(rest); if (d.gid == null) d.extra_lines.push(line); return true } return false }
function gDaemon(kl, rest, line, d) { if (kl === 'daemon') { d.daemon = true; return true } return false }
function gMasterWorker(kl, rest, line, d) { if (kl === 'master-worker') { d.master_worker = true; return true } return false }
function gExposeExp(kl, rest, line, d) { if (kl === 'expose-experimental-directives') { d.expose_experimental_directives = true; return true } return false }
function gMaxconn(kl, rest, line, d) { if (kl === 'maxconn') { d.maxconn = parseIntOr(rest); if (d.maxconn == null) d.extra_lines.push(line); return true } return false }
function gNbproc(kl, rest, line, d) { if (kl === 'nbproc') { d.nbproc = parseIntOr(rest); if (d.nbproc == null) d.extra_lines.push(line); return true } return false }
function gNbthread(kl, rest, line, d) { if (kl === 'nbthread') { d.nbthread = parseIntOr(rest); if (d.nbthread == null) d.extra_lines.push(line); return true } return false }
function gCpuMap(kl, rest, line, d) { if (kl === 'cpu-map') { d.cpu_map.push(rest); return true } return false }
function gNuma(kl, rest, line, d) { if (kl === 'numa-cpu-mapping') { d.numa_cpu_mapping = rest; return true } return false }
function gUlimitN(kl, rest, line, d) { if (kl === 'ulimit-n') { d.ulimit_n = parseIntOr(rest); if (d.ulimit_n == null) d.extra_lines.push(line); return true } return false }
function gPidfile(kl, rest, line, d) { if (kl === 'pidfile') { d.pidfile = rest; return true } return false }
function gDescription(kl, rest, line, d) { if (kl === 'description') { d.description = rest; return true } return false }
function gNode(kl, rest, line, d) { if (kl === 'node') { d.node = rest; return true } return false }
function gLocalpeer(kl, rest, line, d) { if (kl === 'localpeer') { d.localpeer = rest; return true } return false }
function gStats(kl, rest, line, d) {
  if (kl !== 'stats') return false
  const [sub, sv] = kv(rest)
  if (sub === 'socket') d.stats_socket.push(sv)
  else if (sub === 'timeout') d.stats_timeout = sv
  else if (sub === 'maxconn') { const n = parseInt(sv); if (!isNaN(n)) d.stats_maxconn = n; else d.extra_lines.push(line) }
  else d.extra_lines.push(line)
  return true
}
function gLogSendHost(kl, rest, line, d) { if (kl === 'log-send-hostname') { d.log_send_hostname = rest; return true } return false }
function gLogTag(kl, rest, line, d) { if (kl === 'log-tag') { d.log_tag = rest; return true } return false }
function gCaBase(kl, rest, line, d) { if (kl === 'ca-base') { d.ca_base = rest; return true } return false }
function gCrtBase(kl, rest, line, d) { if (kl === 'crt-base') { d.crt_base = rest; return true } return false }
function gSslBindCiphers(kl, rest, line, d) { if (kl === 'ssl-default-bind-ciphers') { d.ssl_default_bind_ciphers = rest; return true } return false }
function gSslBindCiphersuites(kl, rest, line, d) { if (kl === 'ssl-default-bind-ciphersuites') { d.ssl_default_bind_ciphersuites = rest; return true } return false }
function gSslBindOptions(kl, rest, line, d) { if (kl === 'ssl-default-bind-options') { d.ssl_default_bind_options = rest; return true } return false }
function gSslServerCiphers(kl, rest, line, d) { if (kl === 'ssl-default-server-ciphers') { d.ssl_default_server_ciphers = rest; return true } return false }
function gSslServerCiphersuites(kl, rest, line, d) { if (kl === 'ssl-default-server-ciphersuites') { d.ssl_default_server_ciphersuites = rest; return true } return false }
function gSslServerOptions(kl, rest, line, d) { if (kl === 'ssl-default-server-options') { d.ssl_default_server_options = rest; return true } return false }
function gSslDh(kl, rest, line, d) { if (kl === 'ssl-dh-param-file') { d.ssl_dh_param_file = rest; return true } return false }
function gSslVerify(kl, rest, line, d) { if (kl === 'ssl-server-verify') { d.ssl_server_verify = rest; return true } return false }
function gTuneMaxrecord(kl, rest, line, d) { if (kl === 'tune.ssl.maxrecord') { d.tune_ssl_maxrecord = parseIntOr(rest); if (d.tune_ssl_maxrecord == null) d.extra_lines.push(line); return true } return false }
function gTuneMaxrewrite(kl, rest, line, d) { if (kl === 'tune.maxrewrite') { d.tune_maxrewrite = parseIntOr(rest); if (d.tune_maxrewrite == null) d.extra_lines.push(line); return true } return false }
function gTuneBufsize(kl, rest, line, d) { if (kl === 'tune.bufsize') { d.tune_bufsize = parseIntOr(rest); if (d.tune_bufsize == null) d.extra_lines.push(line); return true } return false }
function gTuneMaxhdr(kl, rest, line, d) { if (kl === 'tune.http.maxhdr') { d.tune_http_maxhdr = parseIntOr(rest); if (d.tune_http_maxhdr == null) d.extra_lines.push(line); return true } return false }
function gTuneIdlePool(kl, rest, line, d) { if (kl === 'tune.idle-pool.shared') { d.tune_idle_pool_shared = rest; return true } return false }
function gTuneRcvbufClient(kl, rest, line, d) { if (kl === 'tune.rcvbuf.client') { d.tune_rcvbuf_client = parseIntOr(rest); if (d.tune_rcvbuf_client == null) d.extra_lines.push(line); return true } return false }
function gTuneRcvbufServer(kl, rest, line, d) { if (kl === 'tune.rcvbuf.server') { d.tune_rcvbuf_server = parseIntOr(rest); if (d.tune_rcvbuf_server == null) d.extra_lines.push(line); return true } return false }
function gTuneSndbufClient(kl, rest, line, d) { if (kl === 'tune.sndbuf.client') { d.tune_sndbuf_client = parseIntOr(rest); if (d.tune_sndbuf_client == null) d.extra_lines.push(line); return true } return false }
function gTuneSndbufServer(kl, rest, line, d) { if (kl === 'tune.sndbuf.server') { d.tune_sndbuf_server = parseIntOr(rest); if (d.tune_sndbuf_server == null) d.extra_lines.push(line); return true } return false }
function gExtCheck(kl, rest, line, d) { if (kl === 'external-check') { d.external_check = true; return true } return false }
function gInsecureFork(kl, rest, line, d) { if (kl === 'insecure-fork-wanted') { d.insecure_fork_wanted = true; return true } return false }
function gSetVar(kl, rest, line, d) { if (kl === 'set-var') { d.set_var.push(rest); return true } return false }
function gSetenv(kl, rest, line, d) { if (kl === 'setenv') { d.setenv.push(rest); return true } return false }
function gPresetenv(kl, rest, line, d) { if (kl === 'presetenv') { d.presetenv.push(rest); return true } return false }

GLOBAL_HANDLERS.push(
  gLog, gChroot, gUser, gGroup, gUid, gGid, gDaemon, gMasterWorker,
  gExposeExp, gMaxconn, gNbproc, gNbthread, gCpuMap, gNuma, gUlimitN,
  gPidfile, gDescription, gNode, gLocalpeer, gStats,
  gLogSendHost, gLogTag, gCaBase, gCrtBase,
  gSslBindCiphers, gSslBindCiphersuites, gSslBindOptions,
  gSslServerCiphers, gSslServerCiphersuites, gSslServerOptions,
  gSslDh, gSslVerify,
  gTuneMaxrecord, gTuneMaxrewrite, gTuneBufsize, gTuneMaxhdr,
  gTuneIdlePool, gTuneRcvbufClient, gTuneRcvbufServer,
  gTuneSndbufClient, gTuneSndbufServer,
  gExtCheck, gInsecureFork,
  gSetVar, gSetenv, gPresetenv,
)

// ── Defaults handlers ───────────────────────────────────────────────────────

function hMode(k, rest, line, ctx) { if (k === 'mode') { ctx.d.mode = rest; return true } return false }
function hDefaultsLog(k, rest, line, ctx) { if (k === 'log') { ctx.d.log.push(rest); return true } return false }
function hOption(k, rest, line, ctx) { if (k === 'option') { ctx.d.options.push(rest); return true } return false }
function hTimeout(k, rest, line, ctx) { if (k === 'timeout') { if (!parseTimeout(rest, ctx.ts)) ctx.d.extra_lines.push(line); return true } return false }
function hRetries(k, rest, line, ctx) { if (k === 'retries') { const n = parseInt(rest); if (!isNaN(n)) ctx.d.retries = n; else ctx.d.extra_lines.push(line); return true } return false }
function hDefaultsMaxconn(k, rest, line, ctx) { if (k === 'maxconn') { ctx.d.maxconn = parseIntOr(rest); if (ctx.d.maxconn == null) ctx.d.extra_lines.push(line); return true } return false }
function hBalance(k, rest, line, ctx) { if (k === 'balance') { ctx.d.balance = rest; return true } return false }
function hHashType(k, rest, line, ctx) { if (k === 'hash-type') { ctx.d.hash_type = rest; return true } return false }
function hLogFormat(k, rest, line, ctx) { if (k === 'log-format') { ctx.d.log_format = rest; return true } return false }
function hLogFormatSd(k, rest, line, ctx) { if (k === 'log-format-sd') { ctx.d.log_format_sd = rest; return true } return false }
function hDefaultsLogTag(k, rest, line, ctx) { if (k === 'log-tag') { ctx.d.log_tag = rest; return true } return false }
function hHttpReuse(k, rest, line, ctx) { if (k === 'http-reuse') { ctx.d.http_reuse = rest; return true } return false }
function hUniqueIdFormat(k, rest, line, ctx) { if (k === 'unique-id-format') { ctx.d.unique_id_format = rest; return true } return false }
function hUniqueIdHeader(k, rest, line, ctx) { if (k === 'unique-id-header') { ctx.d.unique_id_header = rest; return true } return false }
function hErrorfile(k, rest, line, ctx) { if (k === 'errorfile') { ctx.d.errorfile.push(rest); return true } return false }
function hErrorloc(k, rest, line, ctx) { if (k === 'errorloc') { ctx.d.errorloc.push(rest); return true } return false }
function hErrorloc302(k, rest, line, ctx) { if (k === 'errorloc302') { ctx.d.errorloc302.push(rest); return true } return false }

function hDefaultsStats(k, rest, line, ctx) {
  if (k !== 'stats') return false
  const [sub, sv] = kv(rest)
  if (sub === 'uri') ctx.d.stats_uri = sv
  else if (sub === 'realm') ctx.d.stats_realm = sv
  else if (sub === 'auth') ctx.d.stats_auth.push(sv)
  else if (sub === 'refresh') ctx.d.stats_refresh = sv
  else if (sub === 'admin') ctx.d.stats_admin = sv
  else ctx.d.extra_lines.push(line)
  return true
}

function hLoadState(k, rest, line, ctx) { if (k === 'load-server-state-from-file') { ctx.d.load_server_state_from_file = rest; return true } return false }

const DEFAULTS_HANDLERS = [
  hMode, hDefaultsLog, hOption, hTimeout, hRetries, hDefaultsMaxconn,
  hBalance, hHashType, hLogFormat, hLogFormatSd, hDefaultsLogTag,
  hHttpReuse, hUniqueIdFormat, hUniqueIdHeader,
  hErrorfile, hErrorloc, hErrorloc302, hDefaultsStats, hLoadState,
]

// ── Defaults ────────────────────────────────────────────────────────────────

function parseDefaults(name, lines) {
  const d = {
    name: name || null, log: [], options: [], errorfile: [], errorloc: [],
    errorloc302: [], stats_auth: [], extra_lines: [],
  }
  const ts = {}
  const ctx = { d, ts }

  for (const line of lines) {
    const [k, rest] = kvLower(line)
    const handled = DEFAULTS_HANDLERS.some(h => h(k, rest, line, ctx))
    if (!handled) d.extra_lines.push(line)
  }

  d.timeouts = ts
  return d
}

// ── Server parser ──────────────────────────────────────────────────────────

function parseServer(line) {
  const parts = line.split(/\s+/)
  if (parts.length < 3) return null
  const name = parts[1]
  const addrPort = parts[2].lastIndexOf(':')
  if (addrPort === -1) return null
  const address = parts[2].slice(0, addrPort)
  const port = parseInt(parts[2].slice(addrPort + 1))
  if (isNaN(port)) return null

  const srv = {
    name, address, port,
    check: false, ssl: false, backup: false, disabled: false,
    extra_params: [],
  }
  const params = parts.slice(3)
  let pi = 0
  while (pi < params.length) {
    const p = params[pi].toLowerCase()
    if (p === 'check') srv.check = true
    else if (p === 'no-check') srv.check = false
    else if (p === 'ssl') srv.ssl = true
    else if (p === 'backup') srv.backup = true
    else if (p === 'disabled') srv.disabled = true
    else if (p === 'weight' && pi + 1 < params.length) { const n = parseInt(params[pi + 1]); if (!isNaN(n)) { srv.weight = n; pi++ } else srv.extra_params.push(params[pi]) }
    else if (p === 'maxconn' && pi + 1 < params.length) { const n = parseInt(params[pi + 1]); if (!isNaN(n)) { srv.maxconn = n; pi++ } else srv.extra_params.push(params[pi]) }
    else if (p === 'inter' && pi + 1 < params.length) { srv.check_inter = params[pi + 1]; pi++ }
    else if (p === 'rise' && pi + 1 < params.length) { const n = parseInt(params[pi + 1]); if (!isNaN(n)) { srv.check_rise = n; pi++ } else srv.extra_params.push(params[pi]) }
    else if (p === 'fall' && pi + 1 < params.length) { const n = parseInt(params[pi + 1]); if (!isNaN(n)) { srv.check_fall = n; pi++ } else srv.extra_params.push(params[pi]) }
    else if (p === 'verify' && pi + 1 < params.length) { srv.verify = params[pi + 1]; pi++ }
    else if (p === 'sni' && pi + 1 < params.length) { srv.sni = params[pi + 1]; pi++ }
    else if (p === 'track' && pi + 1 < params.length) { srv.track = params[pi + 1]; pi++ }
    else if (p === 'on-error' && pi + 1 < params.length) { srv.on_error = params[pi + 1]; pi++ }
    else if (p === 'resolvers' && pi + 1 < params.length) { srv.resolvers = params[pi + 1]; pi++ }
    else if (p === 'init-addr' && pi + 1 < params.length) { srv.init_addr = params[pi + 1]; pi++ }
    else srv.extra_params.push(params[pi])
    pi++
  }
  return srv
}

function parseServerTemplate(line) {
  const parts = line.split(/\s+/)
  if (parts.length < 4) return null
  const prefix = parts[1], count = parts[2]
  const addrPort = parts[3].lastIndexOf(':')
  if (addrPort === -1) return null
  const address = parts[3].slice(0, addrPort)
  const port = parseInt(parts[3].slice(addrPort + 1))
  if (isNaN(port)) return null
  return { prefix, count, address, port, extra_params: parts.slice(4) }
}

// ── Stick table ────────────────────────────────────────────────────────────

function parseStickTable(rest) {
  const d = { store: [] }
  const tokens = rest.split(/\s+/)
  let i = 0
  while (i < tokens.length) {
    const t = tokens[i].toLowerCase()
    if (t === 'type' && i + 1 < tokens.length) { d.type = tokens[i + 1]; i += 2 }
    else if (t === 'size' && i + 1 < tokens.length) { d.size = tokens[i + 1]; i += 2 }
    else if (t === 'expire' && i + 1 < tokens.length) { d.expire = tokens[i + 1]; i += 2 }
    else if (t === 'nopurge') { d.nopurge = true; i++ }
    else if (t === 'peers' && i + 1 < tokens.length) { d.peers = tokens[i + 1]; i += 2 }
    else if (t === 'srvkey' && i + 1 < tokens.length) { d.srvkey = tokens[i + 1]; i += 2 }
    else if (t === 'write-to' && i + 1 < tokens.length) { d.write_to = tokens[i + 1]; i += 2 }
    else if (t === 'store' && i + 1 < tokens.length) { d.store = tokens[i + 1].split(','); i += 2 }
    else i++
  }
  return { type: d.type || 'ip', size: d.size || '100k', ...d }
}

// ── Cookie ─────────────────────────────────────────────────────────────────

function parseCookie(rest) {
  const parts = rest.split(/\s+/)
  if (parts.length < 2) return null
  const d = {
    name: parts[0], method: parts[1],
    indirect: false, nocache: false, postonly: false,
    preserve: false, httponly: false, secure: false,
  }
  const validMethods = ['rewrite', 'insert', 'prefix']
  if (!validMethods.includes(d.method)) return null
  let i = 2
  while (i < parts.length) {
    const p = parts[i].toLowerCase()
    if (p === 'indirect') d.indirect = true
    else if (p === 'nocache') d.nocache = true
    else if (p === 'postonly') d.postonly = true
    else if (p === 'preserve') d.preserve = true
    else if (p === 'httponly') d.httponly = true
    else if (p === 'secure') d.secure = true
    else if (p === 'domain' && i + 1 < parts.length) { d.domain = parts[i + 1]; i++ }
    else if (p === 'maxidle' && i + 1 < parts.length) { d.maxidle = parts[i + 1]; i++ }
    else if (p === 'maxlife' && i + 1 < parts.length) { d.maxlife = parts[i + 1]; i++ }
    else if (p === 'attr' && i + 1 < parts.length) { d.attr = parts[i + 1]; i++ }
    i++
  }
  return d
}

// ── Health options ─────────────────────────────────────────────────────────

const HEALTH_OPT_DIRECTIVES = new Set([
  'httpchk', 'smtpchk', 'mysql-check', 'pgsql-check', 'redis-check',
  'ssl-hello-chk', 'tcp-check',
])

function parseHealthOptions(line, hc) {
  const [k, rest] = kvLower(line)
  if (k === 'option') {
    const [opt, optrest] = kv(rest)
    const ol = opt.toLowerCase()
    if (ol === 'httpchk') { hc.option_httpchk = optrest || ''; return true }
    else if (ol === 'smtpchk') { hc.option_smtpchk = optrest; return true }
    else if (ol === 'mysql-check') { hc.option_mysql_check = optrest; return true }
    else if (ol === 'pgsql-check') { hc.option_pgsql_check = true; return true }
    else if (ol === 'redis-check') { hc.option_redis_check = true; return true }
    else if (ol === 'ssl-hello-chk') { hc.option_ssl_hello_chk = true; return true }
    else if (ol === 'tcp-check') { hc.option_tcp_check = true; return true }
  } else if (k === 'http-check') {
    const [sub, sv] = kv(rest)
    const sl = sub.toLowerCase()
    if (sl === 'expect') { hc.http_check_expect = sv; return true }
    else if (sl === 'send') { hc.http_check_send = sv; return true }
    else if (sl === 'connect') { hc.http_check_connect = sv; return true }
  } else if (k === 'tcp-check') {
    if (!hc.tcp_check_rules) hc.tcp_check_rules = []
    hc.tcp_check_rules.push(rest)
    return true
  }
  return false
}

// ── Proxy directive handlers ───────────────────────────────────────────────

function handleMode(k, rest, line, ctx) { if (k === 'mode') { ctx.d.mode = rest; return true } return false }
function handleBalance(k, rest, line, ctx) { if (k === 'balance') { ctx.d.balance = rest; return true } return false }
function handleHashType(k, rest, line, ctx) { if (k === 'hash-type') { ctx.d.hash_type = rest; return true } return false }
function handleMaxconn(k, rest, line, ctx) { if (k === 'maxconn') { const n = parseInt(rest); if (!isNaN(n)) ctx.d.maxconn = n; else ctx.d.extra_lines.push(line); return true } return false }
function handleFullconn(k, rest, line, ctx) { if (k === 'fullconn') { const n = parseInt(rest); if (!isNaN(n)) ctx.d.fullconn = n; else ctx.d.extra_lines.push(line); return true } return false }
function handleBind(k, rest, line, ctx) { if (k === 'bind') { if (!ctx.d.bind) ctx.d.bind = []; ctx.d.bind.push(rest); return true } return false }

function handleOption(k, rest, line, ctx) {
  if (k !== 'option') return false
  const opt = rest.split(/\s+/)[0].toLowerCase()
  if (HEALTH_OPT_DIRECTIVES.has(opt)) {
    parseHealthOptions(line, ctx.hc)
  } else {
    ctx.d.options.push(rest)
  }
  return true
}
function handleHttpCheck(k, rest, line, ctx) { if (k === 'http-check' || k === 'tcp-check') { if (!parseHealthOptions(line, ctx.hc)) ctx.d.extra_lines.push(line); return true } return false }
function handleLog(k, rest, line, ctx) { if (k === 'log') { ctx.d.log.push(rest); return true } return false }
function handleLogFormat(k, rest, line, ctx) { if (k === 'log-format') { ctx.d.log_format = rest; return true } return false }
function handleLogFormatSd(k, rest, line, ctx) { if (k === 'log-format-sd') { ctx.d.log_format_sd = rest; return true } return false }
function handleLogTag(k, rest, line, ctx) { if (k === 'log-tag') { ctx.d.log_tag = rest; return true } return false }
function handleTimeout(k, rest, line, ctx) { if (k === 'timeout') { if (!parseTimeout(rest, ctx.ts)) ctx.d.extra_lines.push(line); return true } return false }

function handleAcl(k, rest, line, ctx) {
  if (k !== 'acl') return false
  const parts = rest.split(/\s+/, 2)
  if (parts.length === 2) ctx.d.acls.push({ name: parts[0], criterion: parts[1] })
  else ctx.d.extra_lines.push(line)
  return true
}

function handleHttpAction(keyName, target, k, rest, line, ctx) {
  if (k !== keyName) return false
  const m = rest.match(/\s+(if|unless)\s+(.+)$/)
  const action = m ? rest.slice(0, m.index).trim() : rest
  const cond = m ? m[0].trim() : null
  ctx.d[target].push({ action, condition: cond })
  return true
}
function handleHttpRequest(k, rest, line, ctx) { return handleHttpAction('http-request', 'http_request', k, rest, line, ctx) }
function handleHttpResponse(k, rest, line, ctx) { return handleHttpAction('http-response', 'http_response', k, rest, line, ctx) }
function handleHttpAfterResponse(k, rest, line, ctx) { return handleHttpAction('http-after-response', 'http_after_response', k, rest, line, ctx) }

function handleTcpAction(keyName, target, validTypes, k, rest, line, ctx) {
  if (k !== keyName) return false
  const parts = rest.split(/\s+/, 2)
  const tcpType = parts[0].toLowerCase()
  const tcpRest = parts.length > 1 ? parts[1] : ''
  const m = tcpRest.match(/\s+(if|unless)\s+(.+)$/)
  const action = m ? tcpRest.slice(0, m.index).trim() : tcpRest
  const cond = m ? m[0].trim() : null
  if (validTypes.includes(tcpType)) ctx.d[target].push({ type: tcpType, action, condition: cond })
  else ctx.d.extra_lines.push(line)
  return true
}
const TCP_REQ_TYPES = ['connection', 'content', 'session', 'inspect-delay']
const TCP_RESP_TYPES = ['content', 'inspect-delay']
function handleTcpRequest(k, rest, line, ctx) { return handleTcpAction('tcp-request', 'tcp_request', TCP_REQ_TYPES, k, rest, line, ctx) }
function handleTcpResponse(k, rest, line, ctx) { return handleTcpAction('tcp-response', 'tcp_response', TCP_RESP_TYPES, k, rest, line, ctx) }

function handleUseBackend(k, rest, line, ctx) {
  if (k !== 'use_backend') return false
  const parts = rest.split(/\s+/, 2)
  ctx.d.use_backends.push({ backend: parts[0], condition: parts[1] || null })
  return true
}
function handleDefaultBackend(k, rest, line, ctx) {
  if (k !== 'default_backend') return false
  ctx.d.default_backend = rest.split(/\s+/)[0]
  return true
}
function handleStickTable(k, rest, line, ctx) { if (k === 'stick-table') { ctx.d.stick_table = parseStickTable(rest); return true } return false }

function handleStick(k, rest, line, ctx) {
  if (k !== 'stick') return false
  const parts = rest.split(/\s+/, 3)
  if (parts.length) {
    const action = parts[0].toLowerCase()
    const valid = ['store-request', 'match', 'on', 'store-response']
    if (valid.includes(action) && parts.length >= 2) {
      const expr = parts[1]
      let extra = parts.length > 2 ? parts[2] : ''
      let table = null
      const tm = extra.match(/table\s+(\S+)/)
      if (tm) {
        table = tm[1]
        extra = extra.slice(0, tm.index).trim() + ' ' + extra.slice(tm.index + tm[0].length).trim()
        extra = extra.trim()
      }
      const cond = extra || null
      ctx.d.stick_rules.push({ action, expression: expr, table, condition: cond })
    } else ctx.d.extra_lines.push(line)
  } else ctx.d.extra_lines.push(line)
  return true
}
function handleCookie(k, rest, line, ctx) { if (k === 'cookie') { const c = parseCookie(rest); if (c) ctx.d.cookie = c; else ctx.d.extra_lines.push(line); return true } return false }

function handleCompression(k, rest, line, ctx) {
  if (k !== 'compression') return false
  const [sub, sv] = kv(rest)
  const sl = sub.toLowerCase()
  if (sl === 'algo') ctx.d._comp_algo = sv
  else if (sl === 'type') {
    if (!ctx.d._comp_types) ctx.d._comp_types = []
    sv.split(/\s+/).forEach(t => ctx.d._comp_types.push(t))
  }
  else if (sl === 'offload') ctx.d._comp_offload = true
  else ctx.d.extra_lines.push(line)
  return true
}
function handleServer(k, rest, line, ctx) { if (k === 'server' && line.split(/\s+/).length >= 3) { const srv = parseServer(line); if (srv) ctx.d.servers.push(srv); else ctx.d.extra_lines.push(line); return true } return false }
function handleServerTemplate(k, rest, line, ctx) { if (k === 'server-template') { const st = parseServerTemplate(line); if (st) ctx.d.server_templates.push(st); else ctx.d.extra_lines.push(line); return true } return false }
function handleServerDefaults(k, rest, line, ctx) { if (k === 'server-defaults') { ctx.d.server_defaults = { params: rest }; return true } return false }
function handleHttpReuse(k, rest, line, ctx) { if (k === 'http-reuse') { ctx.d.http_reuse = rest; return true } return false }
function handleHttpSendNameHeader(k, rest, line, ctx) { if (k === 'http-send-name-header') { ctx.d.http_send_name_header = rest; return true } return false }
function handleRedirect(k, rest, line, ctx) { if (k === 'redirect') { ctx.d.redirect.push(rest); return true } return false }
function handleSource(k, rest, line, ctx) { if (k === 'source') { ctx.d.source = rest; return true } return false }
function handleIgnorePersist(k, rest, line, ctx) { if (k === 'ignore-persist' || k === 'ignore_persist') { ctx.d.ignore_persist.push(rest); return true } return false }
function handleForcePersist(k, rest, line, ctx) { if (k === 'force-persist') { ctx.d.force_persist.push(rest); return true } return false }

function handleExternalCheck(k, rest, line, ctx) {
  if (k !== 'external-check') return false
  const [sub, sv] = kv(rest)
  if (sub === 'command') ctx.d.external_check_command = sv
  else if (sub === 'path') ctx.d.external_check_path = sv
  else ctx.d.extra_lines.push(line)
  return true
}
function handleErrorfile(k, rest, line, ctx) { if (k === 'errorfile') { ctx.d.errorfile.push(rest); return true } return false }
function handleErrorloc(k, rest, line, ctx) { if (k === 'errorloc') { if (!ctx.d.errorloc) ctx.d.errorloc = []; ctx.d.errorloc.push(rest); return true } return false }

function handleStats(k, rest, line, ctx) {
  if (k !== 'stats') return false
  const [sub, sv] = kv(rest)
  if (sub === 'uri') ctx.d.stats_uri = sv
  else if (sub === 'realm') ctx.d.stats_realm = sv
  else if (sub === 'auth') ctx.d.stats_auth.push(sv)
  else if (sub === 'refresh') ctx.d.stats_refresh = sv
  else if (sub === 'admin') ctx.d.stats_admin = sv
  else if (sub === 'show-legends') ctx.d.stats_show_legends = true
  else if (sub === 'show-node') ctx.d.stats_show_node = sv
  else if (sub === 'hide-version') ctx.d.stats_hide_version = true
  else if (sub === 'enable' || sub === 'disable') ctx.d.extra_lines.push(line)
  else ctx.d.extra_lines.push(line)
  return true
}
function handleUniqueIdFormat(k, rest, line, ctx) { if (k === 'unique-id-format') { ctx.d.unique_id_format = rest; return true } return false }
function handleUniqueIdHeader(k, rest, line, ctx) { if (k === 'unique-id-header') { ctx.d.unique_id_header = rest; return true } return false }

function handleCapture(k, rest, line, ctx) {
  if (k !== 'capture') return false
  const [sub, sv] = kv(rest)
  if (sub === 'request') {
    if (!ctx.d.capture_request_header) ctx.d.capture_request_header = []
    ctx.d.capture_request_header.push(sv.replace(/^header\s+/, ''))
  } else if (sub === 'response') {
    if (!ctx.d.capture_response_header) ctx.d.capture_response_header = []
    ctx.d.capture_response_header.push(sv.replace(/^header\s+/, ''))
  } else ctx.d.extra_lines.push(line)
  return true
}
function handleMonitorUri(k, rest, line, ctx) { if (k === 'monitor-uri') { ctx.d.monitor_uri = rest; return true } return false }

function handleMonitor(k, rest, line, ctx) {
  if (k !== 'monitor') return false
  const [sub, sv] = kv(rest)
  if (sub === 'fail') { if (!ctx.d.monitor_fail) ctx.d.monitor_fail = []; ctx.d.monitor_fail.push(sv) }
  else ctx.d.extra_lines.push(line)
  return true
}
function handleRandom(k, rest, line, ctx) {
  if (k !== 'random') return false
  const [sub, sv] = kv(rest)
  if (sub === 'draws') { const n = parseInt(sv); if (!isNaN(n)) ctx.d.random_draws = n; else ctx.d.extra_lines.push(line) }
  else ctx.d.extra_lines.push(line)
  return true
}

const PROXY_HANDLERS = [
  handleMode, handleBalance, handleHashType,
  handleMaxconn, handleFullconn, handleBind,
  handleOption, handleHttpCheck,
  handleLog, handleLogFormat, handleLogFormatSd, handleLogTag,
  handleTimeout, handleAcl,
  handleHttpRequest, handleHttpResponse, handleHttpAfterResponse,
  handleTcpRequest, handleTcpResponse,
  handleUseBackend, handleDefaultBackend,
  handleStickTable, handleStick, handleCookie,
  handleCompression, handleServer, handleServerTemplate, handleServerDefaults,
  handleHttpReuse, handleHttpSendNameHeader,
  handleRedirect, handleSource,
  handleIgnorePersist, handleForcePersist,
  handleExternalCheck, handleErrorfile, handleErrorloc,
  handleStats, handleUniqueIdFormat, handleUniqueIdHeader,
  handleCapture, handleMonitorUri, handleMonitor, handleRandom,
]

// ── Proxy common ───────────────────────────────────────────────────────────

function parseProxyCommon(lines) {
  const d = {
    options: [], log: [], acls: [],
    http_request: [], http_response: [], http_after_response: [],
    tcp_request: [], tcp_response: [],
    use_backends: [], stick_rules: [],
    errorfile: [], errorloc: [], stats_auth: [],
    servers: [], server_templates: [],
    redirect: [], ignore_persist: [], force_persist: [],
    extra_lines: [],
  }
  const ts = {}
  const hc = { tcp_check_rules: [] }
  const ctx = { d, ts, hc }

  for (const line of lines) {
    const [k, rest] = kvLower(line)
    const handled = PROXY_HANDLERS.some(h => h(k, rest, line, ctx))
    if (!handled) d.extra_lines.push(line)
  }

  d.timeouts = ts

  if (d._comp_algo || (d._comp_types && d._comp_types.length) || d._comp_offload) {
    d.compression = { algo: d._comp_algo || null, type: d._comp_types || [], offload: d._comp_offload || false }
    delete d._comp_algo; delete d._comp_types; delete d._comp_offload
  }

  const hasHC = Object.values(hc).some(v => v !== false && v !== undefined && !(Array.isArray(v) && v.length === 0))
  if (hasHC) d.health_check = hc

  return d
}

// ── Resolvers handlers ──────────────────────────────────────────────────────

function rNameserver(k, rest, line, d) { if (k === 'nameserver') { d.nameservers.push(rest); return true } return false }
function rResolveRetries(k, rest, line, d) { if (k === 'resolve_retries') { d.resolve_retries = parseIntOr(rest); if (d.resolve_retries == null) d.extra_lines.push(line); return true } return false }
function rTimeout(k, rest, line, d) {
  if (k !== 'timeout') return false
  const [sub, sv] = kv(rest)
  if (sub === 'resolve') d.timeout_resolve = sv
  else if (sub === 'retry') d.timeout_retry = sv
  else d.extra_lines.push(line)
  return true
}
function rHold(k, rest, line, d) {
  if (k !== 'hold') return false
  const [sub, sv] = kv(rest)
  if (sub === 'nx') d.hold_nx = sv
  else if (sub === 'valid') d.hold_valid = sv
  else d.extra_lines.push(line)
  return true
}
function rPayloadSize(k, rest, line, d) { if (k === 'accepted_payload_size') { d.accepted_payload_size = parseIntOr(rest); if (d.accepted_payload_size == null) d.extra_lines.push(line); return true } return false }

const RESOLVERS_HANDLERS = [
  rNameserver, rResolveRetries, rTimeout, rHold, rPayloadSize,
]

// ── Peers handlers ──────────────────────────────────────────────────────────

function pPeer(k, rest, line, d) { if (k === 'peer') { d.peers.push(rest); return true } return false }

const PEERS_HANDLERS = [pPeer]

// ── Userlist handlers ───────────────────────────────────────────────────────

function uGroup(k, rest, line, d) { if (k === 'group') { d.groups.push(rest); return true } return false }
function uUser(k, rest, line, d) { if (k === 'user') { d.users.push(rest); return true } return false }

const USERLIST_HANDLERS = [uGroup, uUser]

// ── Program handlers ────────────────────────────────────────────────────────

function pCommand(k, rest, line, d) { if (k === 'command') { d.command = rest; return true } return false }
function pUser(k, rest, line, d) { if (k === 'user') { d.user = rest; return true } return false }
function pGroup(k, rest, line, d) { if (k === 'group') { d.group = rest; return true } return false }
function pOption(k, rest, line, d) { if (k === 'option' && rest.toLowerCase() === 'start-on-reload') { d.option_start_on_reload = true; return true } return false }

const PROGRAM_HANDLERS = [pCommand, pUser, pGroup, pOption]

// ── Auxiliary sections ─────────────────────────────────────────────────────

function parseResolvers(name, lines) {
  const d = { name, nameservers: [], extra_lines: [] }
  for (const line of lines) {
    const [k, rest] = kvLower(line)
    const handled = RESOLVERS_HANDLERS.some(h => h(k, rest, line, d))
    if (!handled) d.extra_lines.push(line)
  }
  return d
}

function parsePeers(name, lines) {
  const d = { name, peers: [], extra_lines: [] }
  for (const line of lines) {
    const [k, rest] = kvLower(line)
    const handled = PEERS_HANDLERS.some(h => h(k, rest, line, d))
    if (!handled) d.extra_lines.push(line)
  }
  return d
}

function parseUserlist(name, lines) {
  const d = { name, groups: [], users: [], extra_lines: [] }
  for (const line of lines) {
    const [k, rest] = kvLower(line)
    const handled = USERLIST_HANDLERS.some(h => h(k, rest, line, d))
    if (!handled) d.extra_lines.push(line)
  }
  return d
}

function parseProgram(name, lines) {
  const d = { name, option_start_on_reload: false, extra_lines: [] }
  for (const line of lines) {
    const [k, rest] = kvLower(line)
    const handled = PROGRAM_HANDLERS.some(h => h(k, rest, line, d))
    if (!handled) d.extra_lines.push(line)
  }
  return d
}

// ── Public API ─────────────────────────────────────────────────────────────

export function parseConfigText(text) {
  try {
    const sections = splitSections(text)
    let globalSection = null
    const defaults = []
    const frontends = []
    const backends = []
    const listens = []
    const resolvers = []
    const peers = []
    const userlists = []
    const programs = []

    for (const [secType, secName, secLines] of sections) {
      if (secType === 'global') {
        globalSection = parseGlobal(secLines)
      } else if (secType === 'defaults') {
        defaults.push(parseDefaults(secName, secLines))
      } else if (secType === 'frontend') {
        const d = parseProxyCommon(secLines)
        frontends.push({ name: secName, ...d })
      } else if (secType === 'backend') {
        const d = parseProxyCommon(secLines)
        backends.push({ name: secName, ...d })
      } else if (secType === 'listen') {
        const d = parseProxyCommon(secLines)
        listens.push({ name: secName, ...d })
      } else if (secType === 'resolvers') {
        resolvers.push(parseResolvers(secName, secLines))
      } else if (secType === 'peers') {
        peers.push(parsePeers(secName, secLines))
      } else if (secType === 'userlist') {
        userlists.push(parseUserlist(secName, secLines))
      } else if (secType === 'program') {
        programs.push(parseProgram(secName, secLines))
      }
    }

    const config = {
      global_section: globalSection || undefined,
      defaults, frontends, backends, listens,
      resolvers, peers, userlists, programs,
    }

    const errors = semanticValidation(config)
    if (errors.length) {
      return { success: false, errors, semantic_errors: errors }
    }

    return { success: true, config }
  } catch (e) {
    return { success: false, errors: [e.message], semantic_errors: [] }
  }
}

export function parseConfigFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      resolve(parseConfigText(text))
    }
    reader.onerror = () => resolve({ success: false, errors: ['Failed to read file'] })
    reader.readAsText(file)
  })
}

// ── Semantic validation ────────────────────────────────────────────────────

function semanticValidation(config) {
  const errors = []
  const knownBackends = new Set()
  if (config.backends) config.backends.forEach(b => knownBackends.add(b.name))
  if (config.listens) config.listens.forEach(l => knownBackends.add(l.name))

  if (config.frontends) {
    for (const fe of config.frontends) {
      if (fe.default_backend && !knownBackends.has(fe.default_backend)) {
        errors.push(`frontend '${fe.name}': default_backend '${fe.default_backend}' does not exist`)
      }
      if (fe.use_backends) {
        for (const ub of fe.use_backends) {
          if (!knownBackends.has(ub.backend)) {
            errors.push(`frontend '${fe.name}': use_backend '${ub.backend}' does not exist`)
          }
        }
      }
    }
  }

  if (config.listens) {
    for (const ls of config.listens) {
      if (ls.default_backend && !knownBackends.has(ls.default_backend)) {
        errors.push(`listen '${ls.name}': default_backend '${ls.default_backend}' does not exist`)
      }
    }
  }

  return errors
}
