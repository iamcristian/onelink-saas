# INFORME DE AUDITORÍA GLOBAL Y TESTEO INTEGRAL — SISTEMA ONELINK

> **Fecha de Ejecución**: 31 de Octubre de 2026  
> **Alcance de la Auditoría**: Monorepo completo (`apps/api`, `apps/web`, `packages/prisma`, `packages/shared`, `tools/ml`, infraestructura Docker y CI/CD).  
> **Objetivo**: Evaluar la funcionalidad real de extremo a extremo, identificar features sin funcionalidad (placebo/rotas), vulnerabilidades de seguridad, problemas de lógica y arquitectura, y verificar el estado de los hallazgos de revisiones previas.

---

## 1. Resumen Ejecutivo y Estado General del Proyecto

El proyecto **OneLink** (plataforma Link-in-Bio de alto rendimiento basada en NestJS 12, Next.js 16, PostgreSQL/TimescaleDB y Redis) demuestra una base técnica sólida, un pipeline de construcción completamente funcional y un avance significativo en la corrección de fallas críticas detectadas en auditorías anteriores.

### Métricas de Validación Dinámica y Compilación

| Prueba / Herramienta | Entorno | Resultado | Detalles |
| :--- | :--- | :--- | :--- |
| **Monorepo Build (`turbo`)** | Producción | **EXITOSO (4/4)** | Compilación limpia de `@repo/shared`, `@repo/prisma`, `apps/api` y `apps/web` (Next.js Turbopack). |
| **Typecheck TypeScript (`tsc`)** | Todos los paquetes | **0 ERRORES** | Sin discrepancias de tipado estricto en API, Web o Shared. |
| **Pruebas Unitarias Backend (`jest`)** | `apps/api` | **80/80 PASADAS** | 8 suites de prueba aprobadas al 100% (Theme, Analytics, Profile, Billing, Link, Auth, Sentinel AI, App). |
| **Pruebas E2E Backend (`supertest`)** | `apps/api` | **PASADAS** | Inicialización del módulo NestJS y endpoints base. |
| **Linter API (`oxlint`)** | `apps/api` | **0 Errores, 1 Warning** | Parámetro `state` sin usar en `auth.service.ts` (OAuth CSRF). |
| **Linter Web (`eslint`)** | `apps/web` | **0 Errores, 7 Warnings** | Advertencias de React 19 (`set-state-in-effect`) en Layout y Billing. |
| **Servicios Docker** | Localhost | **ACTIVOS & SALUDABLES** | TimescaleDB (PostgreSQL 16 en 5432), Redis 7 (en 6379), MailHog (SMTP en 1025, Web en 8025). |
| **API en Vivo (Live E2E)** | HTTP `127.0.0.1:3001` | **13/13 Pruebas Críticas OK** | Health, Swagger, Sentinel AI, Auth Register/Login, Redacción PIN, Roles Guard y Métricas verificadas con datos reales. |

---

## 2. Detección de "Features Sin Funcionalidad" (Placebos, Botones Rotos y UI Huérfana)

Se realizó una auditoría exhaustiva en la capa frontend (`apps/web`) contrastándola contra los controladores y servicios del backend (`apps/api`):

### ❌ FSF-01: Creación de Bloques de Notas (`NOTE`) Rota en el Modal (Imposible de Crear)
- **Ubicación**: `apps/web/src/components/studio/AddEditLinkModal.tsx` (L142, L496–515).
- **Problema**: 
  - Cuando el usuario selecciona el tipo de contenido **"NOTE"** (Nota / Comunicado para la audiencia), el modal renderiza el campo de título, pero **omite completamente el campo `<textarea>`** para redactar el texto o contenido de la nota (el bloque condicional solo abarca `type === "LINK" || type === "DONATION"`).
  - Al presionar *"Save Content"*, la función `handleSubmit` valida estrictamente:
    ```typescript
    if (type === "NOTE" && !url.trim()) {
      setError("Please write some message or text content for your note.");
      return;
    }
    ```
  - Como no existe ningún campo de entrada en el DOM para la nota, `url` permanece vacío y el modal siempre arroja un error bloqueante. Es físicamente imposible para cualquier usuario crear o editar una nota.
- **Acción requerida**: Renderizar un campo `<textarea>` para `content` (o `url`) cuando `type === "NOTE"`.

