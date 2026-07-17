# EasyHAEdit

Editor visual de configuración de HAProxy — sitio estático 100% client-side.

## Características

- **Edición visual** de secciones frontend, backend y listen con paneles con pestañas (Overview, ACLs, HTTP Rules, Health Check, Persistence, Timeouts, Options)
- **Diagrama de flujo** — auto-layout SVG mostrando FE → ACL/routes → backends → servers con zoom, filtros y tooltips del config raw
- **Editor raw** — edición directa del texto cfg con feedback de parseo en vivo
- **Parser/serializer** — puerto JavaScript fiel del parser Python original de haproxy
- **Validador completo** — análisis sintáctico y semántico sin necesidad del binario haproxy:
  - 25+ reglas de validación por directiva (`bind`, `server`, `mode`, `balance`, `timeout`, `option`, `cookie`, `acl`, `stick-table`, `http-request`, `tcp-request`, etc.)
  - Validación cross-sección: nombres duplicados, backends referenciados vs existentes, directivas prohibidas en cada tipo de sección
  - Severidad: errores (bloqueantes) y warnings (convenciones/buenas prácticas)
   - **Selector de versión HAProxy** (2.4 a 3.4) — las reglas se ajustan a la versión seleccionada
   - Directivas obsoletas/eliminadas detectadas según versión (dispatch, option transparent, master-worker, program)
   - Versiones de secciones validadas (crt-store → 3.0+, log-profile/traces → 3.1+, acme → 3.2+)
   - 200+ directivas 3.x incluyendo QUIC backend, TLS ECH, KTLS, ACME, QMux, OpenTelemetry, múltiples buffers
- **Números de línea** en editor raw
- **GitHub Pages** — deploy automatizado via GitHub Actions

## Uso

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción → dist/
npm run preview  # previsualizar build de producción
```

## Deploy

Push a `main` — el `.github/workflows/deploy.yml` incluido compila y publica automáticamente en GitHub Pages.

## Estructura

```
src/
├── lib/
│   ├── haproxy-parser.js      # Parser → objeto estructurado
│   ├── haproxy-serializer.js  # Objeto → texto .cfg
│   ├── haproxy-validator.js   # Validador sintáctico/semántico
│   └── haproxy-versions.js    # Perfiles de versión HAProxy 2.4-3.4
├── components/
│   ├── SectionCard.jsx        # Editor visual por sección
│   ├── ServerEditor.jsx       # Editor de servidores
│   ├── ACLEditor.jsx          # Editor de ACLs
│   ├── HttpRulesEditor.jsx    # Reglas HTTP/TCP
│   ├── HealthCheckEditor.jsx  # Health checks
│   ├── PersistenceEditor.jsx  # Cookie, stick-table
│   ├── TimeoutsEditor.jsx     # Timeouts
│   ├── FlowDiagram.jsx        # Diagrama de flujo SVG
│   └── ValidationPanel.jsx    # Panel de resultados de validación
├── App.jsx
└── main.jsx
```
