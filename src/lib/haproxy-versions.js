export const HAPROXY_VERSIONS = ['2.4', '2.5', '2.6', '2.7', '2.8', '2.9', '3.0', '3.1']

export const DEFAULT_VERSION = '2.9'

const VERSION_FEATURES = {
  '2.4': {
    balance: new Set([
      'roundrobin', 'leastconn', 'source', 'random', 'uri', 'hdr',
      'rdp-cookie', 'first', 'static-rr', 'url_param',
    ]),
    options: new Set([
      'abortonclose', 'accept-invalid-http-request', 'accept-invalid-http-response',
      'allbackups', 'backups', 'checkcache', 'clitcpka', 'close',
      'contstats', 'dontlognull', 'dontlog-normal', 'forceclose',
      'forwardfor', 'http-pretend-keepalive', 'http-proxy',
      'http-no-delay', 'http-use-htx', 'http-keep-alive', 'http-tunnel',
      'http-restrict-req-hdr-names', 'httpchk', 'httplog', 'http-server-close',
      'independent-streams', 'ldap-check', 'log-health-checks',
      'log-separate-errors', 'logasap', 'mysql-check', 'nolinger',
      'originalto', 'persist', 'pgsql-check', 'redispatch',
      'redis-check', 'smtpchk', 'socket-stats', 'ssl-hello-chk',
      'srvtcpka', 'standalone', 'tcp-check', 'tcp-smart-accept',
      'tcp-smart-connect', 'tcplog', 'transparent',
    ]),
    http_request_actions: new Set([
      'allow', 'deny', 'redirect', 'auth', 'tarpit',
      'add-header', 'set-header', 'del-header',
      'replace-header', 'replace-value', 'set-nice', 'set-log-level',
      'set-tos', 'set-mark', 'set-uri', 'set-path', 'set-query',
      'set-method', 'set-src', 'set-dst', 'set-dst-port',
      'cache-use', 'sc-add-gpc', 'sc-inc-gpc', 'sc-inc-gpc0',
      'sc-inc-gpc1', 'sc-set-gpt0', 'sc-set-gpt1', 'send-spoe-group',
      'set-timeout', 'early-hint', 'disable-l7-retry',
      'set-map', 'del-map', 'set-var', 'unset-var',
      'track-sc0', 'track-sc1', 'track-sc2',
      'capture', 'silent-drop', 'reject', 'return',
      'wait-for-handshake', 'wait-for-body',
      'use-service', 'do-resolve', 'normalize-uri',
      'set-pathq', 'replace-path', 'replace-pathq', 'replace-uri',
      'set-priority-class', 'set-priority-offset', 'add-acl', 'del-acl',
      'del-map',
    ]),
    server_params: new Set([
      'check', 'no-check', 'ssl', 'no-ssl', 'backup', 'no-backup',
      'disabled', 'weight', 'maxconn', 'maxqueue', 'minconn',
      'inter', 'fastinter', 'downinter', 'rise', 'fall',
      'track', 'id', 'cookie', 'redir', 'addr',
      'source', 'stick', 'sni', 'verify', 'ca-file', 'crl-file',
      'crt', 'ciphers', 'ciphersuites', 'force-sslv3', 'force-tlsv10',
      'force-tlsv11', 'force-tlsv12', 'force-tlsv13',
      'no-sslv3', 'no-tlsv10', 'no-tlsv11', 'no-tlsv12', 'no-tlsv13',
      'ssl', 'no-ssl', 'check-ssl', 'no-check-ssl', 'proto',
      'check-send-proxy', 'send-proxy', 'send-proxy-v2',
      'send-proxy-v2-ssl', 'send-proxy-v2-ssl-cn',
      'agent-check', 'agent-inter', 'agent-addr', 'agent-port', 'agent-send',
      'allow-0rtt', 'init-addr', 'resolvers',
      'on-error', 'check-alpn', 'non-stick',
      'error-limit', 'observe', 'health-check-up', 'health-check-down',
    ]),
    bind_params: new Set([
      'accept-nproxy', 'accept-proxy', 'allow-0rtt', 'alpn',
      'backlog', 'ca-file', 'ca-ignore-err', 'ca-sign-file',
      'ca-sign-pass', 'ca-verify-file', 'ciphers', 'ciphersuites',
      'crl-file', 'crl-ignore-err', 'crt', 'crt-ignore-err', 'crt-list',
      'curves', 'defer-accept', 'ecdhe', 'expose-fd',
      'force-sslv3', 'force-tlsv10', 'force-tlsv11', 'force-tlsv12',
      'force-tlsv13', 'generate-certificates',
      'gid', 'group', 'id', 'interface', 'level', 'maxconn', 'mode',
      'mss', 'name', 'nice', 'no-sslv3', 'no-tlsv10', 'no-tlsv11',
      'no-tlsv12', 'no-tlsv13', 'npn', 'prefer-client-ciphers',
      'process', 'protect', 'proto', 'ssl', 'strict-sni', 'tcp-ut',
      'tfo', 'thread', 'transparent', 'uid', 'user', 'verify',
      'v4v6', 'v6only',
    ]),
    global_dirs_added: new Set([
      'chroot', 'user', 'group', 'uid', 'gid', 'daemon', 'master-worker',
      'expose-experimental-directives', 'maxconn', 'nbproc', 'nbthread',
      'cpu-map', 'numa-cpu-mapping', 'ulimit-n', 'pidfile',
      'description', 'node', 'localpeer',
      'stats', 'log-send-hostname', 'log-tag', 'ca-base', 'crt-base',
      'ssl-default-bind-ciphers', 'ssl-default-bind-ciphersuites',
      'ssl-default-bind-options', 'ssl-default-server-ciphers',
      'ssl-default-server-ciphersuites', 'ssl-default-server-options',
      'ssl-dh-param-file', 'ssl-server-verify',
      'tune.ssl.maxrecord', 'tune.maxrewrite', 'tune.bufsize',
      'tune.http.maxhdr', 'tune.idle-pool.shared',
      'tune.rcvbuf.client', 'tune.rcvbuf.server',
      'tune.sndbuf.client', 'tune.sndbuf.server',
      'external-check', 'insecure-fork-wanted',
      'set-var', 'setenv', 'presetenv', 'log', 'h1-case-adjust',
    ]),
    proxy_dirs_added: new Set([
      'mode', 'balance', 'hash-type', 'maxconn', 'fullconn', 'log',
      'option', 'timeout', 'retries', 'acl',
      'http-request', 'http-response', 'http-after-response',
      'tcp-request', 'tcp-response',
      'use_backend', 'default_backend',
      'stick-table', 'stick', 'cookie', 'compression',
      'server', 'server-template', 'server-defaults',
      'http-reuse', 'http-send-name-header',
      'redirect', 'source', 'ignore-persist', 'force-persist',
      'external-check', 'errorfile', 'errorloc', 'errorloc302',
      'stats', 'unique-id-format', 'unique-id-header',
      'capture', 'monitor-uri', 'monitor', 'random', 'bind',
      'log-format', 'log-format-sd', 'log-tag',
      'load-server-state-from-file', 'dynamic-cookie-key',
    ]),
  },
  '2.5': {
    options_added: new Set(['idle-close-on-response']),
    http_request_actions_added: new Set(['wait-for-body']),
    global_dirs_added: new Set(['close-spread-time', 'harden']),
    proxy_dirs_added: new Set([]),
    server_params_added: new Set([]),
    bind_params_added: new Set([]),
  },
  '2.6': {
    options_added: new Set(['httpslog']),
    global_dirs_added: new Set([
      'tune.ssl.hard-maxrecord', 'profiling.memory', 'h1-case-adjust-file',
    ]),
    proxy_dirs_added: new Set([]),
    server_params_added: new Set(['check-alpn', 'check-proto', 'check-sni',
      'check-via-socks4', 'max-session-srv-conns',
    ]),
    bind_params_added: new Set([
      'quic', 'quic-cc-algo', 'quic-force-retry', 'quic-retry-impact-key',
      'quic-socket',
    ]),
  },
  '2.7': {
    global_dirs_added: new Set([]),
    proxy_dirs_added: new Set([]),
    options_added: new Set(['log-reuse-conn']),
    http_request_actions_added: new Set([]),
    server_params_added: new Set([
      'pool-max-conn', 'pool-purge-delay', 'pool-low-conn',
      'max-reuse', 'namespace',
    ]),
    bind_params_added: new Set([]),
  },
  '2.8': {
    global_dirs_added: new Set([]),
    proxy_dirs_added: new Set([]),
    options_added: new Set([]),
    server_params_added: new Set(['log-proto', 'pool-conn-name']),
    bind_params_added: new Set([]),
  },
  '2.9': {
    global_dirs_added: new Set(['h2-workaround-bogus-websocket-clients']),
    proxy_dirs_added: new Set([]),
    options_added: new Set([]),
    http_request_actions_added: new Set([]),
    server_params_added: new Set([]),
    bind_params_added: new Set([]),
  },
  '3.0': {
    global_dirs_added: new Set([]),
    proxy_dirs_added: new Set([]),
    options_added: new Set([]),
    server_params_added: new Set([]),
    bind_params_added: new Set([]),
  },
  '3.1': {
    global_dirs_added: new Set([]),
    proxy_dirs_added: new Set([]),
    options_added: new Set([]),
    server_params_added: new Set([]),
    bind_params_added: new Set([]),
  },
}

