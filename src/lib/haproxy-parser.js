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

// ── Global ──────────────────────────────────────────────────────────────────

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
    if (kl === 'log') d.log.push(rest)
    else if (kl === 'chroot') d.chroot = rest
    else if (kl === 'user') d.user = rest
    else if (kl === 'group') d.group = rest
    else if (kl === 'uid') { const n = parseInt(rest); if (!isNaN(n)) d.uid = n; else d.extra_lines.push(line) }
    else if (kl === 'gid') { const n = parseInt(rest); if (!isNaN(n)) d.gid = n; else d.extra_lines.push(line) }
    else if (kl === 'daemon') d.daemon = true
    else if (kl === 'master-worker') d.master_worker = true
    else if (kl === 'expose-experimental-directives') d.expose_experimental_directives = true
    else if (kl === 'maxconn') { const n = parseInt(rest); if (!isNaN(n)) d.maxconn = n; else d.extra_lines.push(line) }
    else if (kl === 'nbproc') { const n = parseInt(rest); if (!isNaN(n)) d.nbproc = n; else d.extra_lines.push(line) }
    else if (kl === 'nbthread') { const n = parseInt(rest); if (!isNaN(n)) d.nbthread = n; else d.extra_lines.push(line) }
    else if (kl === 'cpu-map') d.cpu_map.push(rest)
    else if (kl === 'numa-cpu-mapping') d.numa_cpu_mapping = rest
    else if (kl === 'ulimit-n') { const n = parseInt(rest); if (!isNaN(n)) d.ulimit_n = n; else d.extra_lines.push(line) }
    else if (kl === 'pidfile') d.pidfile = rest
    else if (kl === 'description') d.description = rest
    else if (kl === 'node') d.node = rest
    else if (kl === 'localpeer') d.localpeer = rest
    else if (kl === 'stats') {
      const [sub, sv] = kv(rest)
      if (sub === 'socket') d.stats_socket.push(sv)
      else if (sub === 'timeout') d.stats_timeout = sv
      else if (sub === 'maxconn') { const n = parseInt(sv); if (!isNaN(n)) d.stats_maxconn = n; else d.extra_lines.push(line) }
      else d.extra_lines.push(line)
    }
    else if (kl === 'log-send-hostname') d.log_send_hostname = rest
    else if (kl === 'log-tag') d.log_tag = rest
    else if (kl === 'ca-base') d.ca_base = rest
    else if (kl === 'crt-base') d.crt_base = rest
    else if (kl === 'ssl-default-bind-ciphers') d.ssl_default_bind_ciphers = rest
    else if (kl === 'ssl-default-bind-ciphersuites') d.ssl_default_bind_ciphersuites = rest
    else if (kl === 'ssl-default-bind-options') d.ssl_default_bind_options = rest
    else if (kl === 'ssl-default-server-ciphers') d.ssl_default_server_ciphers = rest
    else if (kl === 'ssl-default-server-ciphersuites') d.ssl_default_server_ciphersuites = rest
    else if (kl === 'ssl-default-server-options') d.ssl_default_server_options = rest
    else if (kl === 'ssl-dh-param-file') d.ssl_dh_param_file = rest
    else if (kl === 'ssl-server-verify') d.ssl_server_verify = rest
    else if (kl === 'tune.ssl.maxrecord') { const n = parseInt(rest); if (!isNaN(n)) d.tune_ssl_maxrecord = n; else d.extra_lines.push(line) }
    else if (kl === 'tune.maxrewrite') { const n = parseInt(rest); if (!isNaN(n)) d.tune_maxrewrite = n; else d.extra_lines.push(line) }
    else if (kl === 'tune.bufsize') { const n = parseInt(rest); if (!isNaN(n)) d.tune_bufsize = n; else d.extra_lines.push(line) }
    else if (kl === 'tune.http.maxhdr') { const n = parseInt(rest); if (!isNaN(n)) d.tune_http_maxhdr = n; else d.extra_lines.push(line) }
    else if (kl === 'tune.idle-pool.shared') d.tune_idle_pool_shared = rest
    else if (kl === 'tune.rcvbuf.client') { const n = parseInt(rest); if (!isNaN(n)) d.tune_rcvbuf_client = n; else d.extra_lines.push(line) }
    else if (kl === 'tune.rcvbuf.server') { const n = parseInt(rest); if (!isNaN(n)) d.tune_rcvbuf_server = n; else d.extra_lines.push(line) }
    else if (kl === 'tune.sndbuf.client') { const n = parseInt(rest); if (!isNaN(n)) d.tune_sndbuf_client = n; else d.extra_lines.push(line) }
    else if (kl === 'tune.sndbuf.server') { const n = parseInt(rest); if (!isNaN(n)) d.tune_sndbuf_server = n; else d.extra_lines.push(line) }
    else if (kl === 'external-check') d.external_check = true
    else if (kl === 'insecure-fork-wanted') d.insecure_fork_wanted = true
    else if (kl === 'set-var') d.set_var.push(rest)
    else if (kl === 'setenv') d.setenv.push(rest)
    else if (kl === 'presetenv') d.presetenv.push(rest)
    else d.extra_lines.push(line)
  }
  return d
}

