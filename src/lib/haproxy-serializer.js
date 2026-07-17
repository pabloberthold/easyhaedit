// ── Serialization helpers: config object → haproxy.cfg text ────────────────
// Mirrors the to_cfg_* methods from haproxy_schema.py
// All section objects are plain JS — no class hierarchy needed.

export function serializeACL(acl) {
  return `    acl ${acl.name} ${acl.criterion}`
}

export function serializeHttpRequestRule(rule) {
  const cond = rule.condition ? ` ${rule.condition}` : ''
  return `    http-request ${rule.action}${cond}`
}

export function serializeHttpResponseRule(rule) {
  const cond = rule.condition ? ` ${rule.condition}` : ''
  return `    http-response ${rule.action}${cond}`
}

export function serializeHttpAfterResponseRule(rule) {
  const cond = rule.condition ? ` ${rule.condition}` : ''
  return `    http-after-response ${rule.action}${cond}`
}

export function serializeTcpRequestRule(rule) {
  const cond = rule.condition ? ` ${rule.condition}` : ''
  return `    tcp-request ${rule.type} ${rule.action}${cond}`
}

export function serializeTcpResponseRule(rule) {
  const cond = rule.condition ? ` ${rule.condition}` : ''
  return `    tcp-response ${rule.type} ${rule.action}${cond}`
}

export function serializeUseBackend(ub) {
  const cond = ub.condition ? ` ${ub.condition}` : ''
  return `    use_backend ${ub.backend}${cond}`
}

export function serializeServer(srv) {
  const parts = [`    server ${srv.name} ${srv.address}:${srv.port}`]
  if (srv.weight != null) parts.push(`weight ${srv.weight}`)
  if (srv.maxconn != null) parts.push(`maxconn ${srv.maxconn}`)
  if (srv.check) parts.push('check')
  if (srv.check_inter) parts.push(`inter ${srv.check_inter}`)
  if (srv.check_rise != null) parts.push(`rise ${srv.check_rise}`)
  if (srv.check_fall != null) parts.push(`fall ${srv.check_fall}`)
  if (srv.ssl) parts.push('ssl')
  if (srv.verify) parts.push(`verify ${srv.verify}`)
  if (srv.sni) parts.push(`sni ${srv.sni}`)
  if (srv.backup) parts.push('backup')
  if (srv.disabled) parts.push('disabled')
  if (srv.track) parts.push(`track ${srv.track}`)
  if (srv.on_error) parts.push(`on-error ${srv.on_error}`)
  if (srv.resolvers) parts.push(`resolvers ${srv.resolvers}`)
  if (srv.init_addr) parts.push(`init-addr ${srv.init_addr}`)
  if (srv.extra_params) parts.push(...srv.extra_params)
  return parts.join(' ')
}

export function serializeServerTemplate(st) {
  const params = (st.extra_params || []).join(' ')
  const suffix = params ? ` ${params}` : ''
  return `    server-template ${st.prefix} ${st.count} ${st.address}:${st.port}${suffix}`
}

export function serializeServerDefaults(sd) {
  return `    server-defaults ${sd.params}`
}

export function serializeStickTable(st) {
  let line = `    stick-table type ${st.type} size ${st.size}`
  if (st.expire) line += ` expire ${st.expire}`
  if (st.nopurge) line += ' nopurge'
  if (st.peers) line += ` peers ${st.peers}`
  if (st.srvkey) line += ` srvkey ${st.srvkey}`
  if (st.write_to) line += ` write-to ${st.write_to}`
  if (st.store && st.store.length) line += ' store ' + st.store.join(',')
  return line
}

export function serializeStickRule(sr) {
  let line = `    stick ${sr.action} ${sr.expression}`
  if (sr.table) line += ` table ${sr.table}`
  if (sr.condition) line += ` ${sr.condition}`
  return line
}

export function serializeCookie(c) {
  const parts = [`    cookie ${c.name} ${c.method}`]
  if (c.indirect) parts.push('indirect')
  if (c.nocache) parts.push('nocache')
  if (c.postonly) parts.push('postonly')
  if (c.preserve) parts.push('preserve')
  if (c.httponly) parts.push('httponly')
  if (c.secure) parts.push('secure')
  if (c.domain) parts.push(`domain ${c.domain}`)
  if (c.maxidle) parts.push(`maxidle ${c.maxidle}`)
  if (c.maxlife) parts.push(`maxlife ${c.maxlife}`)
  if (c.attr) parts.push(`attr ${c.attr}`)
  return parts.join(' ')
}