### ❌ FSF-02: Toggle de Indexación en Motores de Búsqueda (`searchIndexing`) es un Placebo
- **Ubicación**: `apps/web/src/app/studio/settings/page.tsx` (L38, L493–508) y `apps/web/src/app/robots.ts`.
- **Problema**:
  - En *Studio Settings*, existe un interruptor gráfico interactivo para *"Search Engine Indexing & Robots.txt"*.
  - El usuario puede cambiar el switch, pero al guardar (`handleSaveSettings`), el estado `searchIndexing` **no se incluye en el payload de actualización** `UpdateProfilePayload`.
  - La base de datos (`Profile` en `schema.prisma`) **no posee ninguna columna** para persistir esta preferencia.
  - El archivo `apps/web/src/app/robots.ts` devuelve una configuración estática codificada que no consulta este valor para ningún usuario.
- **Acción requerida**: Agregar la columna a la entidad `Profile` y consumirla dinámicamente en `robots.ts` o remover el switch placebo.

### ❌ FSF-03: Botón "Resend Invitation" en Gobernanza de Equipo Falso
- **Ubicación**: `apps/web/src/components/studio/billing/TeamGovernanceSection.tsx` (L105–108).
- **Problema**:
  - En la tabla de colaboradores invitados, cada fila tiene un botón para *"Resend"*.
  - Al hacer clic, la función asociada es:
    ```typescript
    const handleResend = (email: string) => {
      setToastMsg(`📧 Sandbox Email Dispatched: Resent invitation link with fresh token to ${email}`);
      setTimeout(() => setToastMsg(null), 4000);
    };
    ```
  - No ejecuta ninguna llamada HTTP, no renueva ningún token en Redis ni dispara ningún correo real mediante `EmailService`.
- **Acción requerida**: Implementar el endpoint `POST /api/billing/team/resend/:id` en el backend y conectarlo al frontend.

### ❌ FSF-04: KPIs Financieros y Libro Mayor de Facturación Inaccesibles en el Frontend
- **Ubicación**: `apps/web/src/lib/api-client.ts` (L996, L1087) y `apps/web/src/app/studio/billing/page.tsx`.
- **Problema**:
  - Tras implementar la protección RBAC en el backend para `GET /api/billing/metrics` y `GET /api/billing/events`, las funciones `fetchBillingMetrics()` y `fetchBillingEvents()` en `api-client.ts` **olvidaron incluir el header de autorización** (`authHeaders(token)`).
  - Al no enviar el token, el backend rechaza la petición con `401 Unauthorized`.
  - El bloque `catch` del cliente frontend intercepta el fallo y retorna datos falsos hardcodeados (`mrr: 18450.0`, `arr: 221400.0`, `paidSubscriptions: 1520`) o un array vacío. En consecuencia, el dueño de la plataforma jamás visualiza sus ingresos reales.
- **Acción requerida**: Agregar `headers: authHeaders(token)` en `fetchBillingMetrics` y `fetchBillingEvents`.

### ❌ FSF-05: Módulo de Enlaces Sociales Huérfano en el Creator Studio
- **Ubicación**: `apps/api/src/modules/profile/profile.controller.ts` (L112–165) y `apps/web/src/app/[username]/page.tsx` (L413–420).
- **Problema**:
  - El backend cuenta con 5 endpoints completamente funcionales para `social-links` (`GET`, `POST`, `PATCH`, `DELETE`, `PUT /reorder`), validados con Sentinel AI.
  - La página pública de perfil está preparada para pintar los iconos de redes sociales (`profile.socialLinks`).
  - Sin embargo, en el Creator Studio (`/studio/links`, `/studio/appearance`, `/studio/settings`) **no existe ninguna pantalla, botón o modal** para que el usuario gestione sus redes sociales, ni existen métodos en `api-client.ts` para invocar estos endpoints.
- **Acción requerida**: Crear el componente de gestión de redes sociales en el Studio e integrarlo con `api-client.ts`.

---

## 3. Auditoría de Seguridad (Vulnerabilidades y Evaluación de Riesgo)

Evaluación exhaustiva del estado de los 11 vectores de seguridad identificados previamente, más nuevos hallazgos:

### Matriz de Estado de Seguridad

