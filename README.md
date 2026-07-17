# EasyHAEdit

Editor visual de configuración de HAProxy — sitio estático 100% client-side.

## Características

- **Edición visual** de secciones frontend, backend y listen con paneles con pestañas (Overview, ACLs, HTTP Rules, Health Check, Persistence, Timeouts, Options)
- **Diagrama de flujo** — auto-layout SVG mostrando FE → ACL/routes → backends → servers con zoom, filtros y tooltips del config raw
- **Editor raw** — edición directa del texto cfg con feedback de parseo en vivo
- **Parser/serializer** — puerto JavaScript fiel del parser Python original de haproxy, soportando todos los tipos de sección (global, defaults, frontend, backend, listen, resolvers, peers, userlist, program)
- **Validación** — chequeos estructurales sin necesidad del binario haproxy
- **GitHub Pages** — deploy sin configuración via GitHub Actions

## Uso

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción → dist/
npm run preview  # previsualizar build de producción
```

## Deploy

Push a `main` — el `.github/workflows/deploy.yml` incluido compila y publica automáticamente en GitHub Pages.