function buildVersionData(version) {
  const idx = HAPROXY_VERSIONS.indexOf(version)
  if (idx === -1) return null

  const result = {
    _version: version,
    balance: new Set(),
    options: new Set(),
    http_request_actions: new Set(),
    server_params: new Set(),
    bind_params: new Set(),
    global_dirs: new Set(),
    proxy_dirs: new Set(),
  }

  for (let i = 0; i <= idx; i++) {
    const v = HAPROXY_VERSIONS[i]
    const feat = VERSION_FEATURES[v]
    if (!feat) continue
    for (const k of (feat.balance || [])) result.balance.add(k)
    for (const k of (feat.options || [])) result.options.add(k)
    for (const k of (feat.options_added || [])) result.options.add(k)
    for (const k of (feat.http_request_actions || [])) result.http_request_actions.add(k)
    for (const k of (feat.http_request_actions_added || [])) result.http_request_actions.add(k)
    for (const k of (feat.server_params || [])) result.server_params.add(k)
    for (const k of (feat.server_params_added || [])) result.server_params.add(k)
    for (const k of (feat.bind_params || [])) result.bind_params.add(k)
    for (const k of (feat.bind_params_added || [])) result.bind_params.add(k)
    for (const k of (feat.global_dirs_added || [])) result.global_dirs.add(k)
    for (const k of (feat.proxy_dirs_added || [])) result.proxy_dirs.add(k)
  }

  return result
}

const versionCache = {}
export function getVersionData(version) {
  if (!versionCache[version]) {
    versionCache[version] = buildVersionData(version)
  }
  return versionCache[version]
}
