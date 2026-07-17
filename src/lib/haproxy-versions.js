export const HAPROXY_VERSIONS = ['2.4', '2.5', '2.6', '2.7', '2.8', '2.9', '3.0', '3.1', '3.2', '3.3', '3.4']

export const DEFAULT_VERSION = '3.0'

const VERSION_FEATURES = {
  '2.4': {
    balance: new Set([
      'roundrobin', 'leastconn', 'source', 'random', 'uri', 'hdr',
      'rdp-cookie', 'first', 'static-rr', 'url_param',
    ]),
    options: new Set([
      'abortonclose', 'accept-invalid-http-request', 'accept-invalid-http-response',
      'allbackups', 'backups', 'checkcache', 'clitcpka', 'close',
      'contstats',       'disable-h2-upgrade', 'dontlognull', 'dontlog-normal',
      'external-check', 'forceclose', 'forwardfor',
      'http-buffer-request', 'idle-close-on-response',
      'http-ignore-probes', 'http-no-delay', 'http-pretend-keepalive',
      'http-proxy', 'http-restrict-req-hdr-names', 'http-server-close',
      'http-tunnel', 'http-use-proxy-header', 'http-use-htx', 'http-keep-alive',
      'httpchk', 'httpclose', 'httplog', 'independent-streams', 'ldap-check',
      'log-health-checks', 'log-separate-errors', 'logasap', 'mysql-check',
      'nolinger', 'originalto', 'persist', 'pgsql-check', 'prefer-last-server',
      'redispatch', 'redis-check', 'smtpchk', 'socket-stats',
      'splice-auto', 'splice-request', 'splice-response', 'spop-check',
      'ssl-hello-chk', 'srvtcpka', 'standalone', 'tcp-check',
      'tcp-smart-accept',
      'tcp-smart-connect', 'tcpka', 'tcplog', 'transparent',
    ]),
    http_request_actions: new Set([
      'allow', 'deny', 'redirect', 'auth', 'tarpit',
      'add-header', 'set-header', 'del-header',
      'replace-header', 'replace-value', 'set-nice', 'set-log-level',
      'set-tos', 'set-mark', 'set-uri', 'set-path', 'set-query',
      'set-method', 'set-src', 'set-dst', 'set-dst-port', 'set-src-port',
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
      'del-map', 'set-status', 'strict-mode', 'cache-store',
      'close', 'pause',
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
      'external-check', 'errorfile', 'errorfiles', 'errorloc', 'errorloc302',
      'errorloc303', 'error-log-format', 'backlog', 'description',
      'disabled', 'enabled', 'id', 'rate-limit sessions', 'retry-on',
      'stats', 'unique-id-format', 'unique-id-header',
      'capture', 'monitor-uri', 'monitor', 'random', 'bind', 'filter',
      'log-format', 'log-format-sd', 'log-tag',
      'load-server-state-from-file', 'dynamic-cookie-key', 'transparent',
      'persist rdp-cookie', 'server-state-file-name',
      'use-fcgi-app', 'use-server',
      'hash-balance-factor', 'hash-preserve-affinity',
      'declare capture', 'force-be-switch',
      'email-alert', 'h1-case-adjust-bogus-client', 'h1-case-adjust-bogus-server',
      'http-drop-request-trailers', 'http-drop-response-trailers', 'srvtcpka-cnt',
      'srvtcpka-idle', 'srvtcpka-intvl', 'clitcpka-cnt', 'clitcpka-idle',
      'clitcpka-intvl', 'max-keep-alive-queue', 'max-session-srv-conns',
      'http-check', 'tcp-check',
    ]),
  },
  '2.5': {
    options_added: new Set([]),
    http_request_actions_added: new Set(['wait-for-body', 'set-var-fmt']),
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
    options_added: new Set(['forwarded']),
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
    balance_added: new Set(['hash', 'log-hash']),
    global_dirs_added: new Set([
      'harden.reject-privileged-ports.tcp', 'harden.reject-privileged-ports.quic',
      'ssl-security-level', 'stats-file', 'http-err-codes', 'http-fail-codes',
      'thread-hard-limit', 'key-base', 'issuers-chain-path', 'default-path',
      'fd-hard-limit', 'no-quic', 'expose-deprecated-directives',
      'ocsp-update.disable', 'ocsp-update.maxdelay', 'ocsp-update.mindelay',
      'ocsp-update.httpproxy', 'ocsp-update.mode',
      'grace', 'limited-quic', 'prealloc-fd', 'set-dumpable',
      'insecure-setuid-wanted', 'pp2-never-send-local',
      'h1-accept-payload-with-any-method', 'h1-do-not-close-on-insecure-transfer-encoding',
      'ssl-default-bind-client-sigalgs', 'ssl-default-bind-curves',
      'ssl-default-bind-sigalgs', 'ssl-default-server-client-sigalgs',
      'ssl-default-server-curves', 'ssl-default-server-sigalgs',
      'ssl-propquery', 'ssl-provider', 'ssl-provider-path',
      'ssl-skip-self-issued-ca', 'unix-bind', 'ssl-security-level',
    ]),
    proxy_dirs_added: new Set([
      'guid', 'crt-store', 'log-steps', 'hash-balance-factor',
    ]),
    options_added: new Set([]),
    http_request_actions_added: new Set([
      'set-fc-mark', 'set-fc-tos', 'set-bc-mark', 'set-bc-tos',
    ]),
    server_params_added: new Set([
      'guid', 'namespace',
    ]),
    bind_params_added: new Set([
      'default-crt', 'namespace',
    ]),
  },
  '3.1': {
    global_dirs_added: new Set([
      'tune.h2.fe.rxbuf', 'tune.h2.be.rxbuf',
      'tune.renice.startup', 'tune.renice.runtime',
      'tune.quic.cc.cubic.min-losses',
      'crt-store', 'log-profile', 'traces',
    ]),
    proxy_dirs_added: new Set([
      'quic-initial', 'log-profile',
    ]),
    options_added: new Set([
      'accept-unsafe-violations-in-http-request',
      'accept-unsafe-violations-in-http-response',
    ]),
    http_request_actions_added: new Set([
      'set-retries', 'do-log',
    ]),
    server_params_added: new Set([
      'init-state',
    ]),
    bind_params_added: new Set([]),
  },
  '3.2': {
    global_dirs_added: new Set([
      'cpu-policy', 'cpu-set', 'dns-accept-family',
      'tune.notsent-lowat.client', 'tune.notsent-lowat.server',
      'tune.glitches.kill.cpu-usage',
      'tune.quic.frontend.stream-data-ratio',
      'tune.quic.frontend.max-tx-mem',
      'acme',
    ]),
    proxy_dirs_added: new Set([
      'ssl-f-use',
    ]),
    options_added: new Set([
      'host',
    ]),
    http_request_actions_added: new Set([]),
    server_params_added: new Set([]),
    bind_params_added: new Set([]),
  },
  '3.3': {
    global_dirs_added: new Set([
      'ssl-passphrase-cmd', 'tune.quic.listen',
      'shm-stats-file', 'tune.quic.mem.tx-max',
      'tune.quic.fe.cc.cubic-min-losses', 'tune.quic.fe.cc.hystart',
      'tune.quic.fe.cc.max-frame-loss', 'tune.quic.fe.cc.max-win-size',
      'tune.quic.fe.cc.reorder-ratio', 'tune.quic.fe.max-idle-timeout',
      'tune.quic.fe.sec.glitches-threshold', 'tune.quic.fe.stream.data-ratio',
      'tune.quic.fe.stream.max-concurrent', 'tune.quic.fe.stream.rxbuf',
      'tune.quic.fe.tx.pacing', 'tune.quic.fe.tx.udp-gso',
      'tune.quic.be.cc.cubic-min-losses', 'tune.quic.be.cc.hystart',
      'tune.quic.be.cc.max-frame-loss', 'tune.quic.be.cc.max-win-size',
      'tune.quic.be.cc.reorder-ratio', 'tune.quic.be.max-idle-timeout',
      'tune.quic.be.sec.glitches-threshold', 'tune.quic.be.stream.data-ratio',
      'tune.quic.be.stream.max-concurrent', 'tune.quic.be.stream.rxbuf',
      'tune.quic.be.tx.pacing', 'tune.quic.be.tx.udp-gso',
    ]),
    proxy_dirs_added: new Set([]),
    options_added: new Set([]),
    http_request_actions_added: new Set([]),
    server_params_added: new Set([
      'sni-auto', 'no-sni-auto', 'check-sni-auto', 'no-check-sni-auto',
      'tcp-md5sig', 'cc', 'quic-cc-algo',
    ]),
    bind_params_added: new Set([
      'ech', 'tcp-md5sig', 'ktls',
    ]),
  },
  '3.4': {
    global_dirs_added: new Set([
      'tune.bufsize.large', 'tune.bufsize.small',
      'tune.cli.max-payload-size', 'tune.lua.openlibs',
      'tune.quic.fe.stream.max-total',
      'tune.h2.fe.max-frames-at-once', 'tune.h2.be.max-frames-at-once',
      'tune.h2.fe.max-rst-at-once', 'tune.h2.log-errors',
      'cpu-affinity', 'max-threads-per-group',
    ]),
    proxy_dirs_added: new Set([
      'filter-sequence',
    ]),
    options_added: new Set(['use-small-buffers']),
    http_request_actions_added: new Set([]),
    server_params_added: new Set([]),
    bind_params_added: new Set(['qmux']),
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
    for (const k of (feat.balance_added || [])) result.balance.add(k)
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