export function serializeCompression(comp) {
  const lines = []
  if (comp.algo) lines.push(`    compression algo ${comp.algo}`)
  if (comp.type) comp.type.forEach(t => lines.push(`    compression type ${t}`))
  if (comp.offload) lines.push('    compression offload')
  return lines
}

export function serializeHealthCheck(hc) {
  const lines = []
  if (hc.option_httpchk != null) {
    const val = hc.option_httpchk ? ` ${hc.option_httpchk}` : ''
    lines.push(`    option httpchk${val}`)
  }
  if (hc.http_check_expect) lines.push(`    http-check expect ${hc.http_check_expect}`)
  if (hc.http_check_send) lines.push(`    http-check send ${hc.http_check_send}`)
  if (hc.http_check_connect) lines.push(`    http-check connect ${hc.http_check_connect}`)
  if (hc.option_smtpchk) lines.push(`    option smtpchk ${hc.option_smtpchk}`)
  if (hc.option_mysql_check) lines.push(`    option mysql-check ${hc.option_mysql_check}`)
  if (hc.option_pgsql_check) lines.push('    option pgsql-check')
  if (hc.option_redis_check) lines.push('    option redis-check')
  if (hc.option_ssl_hello_chk) lines.push('    option ssl-hello-chk')
  if (hc.option_tcp_check) lines.push('    option tcp-check')
  if (hc.tcp_check_rules) hc.tcp_check_rules.forEach(r => lines.push(`    tcp-check ${r}`))
  return lines
}

export function serializeTimeouts(ts) {
  const lines = []
  const map = [
    ['connect', ts.connect],
    ['client', ts.client],
    ['client-fin', ts.client_fin],
    ['server', ts.server],
    ['server-fin', ts.server_fin],
    ['tunnel', ts.tunnel],
    ['http-request', ts.http_request],
    ['http-keep-alive', ts.http_keep_alive],
    ['check', ts.check],
    ['queue', ts.queue],
  ]
  map.forEach(([name, val]) => {
    if (val) lines.push(`    timeout ${name} ${val}`)
  })
  return lines
}