// ── Defaults ────────────────────────────────────────────────────────────────

function parseDefaults(name, lines) {
  const d = {
    name: name || null, log: [], options: [], errorfile: [], errorloc: [],
    errorloc302: [], stats_auth: [], extra_lines: [],
  }
  const ts = {}
  for (const line of lines) {
    const [k, rest] = kvLower(line)
    if (k === 'mode') d.mode = rest
    else if (k === 'log') d.log.push(rest)
    else if (k === 'option') d.options.push(rest)
    else if (k === 'timeout') { if (!parseTimeout(rest, ts)) d.extra_lines.push(line) }
    else if (k === 'retries') { const n = parseInt(rest); if (!isNaN(n)) d.retries = n; else d.extra_lines.push(line) }
    else if (k === 'maxconn') { const n = parseInt(rest); if (!isNaN(n)) d.maxconn = n; else d.extra_lines.push(line) }
    else if (k === 'balance') d.balance = rest
    else if (k === 'hash-type') d.hash_type = rest
    else if (k === 'log-format') d.log_format = rest
    else if (k === 'log-format-sd') d.log_format_sd = rest
    else if (k === 'log-tag') d.log_tag = rest
    else if (k === 'http-reuse') d.http_reuse = rest
    else if (k === 'unique-id-format') d.unique_id_format = rest
    else if (k === 'unique-id-header') d.unique_id_header = rest
    else if (k === 'errorfile') d.errorfile.push(rest)
    else if (k === 'errorloc') d.errorloc.push(rest)
    else if (k === 'errorloc302') d.errorloc302.push(rest)
    else if (k === 'stats') {
      const [sub, sv] = kv(rest)
      if (sub === 'uri') d.stats_uri = sv
      else if (sub === 'realm') d.stats_realm = sv
      else if (sub === 'auth') d.stats_auth.push(sv)
      else if (sub === 'refresh') d.stats_refresh = sv
      else if (sub === 'admin') d.stats_admin = sv
      else d.extra_lines.push(line)
    }
    else if (k === 'load-server-state-from-file') d.load_server_state_from_file = rest
    else d.extra_lines.push(line)
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

// ── Proxy common ───────────────────────────────────────────────────────────

function parseProxyCommon(lines) {
  const d = {
    options: [], log: [], acls: [],
    http_request: [], http_response: [], http_after_response: [],
    tcp_request: [], tcp_response: [],
    use_backends: [], stick_rules: [],
    errorfile: [], stats_auth: [],
    servers: [], server_templates: [],
    redirect: [], ignore_persist: [], force_persist: [],
    extra_lines: [],
  }
  const ts = {}
  const hc = { tcp_check_rules: [] }

  for (const line of lines) {
    const [k, rest] = kvLower(line)
    if (k === 'mode') d.mode = rest
    else if (k === 'balance') d.balance = rest
    else if (k === 'hash-type') d.hash_type = rest
    else if (k === 'maxconn') { const n = parseInt(rest); if (!isNaN(n)) d.maxconn = n; else d.extra_lines.push(line) }
    else if (k === 'fullconn') { const n = parseInt(rest); if (!isNaN(n)) d.fullconn = n; else d.extra_lines.push(line) }
    else if (k === 'bind') { if (!d.bind) d.bind = []; d.bind.push(rest) }
    else if (k === 'option') {
      const opt = rest.split(/\s+/)[0].toLowerCase()
      if (['httpchk', 'smtpchk', 'mysql-check', 'pgsql-check', 'redis-check', 'ssl-hello-chk', 'tcp-check'].includes(opt)) {
        parseHealthOptions(line, hc)
      } else {
        d.options.push(rest)
      }
    }
    else if (k === 'http-check' || k === 'tcp-check') { if (!parseHealthOptions(line, hc)) d.extra_lines.push(line) }
    else if (k === 'log') d.log.push(rest)
    else if (k === 'log-format') d.log_format = rest
    else if (k === 'log-format-sd') d.log_format_sd = rest
    else if (k === 'log-tag') d.log_tag = rest
    else if (k === 'timeout') { if (!parseTimeout(rest, ts)) d.extra_lines.push(line) }
    else if (k === 'acl') {
      const parts = rest.split(/\s+/, 2)
      if (parts.length === 2) d.acls.push({ name: parts[0], criterion: parts[1] })
      else d.extra_lines.push(line)
    }
    else if (k === 'http-request') {
      const m = rest.match(/\s+(if|unless)\s+(.+)$/)
      const action = m ? rest.slice(0, m.index).trim() : rest
      const cond = m ? m[0].trim() : null
      d.http_request.push({ action, condition: cond })
    }
    else if (k === 'http-response') {
      const m = rest.match(/\s+(if|unless)\s+(.+)$/)
      const action = m ? rest.slice(0, m.index).trim() : rest
      const cond = m ? m[0].trim() : null
      d.http_response.push({ action, condition: cond })
    }
    else if (k === 'http-after-response') {
      const m = rest.match(/\s+(if|unless)\s+(.+)$/)
      const action = m ? rest.slice(0, m.index).trim() : rest
      const cond = m ? m[0].trim() : null
      d.http_after_response.push({ action, condition: cond })
    }
    else if (k === 'tcp-request') {
      const parts = rest.split(/\s+/, 2)
      const tcpType = parts[0].toLowerCase()
      const tcpRest = parts.length > 1 ? parts[1] : ''
      const m = tcpRest.match(/\s+(if|unless)\s+(.+)$/)
      const action = m ? tcpRest.slice(0, m.index).trim() : tcpRest
      const cond = m ? m[0].trim() : null
      const valid = ['connection', 'content', 'session', 'inspect-delay']
      if (valid.includes(tcpType)) d.tcp_request.push({ type: tcpType, action, condition: cond })
      else d.extra_lines.push(line)
    }
    else if (k === 'tcp-response') {
      const parts = rest.split(/\s+/, 2)
      const tcpType = parts[0].toLowerCase()
      const tcpRest = parts.length > 1 ? parts[1] : ''
      const m = tcpRest.match(/\s+(if|unless)\s+(.+)$/)
      const action = m ? tcpRest.slice(0, m.index).trim() : tcpRest
      const cond = m ? m[0].trim() : null
      if (['content', 'inspect-delay'].includes(tcpType)) d.tcp_response.push({ type: tcpType, action, condition: cond })
      else d.extra_lines.push(line)
    }
    else if (k === 'use_backend') {
      const parts = rest.split(/\s+/, 2)
      d.use_backends.push({ backend: parts[0], condition: parts[1] || null })
    }
    else if (k === 'default_backend') d.default_backend = rest.split(/\s+/)[0]
    else if (k === 'stick-table') d.stick_table = parseStickTable(rest)
    else if (k === 'stick') {
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
          d.stick_rules.push({ action, expression: expr, table, condition: cond })
        } else d.extra_lines.push(line)
      } else d.extra_lines.push(line)
    }
    else if (k === 'cookie') {
      const c = parseCookie(rest)
      if (c) d.cookie = c
      else d.extra_lines.push(line)
    }
    else if (k === 'compression') {
      const [sub, sv] = kv(rest)
      const sl = sub.toLowerCase()
      if (sl === 'algo') d._comp_algo = sv
      else if (sl === 'type') {
        if (!d._comp_types) d._comp_types = []
        sv.split(/\s+/).forEach(t => d._comp_types.push(t))
      }
      else if (sl === 'offload') d._comp_offload = true
      else d.extra_lines.push(line)
    }
    else if (k === 'server' && line.split(/\s+/).length >= 3) {
      const srv = parseServer(line)
      if (srv) d.servers.push(srv)
      else d.extra_lines.push(line)
    }
    else if (k === 'server-template') {
      const st = parseServerTemplate(line)
      if (st) d.server_templates.push(st)
      else d.extra_lines.push(line)
    }
    else if (k === 'server-defaults') d.server_defaults = { params: rest }
    else if (k === 'http-reuse') d.http_reuse = rest
    else if (k === 'http-send-name-header') d.http_send_name_header = rest
    else if (k === 'redirect') d.redirect.push(rest)
    else if (k === 'source') d.source = rest
    else if (k === 'ignore-persist' || k === 'ignore_persist') d.ignore_persist.push(rest)
    else if (k === 'force-persist') d.force_persist.push(rest)
    else if (k === 'external-check') {
      const [sub, sv] = kv(rest)
      if (sub === 'command') d.external_check_command = sv
      else if (sub === 'path') d.external_check_path = sv
      else d.extra_lines.push(line)
    }
    else if (k === 'errorfile') d.errorfile.push(rest)
    else if (k === 'errorloc') {
      if (!d.errorloc) d.errorloc = []
      d.errorloc.push(rest)
    }
    else if (k === 'stats') {
      const [sub, sv] = kv(rest)
      if (sub === 'uri') d.stats_uri = sv
      else if (sub === 'realm') d.stats_realm = sv
      else if (sub === 'auth') d.stats_auth.push(sv)
      else if (sub === 'refresh') d.stats_refresh = sv
      else if (sub === 'admin') d.stats_admin = sv
      else if (sub === 'show-legends') d.stats_show_legends = true
      else if (sub === 'show-node') d.stats_show_node = sv
      else if (sub === 'hide-version') d.stats_hide_version = true
      else if (sub === 'enable' || sub === 'disable') d.extra_lines.push(line)
      else d.extra_lines.push(line)
    }
    else if (k === 'unique-id-format') d.unique_id_format = rest
    else if (k === 'unique-id-header') d.unique_id_header = rest
    else if (k === 'capture') {
      const [sub, sv] = kv(rest)
      if (sub === 'request') {
        if (!d.capture_request_header) d.capture_request_header = []
        d.capture_request_header.push(sv.replace(/^header\s+/, ''))
      } else if (sub === 'response') {
        if (!d.capture_response_header) d.capture_response_header = []
        d.capture_response_header.push(sv.replace(/^header\s+/, ''))
      } else d.extra_lines.push(line)
    }
    else if (k === 'monitor-uri') d.monitor_uri = rest
    else if (k === 'monitor') {
      const [sub, sv] = kv(rest)
      if (sub === 'fail') { if (!d.monitor_fail) d.monitor_fail = []; d.monitor_fail.push(sv) }
      else d.extra_lines.push(line)
    }
    else if (k === 'random') {
      const [sub, sv] = kv(rest)
      if (sub === 'draws') { const n = parseInt(sv); if (!isNaN(n)) d.random_draws = n; else d.extra_lines.push(line) }
      else d.extra_lines.push(line)
    }
    else d.extra_lines.push(line)
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

// ── Auxiliary sections ─────────────────────────────────────────────────────

function parseResolvers(name, lines) {
  const d = { name, nameservers: [], extra_lines: [] }
  for (const line of lines) {
    const [k, rest] = kvLower(line)
    if (k === 'nameserver') d.nameservers.push(rest)
    else if (k === 'resolve_retries') { const n = parseInt(rest); if (!isNaN(n)) d.resolve_retries = n; else d.extra_lines.push(line) }
    else if (k === 'timeout') {
      const [sub, sv] = kv(rest)
      if (sub === 'resolve') d.timeout_resolve = sv
      else if (sub === 'retry') d.timeout_retry = sv
      else d.extra_lines.push(line)
    }
    else if (k === 'hold') {
      const [sub, sv] = kv(rest)
      if (sub === 'nx') d.hold_nx = sv
      else if (sub === 'valid') d.hold_valid = sv
      else d.extra_lines.push(line)
    }
    else if (k === 'accepted_payload_size') { const n = parseInt(rest); if (!isNaN(n)) d.accepted_payload_size = n; else d.extra_lines.push(line) }
    else d.extra_lines.push(line)
  }
  return d
}

function parsePeers(name, lines) {
  const d = { name, peers: [], extra_lines: [] }
  for (const line of lines) {
    const [k, rest] = kvLower(line)
    if (k === 'peer') d.peers.push(rest)
    else d.extra_lines.push(line)
  }
  return d
}

function parseUserlist(name, lines) {
  const d = { name, groups: [], users: [], extra_lines: [] }
  for (const line of lines) {
    const [k, rest] = kvLower(line)
    if (k === 'group') d.groups.push(rest)
    else if (k === 'user') d.users.push(rest)
    else d.extra_lines.push(line)
  }
  return d
}

function parseProgram(name, lines) {
  const d = { name, option_start_on_reload: false, extra_lines: [] }
  for (const line of lines) {
    const [k, rest] = kvLower(line)
    if (k === 'command') d.command = rest
    else if (k === 'user') d.user = rest
    else if (k === 'group') d.group = rest
    else if (k === 'option' && rest.toLowerCase() === 'start-on-reload') d.option_start_on_reload = true
    else d.extra_lines.push(line)
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