| Código | Severidad | Vulnerabilidad Original | Estado Actual | Evidencia en Código |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **CRÍTICA** | Fuga de URL de links protegidos por PIN y volcado sin autenticación | **RESUELTO** | `profile.service.ts:154` redacta la URL como `null`. `link.controller.ts:51` protege la ruta con `JwtAuthGuard` y no retorna el hash `password`. |
| **SEC-02** | **CRÍTICA** | Bypass de Google OAuth, falta de validación CSRF `state`, Open Redirect | **PARCIAL** | El bypass de mock en prod se mitigó con `isDev` (`auth.service.ts:304`). **Sin embargo**, el parámetro `state` sigue sin validarse contra ataques CSRF (OxLint warning) y el token JWT se envía en la query string de redirección (`?token=...`). |
| **SEC-03** | **CRÍTICA** | Bypass de firma Stripe Webhook y falta de `rawBody` | **RESUELTO** | `main.ts:8` habilita `rawBody: true`. `billing.controller.ts:107` y `billing.service.ts:636-650` validan la firma criptográfica mediante `stripe.webhooks.constructEvent` con Buffer crudo. |
| **SEC-04** | **CRÍTICA** | Escalación de privilegios gratuita en Checkout y IDOR en confirmación | **RESUELTO** | `billing.service.ts:376` prohíbe la simulación en producción. `billing.service.ts:544-550` exige `payment_status === 'paid'` y verifica pertenencia de usuario. |
| **SEC-05** | **ALTA** | Métricas financieras de fundadores y ledger accesibles anónimamente | **RESUELTO** | `billing.controller.ts:57, 124` protege `/metrics` y `/events` con `JwtAuthGuard`, `RolesGuard` y `@Roles(Role.SUPER_ADMIN, Role.OWNER)`. |
| **SEC-06** | **ALTA** | Secreto JWT por defecto y usuarios baneados retienen acceso 30 días | **RESUELTO** | `auth.module.ts:19` aborta en arranque si `JWT_SECRET` falta en producción. `jwt-auth.guard.ts:31` consulta la lista negra en Redis `auth:banned_users`. |
| **SEC-07** | **ALTA** | RBAC roto: rol `Viewer` podía modificar enlaces y borrar workspaces | **RESUELTO** | `profile-access.service.ts:25-80` implementa jerarquía de roles (`VIEWER: 1`, `EDITOR: 2`, `ADMIN: 3`, `OWNER: 4`). `link.service.ts` exige nivel `EDITOR` para mutaciones. |
| **SEC-08** | **ALTA** | Reflejo arbitrario de Origin en CORS (`origin: true`) | **NUEVO RIESGO** | Se reemplazó el comodín, pero se añadió la regla `origin.endsWith('.vercel.app')` en `main.ts:35` y `route.ts:33`. **Cualquier atacante con cuenta gratuita en Vercel (`atacante.vercel.app`) obtiene permisos de CORS con credenciales habilitadas**. |
| **SEC-09** | **ALTA** | Social links eluden validación de URL y motor Sentinel AI | **RESUELTO** | `profile.service.ts:493-500` invoca `isValidWebUrl` y `sentinelAi.evaluateUrl` antes de persistir cualquier enlace social. |
| **SEC-10** | **MEDIA** | Inyección HTML en emails y exportación CSV vulnerable a fórmulas | **PARCIAL** | Los emails y el recibo imprimible implementan `escapeHtml()`. Pero `InvoicingEventsLedger.tsx:73` sigue exportando con `encodeURI("data:text/csv...")` (se trunca con caracteres especiales) y no envuelve celdas con comas entre comillas. |
| **SEC-11** | **MEDIA** | JWT en `localStorage` y pantalla `/admin/moderation` sin guardia | **PARCIAL** | `/admin/moderation/page.tsx:77` redirige si el usuario no es Admin/Owner. Sin embargo, no existe un middleware de servidor en Next.js (`middleware.ts`), lo que permite que el shell cliente se renderice fugazmente antes de la redirección. |

---

## 4. Problemas de Lógica, Algoritmos y Machine Learning

### ⚠️ PL-01: Falsos Positivos Severos en el Modelo ONNX de Sentinel AI
- **Archivo**: `apps/api/src/modules/sentinel-ai/sentinel-ai.service.ts` y `tools/ml/train_sentinel_model.py`.
- **Comportamiento Detectado en Pruebas**:
  - Mientras que dominios globales (`google.com`, `github.com`, `instagram.com`) pasan directamente por la lista blanca (`allowlist.util.ts`), URLs comunes como `https://myportfolio.example.com` o dominios personalizados de creadores son evaluados por el modelo ONNX y clasificados con un **riesgo del 91.7% (`PHISHING`)**, bloqueando su adición.
  - **Causa**: El modelo Random Forest fue entrenado con un dataset sintético muy reducido donde la presencia de subdominios o ciertas longitudes de URL se correlacionó incorrectamente con phishing.
  - **Impacto**: Creadores con dominios propios o enlaces a blogs personales no pueden agregar sus enlaces legítimos.