export function serializeGlobalSection(g) {
  const L = ['global']
  if (g.log) g.log.forEach(e => L.push(`    log ${e}`))
  if (g.log_send_hostname != null) {
    const val = g.log_send_hostname ? ` ${g.log_send_hostname}` : ''
    L.push(`    log-send-hostname${val}`)
  }
  if (g.log_tag) L.push(`    log-tag ${g.log_tag}`)
  if (g.description) L.push(`    description ${g.description}`)
  if (g.node) L.push(`    node ${g.node}`)
  if (g.chroot) L.push(`    chroot ${g.chroot}`)
  if (g.user) L.push(`    user ${g.user}`)
  if (g.group) L.push(`    group ${g.group}`)
  if (g.uid != null) L.push(`    uid ${g.uid}`)
  if (g.gid != null) L.push(`    gid ${g.gid}`)
  if (g.daemon) L.push('    daemon')
  if (g.master_worker) L.push('    master-worker')
  if (g.expose_experimental_directives) L.push('    expose-experimental-directives')
  if (g.maxconn != null) L.push(`    maxconn ${g.maxconn}`)
  if (g.nbproc != null) L.push(`    nbproc ${g.nbproc}`)
  if (g.nbthread != null) L.push(`    nbthread ${g.nbthread}`)
  if (g.cpu_map) g.cpu_map.forEach(cm => L.push(`    cpu-map ${cm}`))
  if (g.numa_cpu_mapping) L.push(`    numa-cpu-mapping ${g.numa_cpu_mapping}`)
  if (g.ulimit_n != null) L.push(`    ulimit-n ${g.ulimit_n}`)
  if (g.pidfile) L.push(`    pidfile ${g.pidfile}`)
  if (g.stats_socket) g.stats_socket.forEach(s => L.push(`    stats socket ${s}`))
  if (g.stats_timeout) L.push(`    stats timeout ${g.stats_timeout}`)
  if (g.stats_maxconn != null) L.push(`    stats maxconn ${g.stats_maxconn}`)
  if (g.ssl_default_bind_ciphers) L.push(`    ssl-default-bind-ciphers ${g.ssl_default_bind_ciphers}`)
  if (g.ssl_default_bind_ciphersuites) L.push(`    ssl-default-bind-ciphersuites ${g.ssl_default_bind_ciphersuites}`)
  if (g.ssl_default_bind_options) L.push(`    ssl-default-bind-options ${g.ssl_default_bind_options}`)
  if (g.ssl_default_server_ciphers) L.push(`    ssl-default-server-ciphers ${g.ssl_default_server_ciphers}`)
  if (g.ssl_default_server_ciphersuites) L.push(`    ssl-default-server-ciphersuites ${g.ssl_default_server_ciphersuites}`)
  if (g.ssl_default_server_options) L.push(`    ssl-default-server-options ${g.ssl_default_server_options}`)
  if (g.ssl_dh_param_file) L.push(`    ssl-dh-param-file ${g.ssl_dh_param_file}`)
  if (g.ssl_server_verify) L.push(`    ssl-server-verify ${g.ssl_server_verify}`)
  if (g.tune_ssl_maxrecord != null) L.push(`    tune.ssl.maxrecord ${g.tune_ssl_maxrecord}`)
  if (g.ca_base) L.push(`    ca-base ${g.ca_base}`)
  if (g.crt_base) L.push(`    crt-base ${g.crt_base}`)
  if (g.tune_maxrewrite != null) L.push(`    tune.maxrewrite ${g.tune_maxrewrite}`)
  if (g.tune_bufsize != null) L.push(`    tune.bufsize ${g.tune_bufsize}`)
  if (g.tune_http_maxhdr != null) L.push(`    tune.http.maxhdr ${g.tune_http_maxhdr}`)
  if (g.tune_idle_pool_shared) L.push(`    tune.idle-pool.shared ${g.tune_idle_pool_shared}`)
  if (g.tune_rcvbuf_client != null) L.push(`    tune.rcvbuf.client ${g.tune_rcvbuf_client}`)
  if (g.tune_rcvbuf_server != null) L.push(`    tune.rcvbuf.server ${g.tune_rcvbuf_server}`)
  if (g.tune_sndbuf_client != null) L.push(`    tune.sndbuf.client ${g.tune_sndbuf_client}`)
  if (g.tune_sndbuf_server != null) L.push(`    tune.sndbuf.server ${g.tune_sndbuf_server}`)
  if (g.external_check) L.push('    external-check')
  if (g.insecure_fork_wanted) L.push('    insecure-fork-wanted')
  if (g.localpeer) L.push(`    localpeer ${g.localpeer}`)
  if (g.set_var) g.set_var.forEach(v => L.push(`    set-var ${v}`))
  if (g.setenv) g.setenv.forEach(v => L.push(`    setenv ${v}`))
  if (g.presetenv) g.presetenv.forEach(v => L.push(`    presetenv ${v}`))
  if (g.extra_lines) g.extra_lines.forEach(l => L.push(`    ${l}`))
  return L.join('\n')
}

export function serializeDefaultsSection(def) {
  const header = def.name ? `defaults ${def.name}` : 'defaults'
  const L = [header]
  if (def.log) def.log.forEach(e => L.push(`    log ${e}`))
  if (def.mode) L.push(`    mode ${def.mode}`)
  if (def.options) def.options.forEach(o => L.push(`    option ${o}`))
  if (def.timeouts) L.push(...serializeTimeouts(def.timeouts))
  if (def.retries != null) L.push(`    retries ${def.retries}`)
  if (def.maxconn != null) L.push(`    maxconn ${def.maxconn}`)
  if (def.balance) L.push(`    balance ${def.balance}`)
  if (def.hash_type) L.push(`    hash-type ${def.hash_type}`)
  if (def.log_format) L.push(`    log-format ${def.log_format}`)
  if (def.log_format_sd) L.push(`    log-format-sd ${def.log_format_sd}`)
  if (def.log_tag) L.push(`    log-tag ${def.log_tag}`)
  if (def.http_reuse) L.push(`    http-reuse ${def.http_reuse}`)
  if (def.http_pretend_keepalive) L.push('    option http-pretend-keepalive')
  if (def.unique_id_format) L.push(`    unique-id-format ${def.unique_id_format}`)
  if (def.unique_id_header) L.push(`    unique-id-header ${def.unique_id_header}`)
  if (def.stats_uri) L.push(`    stats uri ${def.stats_uri}`)
  if (def.stats_realm) L.push(`    stats realm ${def.stats_realm}`)
  if (def.stats_auth) def.stats_auth.forEach(a => L.push(`    stats auth ${a}`))
  if (def.stats_refresh) L.push(`    stats refresh ${def.stats_refresh}`)
  if (def.stats_admin) L.push(`    stats admin ${def.stats_admin}`)
  if (def.load_server_state_from_file) L.push(`    load-server-state-from-file ${def.load_server_state_from_file}`)
  if (def.errorfile) def.errorfile.forEach(ef => L.push(`    errorfile ${ef}`))
  if (def.errorloc) def.errorloc.forEach(el => L.push(`    errorloc ${el}`))
  if (def.errorloc302) def.errorloc302.forEach(el => L.push(`    errorloc302 ${el}`))
  if (def.extra_lines) def.extra_lines.forEach(l => L.push(`    ${l}`))
  return L.join('\n')
}

