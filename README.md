# EasyHAEdit

Editor visual de configuración de HAProxy — sitio estático 100% client-side.

## Características

- **Edición visual modal** — cada sección (frontend, backend, listen) se abre como popup a pantalla completa con pestañas (Overview, ACLs, HTTP Rules, Health Check, Persistence, Timeouts, Options)
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
- **BindEditor** — editor estructurado de bind params con toggle de opciones por versión
- **ServerEditor version-aware** — parámetros de servidor filtrados según versión HAProxy
- **Duplicación de secciones** — clonar frontend/backend/listen con un click
- **Búsqueda de secciones** — filtro por nombre en el editor visual
- **Undo/Redo** — historial de cambios (Ctrl+Z / Ctrl+Shift+Z)
- **Validación por sección** — botón Validate en cada modal para validar la sección individual contra la versión HAProxy seleccionada
- **Auto-validate** — Al cambiar versión HAProxy se re-ejecuta validación automáticamente
- **Secciones editables global/defaults** — edición visual completa de la sección `global` (maxconn, nbthread, user, group, daemon, log, etc.) y múltiples secciones `defaults` (mode, balance, timeouts, options) desde el editor visual
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
│   ├── haproxy-parser.js      # Parser → objeto estructurado (handlers modulares por sección)
│   ├── haproxy-serializer.js  # Objeto → texto .cfg
│   ├── haproxy-validator.js   # Validador sintáctico/semántico
│   ├── haproxy-utils.js       # Utilidades compartidas (stripComment, kv, splitSections)
│   └── haproxy-versions.js    # Perfiles de versión HAProxy 2.4-3.4
├── components/
│   ├── SectionCard.jsx        # Editor visual por sección (modal popup con pestañas + validación)
│   ├── ServerEditor.jsx       # Editor de servidores (version-aware)
│   ├── BindEditor.jsx         # Editor estructurado de bind params
│   ├── ACLEditor.jsx          # Editor de ACLs con dropdown de criterios portaleado
│   ├── HttpRulesEditor.jsx    # Reglas HTTP/TCP con templates portaleados
│   ├── HealthCheckEditor.jsx  # Health checks
│   ├── PersistenceEditor.jsx  # Cookie, stick-table
│   ├── TimeoutsEditor.jsx     # Timeouts
│   ├── FlowDiagram.jsx        # Diagrama de flujo SVG
│   └── ValidationPanel.jsx    # Panel de resultados de validación global
├── App.jsx
└── main.jsx
```