### ⚠️ PL-02: Patrones Wildcard de Lista Negra (`*.xyz`, `*.top`) Inoperantes en Redis
- **Archivo**: `packages/prisma/seed.ts` (L585–605) y `apps/api/src/modules/sentinel-ai/sentinel-ai.service.ts` (L155–165).
- **Comportamiento**:
  - `seed.ts` inserta patrones como `'*.xyz'`, `'*.top'`, `'drainer-*.cc'`.
  - `syncBlocklistToRedis()` los carga textualmente al set `sentinel:blocked_domains` en Redis.
  - `evaluateUrl()` descompone el hostname en candidatos exactos (`sub.bad.xyz`, `bad.xyz`) y ejecuta `SISMEMBER`.
  - Como `SISMEMBER` en Redis es una búsqueda O(1) de cadena exacta, `'bad.xyz'` nunca iguala a `'*.xyz'`, haciendo que las reglas globales con comodines nunca coincidan.

---

## 5. Arquitectura, Código Limpio (DRY/KISS) y DevOps

### Estado de Correcciones Estructurales:
- **ARCH-01 (Inyección directa de Prisma en controladores)**: **CORREGIDO**. `admin-security.controller.ts` ahora delega el 100% de la lógica a `SentinelAiService`.
- **BUG-05 (Inflación de CTR y conteo de clicks en Analíticas)**: **CORREGIDO**. `analytics.service.ts` usa `clickMap.get(l.id) ?? 0` en lugar del fallback erróneo `|| l.clickCount`.
- **BUG-06 (Caché de perfil sirve enlaces expirados)**: **CORREGIDO**. `profile.service.ts` aplica `filterActiveWindowLinks` dinámicamente sobre la carga de Redis al momento de la petición.
- **BUG-07 (Reordenamiento de enlaces muta elementos incorrectos con filtro activo)**: **CORREGIDO**. `links/page.tsx` utiliza índices absolutos del array maestro `items.findIndex()`.
- **BUG-09 (Audit log registra nuevo estado como previo)**: **CORREGIDO**. `sentinel-ai.service.ts` guarda `existing.status` en el log de auditoría.
- **BUG-10 (Validación de nombres de usuario reservados en perfil)**: **CORREGIDO**. `UpdateProfileSchema` implementa `UsernameFieldSchema` con verificación estricta de nombres reservados.
- **DRY-01 y DRY-02 (Duplicidad de constantes)**: **CORREGIDO**. `RESERVED_USERNAMES` y `CANONICAL_THEME_PRESETS` están centralizados en `@repo/shared`.

### Oportunidades de Mejora Restantes:
- **KISS-02 (Guardas de test en código de producción)**: Persisten comprobaciones como `if (this.prisma.teamMember?.findMany)` en `billing.service.ts` para tolerar mocks incompletos de Jest.
- **Exportación Segura de CSV**: Utilizar `new Blob([csv], { type: 'text/csv' })` y `URL.createObjectURL` en lugar de data URIs codificadas con `encodeURI`.

---

## 6. Conclusiones y Recomendaciones Priorizadas

El proyecto se encuentra en un estado funcional muy avanzado, con su pipeline de CI/CD listo y una arquitectura escalable. Las prioridades de intervención son:

1. **Prioridad 1 (Funcional)**: Habilitar el `<textarea>` en `AddEditLinkModal.tsx` para permitir que los usuarios creen y editen bloques de tipo `NOTE`.
2. **Prioridad 2 (Seguridad)**: Restringir la regla CORS de `.vercel.app` en `apps/api/src/main.ts` y en `proxy route.ts` a los dominios específicos del proyecto, impidiendo que cualquier app ajena en Vercel haga peticiones autenticadas.
3. **Prioridad 3 (Funcional / Conectividad)**: Añadir `authHeaders(token)` en `fetchBillingMetrics()` y `fetchBillingEvents()` en `api-client.ts` para que el panel del propietario muestre los datos reales en lugar de cifras simuladas.
4. **Prioridad 4 (Machine Learning)**: Reentrenar el modelo de Sentinel AI o ajustar el umbral de `BLOCK_IMMEDIATE` para evitar falsos positivos en dominios legítimos no presentes en la lista blanca.
5. **Prioridad 5 (Completitud UI)**: Crear una interfaz visual en el Studio para gestionar los Enlaces Sociales (`social-links`), conectándola con los endpoints existentes en el backend.