function serializeProxySectionCommon(section, L) {
  if (section.bind) section.bind.forEach(b => L.push(`    bind ${b}`))
  if (section.mode) L.push(`    mode ${section.mode}`)
  if (section.balance) L.push(`    balance ${section.balance}`)
  if (section.hash_type) L.push(`    hash-type ${section.hash_type}`)
  if (section.random_draws != null) L.push(`    random draws ${section.random_draws}`)
  if (section.maxconn != null) L.push(`    maxconn ${section.maxconn}`)
  if (section.fullconn != null) L.push(`    fullconn ${section.fullconn}`)
  if (section.options) section.options.forEach(o => L.push(`    option ${o}`))
  if (section.timeouts) L.push(...serializeTimeouts(section.timeouts))
  if (section.log) section.log.forEach(e => L.push(`    log ${e}`))
  if (section.log_format) L.push(`    log-format ${section.log_format}`)
  if (section.log_format_sd) L.push(`    log-format-sd ${section.log_format_sd}`)
  if (section.log_tag) L.push(`    log-tag ${section.log_tag}`)
  if (section.capture_request_header) section.capture_request_header.forEach(h => L.push(`    capture request header ${h}`))
  if (section.capture_response_header) section.capture_response_header.forEach(h => L.push(`    capture response header ${h}`))
  if (section.source) L.push(`    source ${section.source}`)
  if (section.http_reuse) L.push(`    http-reuse ${section.http_reuse}`)
  if (section.http_send_name_header) L.push(`    http-send-name-header ${section.http_send_name_header}`)
  if (section.unique_id_format) L.push(`    unique-id-format ${section.unique_id_format}`)
  if (section.unique_id_header) L.push(`    unique-id-header ${section.unique_id_header}`)
  if (section.monitor_uri) L.push(`    monitor-uri ${section.monitor_uri}`)
  if (section.monitor_fail) section.monitor_fail.forEach(mf => L.push(`    monitor fail ${mf}`))
  if (section.health_check) L.push(...serializeHealthCheck(section.health_check))
  if (section.cookie) L.push(serializeCookie(section.cookie))
  if (section.stick_table) L.push(serializeStickTable(section.stick_table))
  if (section.stick_rules) section.stick_rules.forEach(sr => L.push(serializeStickRule(sr)))
  if (section.ignore_persist) section.ignore_persist.forEach(ip => L.push(`    ignore persist ${ip}`))
  if (section.force_persist) section.force_persist.forEach(fp => L.push(`    force-persist ${fp}`))
  if (section.compression) L.push(...serializeCompression(section.compression))
  if (section.tcp_request) section.tcp_request.forEach(r => L.push(serializeTcpRequestRule(r)))
  if (section.tcp_response) section.tcp_response.forEach(r => L.push(serializeTcpResponseRule(r)))
  if (section.acls) section.acls.forEach(a => L.push(serializeACL(a)))
  if (section.http_request) section.http_request.forEach(r => L.push(serializeHttpRequestRule(r)))
  if (section.http_response) section.http_response.forEach(r => L.push(serializeHttpResponseRule(r)))
  if (section.http_after_response) section.http_after_response.forEach(r => L.push(serializeHttpAfterResponseRule(r)))
  if (section.redirect) section.redirect.forEach(rd => L.push(`    redirect ${rd}`))
  if (section.external_check_command) L.push(`    external-check command ${section.external_check_command}`)
  if (section.external_check_path) L.push(`    external-check path ${section.external_check_path}`)
  // Stats
  if (section.stats_uri) L.push(`    stats uri ${section.stats_uri}`)
  if (section.stats_realm) L.push(`    stats realm ${section.stats_realm}`)
  if (section.stats_auth) section.stats_auth.forEach(a => L.push(`    stats auth ${a}`))
  if (section.stats_refresh) L.push(`    stats refresh ${section.stats_refresh}`)
  if (section.stats_admin) L.push(`    stats admin ${section.stats_admin}`)
  if (section.stats_show_legends) L.push('    stats show-legends')
  if (section.stats_show_node != null) {
    const val = section.stats_show_node ? ` ${section.stats_show_node}` : ''
    L.push(`    stats show-node${val}`)
  }
  if (section.stats_hide_version) L.push('    stats hide-version')
  if (section.errorfile) section.errorfile.forEach(ef => L.push(`    errorfile ${ef}`))
  if (section.errorloc) section.errorloc.forEach(el => L.push(`    errorloc ${el}`))
  if (section.server_defaults) L.push(serializeServerDefaults(section.server_defaults))
  if (section.server_templates) section.server_templates.forEach(st => L.push(serializeServerTemplate(st)))
  if (section.use_backends) section.use_backends.forEach(ub => L.push(serializeUseBackend(ub)))
  if (section.default_backend) L.push(`    default_backend ${section.default_backend}`)
  if (section.extra_lines) section.extra_lines.forEach(l => L.push(`    ${l}`))
  if (section.servers) section.servers.forEach(s => L.push(serializeServer(s)))
}

export function serializeFrontendSection(fe) {
  const L = [`frontend ${fe.name}`]
  serializeProxySectionCommon(fe, L)
  return L.join('\n')
}

export function serializeBackendSection(be) {
  const L = [`backend ${be.name}`]
  serializeProxySectionCommon(be, L)
  return L.join('\n')
}

export function serializeListenSection(ls) {
  const L = [`listen ${ls.name}`]
  serializeProxySectionCommon(ls, L)
  return L.join('\n')
}

export function serializeResolversSection(r) {
  const L = [`resolvers ${r.name}`]
  if (r.nameservers) r.nameservers.forEach(ns => L.push(`    nameserver ${ns}`))
  if (r.resolve_retries != null) L.push(`    resolve_retries ${r.resolve_retries}`)
  if (r.timeout_resolve) L.push(`    timeout resolve ${r.timeout_resolve}`)
  if (r.timeout_retry) L.push(`    timeout retry ${r.timeout_retry}`)
  if (r.hold_nx) L.push(`    hold nx ${r.hold_nx}`)
  if (r.hold_valid) L.push(`    hold valid ${r.hold_valid}`)
  if (r.accepted_payload_size != null) L.push(`    accepted_payload_size ${r.accepted_payload_size}`)
  if (r.extra_lines) r.extra_lines.forEach(l => L.push(`    ${l}`))
  return L.join('\n')
}

export function serializePeersSection(p) {
  const L = [`peers ${p.name}`]
  if (p.peers) p.peers.forEach(peer => L.push(`    peer ${peer}`))
  if (p.extra_lines) p.extra_lines.forEach(l => L.push(`    ${l}`))
  return L.join('\n')
}

export function serializeUserlistSection(ul) {
  const L = [`userlist ${ul.name}`]
  if (ul.groups) ul.groups.forEach(g => L.push(`    group ${g}`))
  if (ul.users) ul.users.forEach(u => L.push(`    user ${u}`))
  if (ul.extra_lines) ul.extra_lines.forEach(l => L.push(`    ${l}`))
  return L.join('\n')
}

export function serializeProgramSection(pr) {
  const L = [`program ${pr.name}`]
  if (pr.command) L.push(`    command ${pr.command}`)
  if (pr.user) L.push(`    user ${pr.user}`)
  if (pr.group) L.push(`    group ${pr.group}`)
  if (pr.option_start_on_reload) L.push('    option start-on-reload')
  if (pr.extra_lines) pr.extra_lines.forEach(l => L.push(`    ${l}`))
  return L.join('\n')
}

export function serializeConfig(config) {
  const blocks = []
  if (config.global_section) blocks.push(serializeGlobalSection(config.global_section))
  if (config.defaults) config.defaults.forEach(d => blocks.push(serializeDefaultsSection(d)))
  if (config.frontends) config.frontends.forEach(fe => blocks.push(serializeFrontendSection(fe)))
  if (config.backends) config.backends.forEach(be => blocks.push(serializeBackendSection(be)))
  if (config.listens) config.listens.forEach(ls => blocks.push(serializeListenSection(ls)))
  if (config.resolvers) config.resolvers.forEach(r => blocks.push(serializeResolversSection(r)))
  if (config.peers) config.peers.forEach(p => blocks.push(serializePeersSection(p)))
  if (config.userlists) config.userlists.forEach(ul => blocks.push(serializeUserlistSection(ul)))
  if (config.programs) config.programs.forEach(pr => blocks.push(serializeProgramSection(pr)))
  return blocks.join('\n\n') + '\n'
}
