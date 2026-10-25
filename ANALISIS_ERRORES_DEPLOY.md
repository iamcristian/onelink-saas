# Diagnóstico de Errores en Producción (Vercel + Render + Stripe) — OneLink

Este documento detalla la causa raíz exacta de cada fallo que ocurre al probar **OneLink** desplegado en producción (**Vercel + Render + Stripe + Google OAuth + Neon**), sin haber modificado ninguna línea de código del repositorio.

---

## Resumen Ejecutivo de las 5 Causas Raíz

| # | Problema en Producción | Síntoma Visible | Causa Raíz Exacta |
| :--- | :--- | :--- | :--- |
| **1** | **`Cannot PUT /api/profiles//custom-theme`** y errores `404` al crear/editar Links | Al pulsar **Save Changes** en *Appearance & Branding* con el usuario `cristianarando1`, aparece `Cannot PUT /api/profiles//custom-theme` (con doble barra `//`). En *Links*, crear o editar falla. | `profileId` se inicializa en `""` y **nunca se guarda en el estado React desde `fetchCurrentUser()`** (`targetProfileId` se queda en una variable local descartada). Si `fetchProfile(username)` falla o tarda, la UI carga tus datos (`cristianarando1`, `Cristian Arando`, `Welcome to my OneLink page!`) desde `localStorage`, pero deja `profileId = ""`. |
| **2** | **Los Links no se leen de la base de datos ni se sincronizan en `/studio/links`** | Los links creados desaparecen, no cargan desde PostgreSQL o solo viven en `localStorage`. | Tras el parche de seguridad `SEC-01`, el endpoint `GET /api/links/profile/:profileId` exige `@UseGuards(JwtAuthGuard)`, pero `fetchProfileLinks()` en `apps/web/src/lib/api-client.ts` (líneas 129–141) **no envía el header `Authorization: Bearer <token>`**, recibiendo `401 Unauthorized` en cada carga. |
| **3** | **Error `403 Forbidden` al guardar cualquier cambio en Appearance & Branding** | Incluso cuando `profileId` sí se resuelve, guardar un preset estándar (`Cyberpunk Neon` / `Space Grotesk`) o cambiar la bio lanza error `403`. | `handleSave()` ejecuta siempre `apiSaveCustomTheme()` dentro de un `Promise.all`. El backend bloquea `PUT /api/profiles/:id/custom-theme` si el plan activo es `FREE` (y `validateGoogleUser` asigna el plan `FREE` a tu cuenta `cristianarando1` aunque tenga rol `OWNER`). |
| **4** | **Desconexión entre Proxy de Next.js (`/api/[...path]`), llamadas directas del navegador y CORS** | Peticiones que funcionan en local (`localhost:3000`) fallan en Vercel hacia Render (`Failed to fetch` / `CORS` / `404`). | Cuando defines `NEXT_PUBLIC_API_URL` en Vercel, `api-config.ts` hace que el navegador llame directo a Render saltándose el proxy de Next.js, sin limpiar barras finales (`/`) ni `/api`, y chocando contra la lista cerrada de orígenes CORS en `main.ts` si el dominio de Vercel no coincide exactamente. |
| **5** | **Stripe falla en Render (`NODE_ENV=production`)** | Al intentar hacer upgrade a *Creator Pro* o *Enterprise*, responde `400 Payment gateway is not configured` o `Stripe checkout session creation failed`. | En local (`NODE_ENV !== 'production'`), el backend simula el pago si faltan variables de Stripe. En Render (`NODE_ENV=production`), el parche `SEC-04` bloquea el modo simulación y exige las variables reales de Stripe (`STRIPE_SECRET_KEY` + los 4 `STRIPE_PRICE_ID_*`), las cuales no están documentadas en `DEPLOYMENT.md`. |

---

## 1. ¿Por qué sale `Cannot PUT /api/profiles//custom-theme` con los datos de `cristianarando1` en pantalla?

Observa el mensaje de error: `Cannot PUT /api/profiles//custom-theme`.
Hay **dos barras seguidas (`//`)** entre `profiles` y `custom-theme` porque la variable de estado `profileId` vale **`""` (string vacío)** al momento de hacer clic en **Save Changes**.

### Flujo exacto del bug en `apps/web/src/app/studio/appearance/page.tsx`

1. **Estado inicial vacío** (línea 232):
   ```ts
   const [profileId, setProfileId] = useState<string>("");
   ```

2. **`fetchCurrentUser()` obtiene el `profile.id`, pero NO actualiza el estado `profileId`** (líneas 314–323):
   ```ts
   const userSession = await fetchCurrentUser();
   if (userSession?.profile?.username) {
     targetUsername = userSession.profile.username;
     targetProfileId = userSession.profile.id || "";
   }
   ```
   Aquí `targetProfileId` se guarda en una variable local dentro del `useEffect`, **pero jamás se llama a `setProfileId(targetProfileId)`**.

3. **Dependencia total de `fetchProfile(targetUsername)` (`GET /api/profiles/cristianarando1`)** (líneas 334–336):
   ```ts
   const p = await fetchProfile(targetUsername);
   if (p && isMounted) {
     setProfileId(p.id);
   ```
   `setProfileId` **solo** se ejecuta si la petición pública `GET /api/profiles/cristianarando1` responde `200 OK`.
   Si `fetchProfile(targetUsername)` devuelve `null` —por ejemplo:
   - Porque `NEXT_PUBLIC_API_URL` en Vercel tiene una barra final `/` o `/api` produciendo una URL malformada,
   - Porque Render bloqueó la petición por CORS desde tu URL de Vercel,
   - Porque desactivaste temporalmente la página pública en Settings (`isPublished: false`, lo que hace que `GET /api/profiles/:username` devuelva `404 This profile is currently private or deactivated`), o
   - Por un *cold start* / timeout de Render—,
   entonces **`setProfileId` nunca se llama y `profileId` se queda en `""`**.

4. **¿Por qué sí aparecen `cristianarando1`, `Cristian Arando`, `Welcome to my OneLink page!` y `Space Grotesk (Tech Editorial)` en el formulario?**
   - Cuando iniciaste sesión con Google OAuth, `AuthService.validateGoogleUser` (`apps/api/src/modules/auth/auth.service.ts`, líneas 466–499) creó tu perfil con:
     - `username: "cristianarando1"`
     - `title: "Cristian Arando"`
     - `bio: "Welcome to my OneLink page!"`
   - Además, cuando eliges el preset **Cyberpunk Neon** (que tiene `bgValue: "linear-gradient(135deg, #09090b 0%, #020617 100%)"` y `fontFamily: "Space Grotesk"`), `handleSelectPreset` (líneas 438–473) guarda todo el objeto de apariencia en `localStorage` bajo `onelink_studio_appearance_cristianarando1` (**pero sin incluir `profileId`**).
   - Al recargar o entrar a `/studio/appearance`, cuando `fetchProfile` retorna `null`, el código entra al bloque fallback de `localStorage` (líneas 401–431) o asigna `setUsername(targetUsername)` (línea 422), rellenando todos los campos visuales en pantalla pero dejando **`profileId = ""`**.

5. **El disparo del error al hacer clic en `Save Changes`** (`handleSave`, líneas 531–548):
   ```ts
   await Promise.all([
     apiSaveCustomTheme(profileId, { ... }), // PUT /api/profiles//custom-theme
     apiUpdateProfile(profileId, { ... }),   // PATCH /api/profiles/
   ]);
   ```
   Como `profileId` es `""`, `apiSaveCustomTheme("", ...)` envía `PUT /api/profiles//custom-theme`. NestJS no encuentra coincidencia con `@Put(':id/custom-theme')` y responde `404 Cannot PUT /api/profiles//custom-theme`.

### El mismo bug de `profileId = ""` ocurre en `/studio/links` y `/studio/settings`

- En **`apps/web/src/app/studio/links/page.tsx` (líneas 95–131)**:
  `targetProfileId` también se guarda en una variable local tras `fetchCurrentUser()`, pero `setProfileId(fullProfile.id)` **solo** se llama en la línea 110 si `fetchProfile(targetUsername)` tiene éxito. Si falla, `profileId` queda en `""`, y al crear o editar un link las llamadas van a:
  - `POST /api/links/profile/` → `Cannot POST /api/links/profile/` (`404`)
  - `PATCH /api/links/:id/profile/` → `Cannot PATCH /api/links/:id/profile/` (`404`)
- En **`apps/web/src/app/studio/settings/page.tsx` (líneas 49–85)**:
  Ignora por completo `userSession.profile.id` y depende al 100% de `fetchProfile(usernameToLoad)`. Si desactivas tu perfil en Settings (`isPublished: false`), la siguiente vez que cargas Settings `fetchProfile` devuelve `404` (porque el endpoint público bloquea perfiles despublicados), `profileId` queda en `""`, y ya no puedes volver a publicar ni guardar cambios en Settings.
- **Dato clave**: El backend ya tiene un endpoint autenticado pensado para el dueño del estudio (`GET /api/profiles/me` en `ProfileController.getMyProfile`, `apps/api/src/modules/profile/profile.controller.ts`, líneas 41–45), el cual devuelve el perfil aunque esté despublicado (`isPublished: false`), **pero ningún archivo del frontend lo utiliza**.

---

## 2. ¿Por qué fallan la lectura y escritura de Links en `/studio/links`?

Además del problema de `profileId = ""` descrito arriba, existen **dos fallos adicionales** en la gestión de Links:

### 2.1. `fetchProfileLinks()` no envía el token JWT (`401 Unauthorized`)

En el commit `0ac4138` (*resolve 39 security, bug, architecture, and devops issues from CODE_REVIEW.md*), se aplicó la regla `SEC-01` en `apps/api/src/modules/link/link.controller.ts` (líneas 50–60):

```ts
@UseGuards(JwtAuthGuard)
@Get('profile/:profileId')
async getLinks(
  @CurrentUser() user: AuthUser,
  @Param('profileId') profileId: string,
) {
  return this.linkService.findAllByProfile(profileId, user.id, user.role);
}
```

Sin embargo, en `apps/web/src/lib/api-client.ts` (líneas 129–141), la función `fetchProfileLinks` **se quedó sin el header `Authorization`**:

```ts
export async function fetchProfileLinks(profileId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/links/profile/${profileId}`, {
      cache: "no-store",
      // ❌ FALTA headers: getAuthHeaders()
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  return null;
}
```

**Efecto directo**: Cada vez que entras a `/studio/links` (línea 157) o `/studio/appearance` (línea 339), la petición `GET /api/links/profile/:profileId` recibe **`401 Unauthorized`** de Render. Como el `catch` silencia el error y retorna `null`, el estudio **jamás carga tus links reales de PostgreSQL** a través de ese endpoint y cae siempre al fallback de `localStorage`.

### 2.2. Inconsistencia con bloques tipo `NOTE`

- En `apps/web/src/app/studio/links/page.tsx` (línea 163) y `apps/web/src/app/[username]/page.tsx` (línea 44), el tipo `NOTE` no está contemplado en el renderizado público (`LinkPill`), por lo que una nota guardada se renderiza como un botón `<a>` cuyo `href` es el texto completo de la nota.

---

## 3. ¿Por qué `Save Changes` en Appearance & Branding también falla con `403 Forbidden` aunque tenga `profileId`?

Incluso cuando `profileId` sí está presente, al pulsar **Save Changes** en `/studio/appearance` ocurre lo siguiente:

1. En `apps/web/src/app/studio/appearance/page.tsx` (líneas 531–548), `handleSave` ejecuta incondicionalmente:
   ```ts
   await Promise.all([
     apiSaveCustomTheme(profileId, {
       bgType,
       bgColor: bgType === "gradient" ? undefined : bgValue,
       bgGradient: bgType === "gradient" ? bgValue : undefined,
       ...
     }),
     apiUpdateProfile(profileId, {
       username: cleanUser,
       title: displayName,
       bio: bio,
       avatarUrl: avatarUrl,
     }),
   ]);
   ```
2. En el backend, `ProfileService.upsertCustomTheme` (`apps/api/src/modules/profile/profile.service.ts`, líneas 348–359) verifica la suscripción del usuario:
   ```ts
   const sub = await this.prisma.subscription.findFirst({
     where: { userId: existing.userId, status: 'ACTIVE' },
     include: { plan: true },
     orderBy: { createdAt: 'desc' },
   });
   const features = (sub?.plan?.features as Record<string, any>) || {};
   if (!features.customThemes && sub?.plan?.code === 'FREE') {
     throw new ForbiddenException(
       'Custom theme engine is only available on Creator Pro and Enterprise Studio plans.',
     );
   }
   ```
3. **¿Qué pasa con tu usuario `cristianarando1` creado con Google OAuth?**
   En `AuthService.validateGoogleUser` (`apps/api/src/modules/auth/auth.service.ts`, líneas 458–509):
   - Aunque tu correo coincida con `OWNER_EMAIL` y te asigne `role: 'OWNER'`, justo debajo (en la línea 501) el código busca el plan `'FREE'` y **te crea una suscripción `FREE` en la tabla `Subscription`**.
   - Cuando `upsertCustomTheme` revisa `sub?.plan?.code === 'FREE'`, **no verifica si `user.role === 'OWNER'`** y lanza **`403 Forbidden: Custom theme engine is only available on Creator Pro and Enterprise Studio plans.`**
   - Además, como `handleSave` llama a `apiSaveCustomTheme` dentro de un `Promise.all` **siempre** (incluso si solo cambiaste tu nombre, tu bio, tu avatar o elegiste uno de los 8 temas predefinidos como *Cyberpunk Neon*), cualquier usuario en plan `FREE` recibe un error en pantalla al intentar guardar su perfil en la pestaña *Appearance & Branding*.

---

## 4. Problemas de Red en Deploy: `NEXT_PUBLIC_API_URL`, Reverse Proxy y CORS (Vercel ↔ Render)

El proyecto tiene una arquitectura híbrida en el frontend que en local pasa desapercibida, pero en Vercel + Render causa fallos cruzados:

### 4.1. Dos caminos distintos para hablar con la API
1. **Camino A (Proxy interno de Next.js `/api/[...path]`)**:
   - Usado por `LoginPage`, `RegisterPage` y el botón de Google OAuth (`/api/auth/google`).
   - El navegador llama al mismo dominio de Vercel (`https://tu-app.vercel.app/api/...`) y el Route Handler `apps/web/src/app/api/[...path]/route.ts` reenvía la petición a Render usando `BACKEND_URL || NEXT_PUBLIC_API_URL`.
2. **Camino B (Llamada directa del navegador a Render desde `api-client.ts`)**:
   - Usado por todo el Studio (`Appearance`, `Links`, `Settings`, `Billing`, `Analytics`).
   - En `apps/web/src/lib/api-config.ts` (líneas 7–18):
     ```ts
     export function getApiBaseUrl(): string {
       if (process.env.NEXT_PUBLIC_API_URL) {
         return process.env.NEXT_PUBLIC_API_URL;
       }
       if (typeof window !== "undefined") {
         return "";
       }
       return process.env.BACKEND_URL || "http://127.0.0.1:3001";
     }
     ```
   - Como `NEXT_PUBLIC_API_URL` se inyecta en el bundle del navegador en Vercel, `getApiBaseUrl()` **NO devuelve `""`**, sino la URL de Render, obligando al navegador del usuario a hacer peticiones *cross-origin* directas a Render en vez de pasar por el proxy `/api/[...path]` de Vercel.

### 4.2. Tres fallos derivados de esta configuración en Vercel + Render
1. **Falta de sanitización en `getApiBaseUrl()`**:
   A diferencia de `route.ts` (línea 8) que limpia `.replace(/\/+$/, "").replace(/\/api$/, "")`, `getApiBaseUrl()` devuelve `NEXT_PUBLIC_API_URL` tal cual. Si en Vercel configuraste `NEXT_PUBLIC_API_URL` con `/` al final (ej. `https://onelink-api.onrender.com/`) o con `/api` al final (ej. `https://onelink-api.onrender.com/api`), todas las llamadas de `api-client.ts` se convierten en `https://...//api/profiles/...` o `https://.../api/api/profiles/...`, fallando con `404 Not Found`.
2. **Bloqueo CORS en Render (`apps/api/src/main.ts`)**:
   En `apps/api/src/main.ts` (líneas 15–47), Render solo acepta peticiones desde:
   - `https://onelink-saas.vercel.app`
   - `https://onelink.bio`
   - El valor exacto de `process.env.FRONTEND_URL` en Render (sin barra final).
   Si tu URL de Vercel es distinta (por ejemplo, otro nombre de proyecto en Vercel o una URL de preview deployment `https://onelink-git-main-...vercel.app`) o si `FRONTEND_URL` en Render tiene una `/` al final (`https://tu-dominio.vercel.app/`), **el navegador recibe un bloqueo CORS** en todas las peticiones de `api-client.ts`.
3. **Lista `ALLOWED_ORIGINS` rígida en el Proxy de Next.js (`route.ts`)**:
   En `apps/web/src/app/api/[...path]/route.ts` (líneas 11–33), `ALLOWED_ORIGINS` está hardcodeado únicamente a `https://onelink-saas.vercel.app` y `https://onelink.bio`, sin incluir `process.env.FRONTEND_URL` ni `process.env.NEXT_PUBLIC_APP_URL`.

---

## 5. ¿Por qué falla Stripe en Producción (`Render`)?

En desarrollo local (`NODE_ENV !== 'production'`), si pulsas **Upgrade** en `/studio/billing`, el método `BillingService.createCheckoutSession` (`apps/api/src/modules/billing/billing.service.ts`, líneas 347–384) detecta si falta `STRIPE_SECRET_KEY` o si el `STRIPE_PRICE_ID_*` no existe y activa un **Modo Simulación Automático** que actualiza tu plan en la base de datos y te redirige a `/studio/billing?success=true&simulated=true`.

Sin embargo, en producción (**Render define `NODE_ENV=production`**), el parche `SEC-04` (líneas 356–358 y 376–380 de `billing.service.ts`) ejecuta:

```ts
if (!this.stripe || !priceId) {
  if (process.env.NODE_ENV === 'production') {
    throw new BadRequestException('Payment gateway is not configured');
  }
  // ... simulación solo permitida fuera de producción
}
```

Además, si `STRIPE_SECRET_KEY` sí está definida pero los `STRIPE_PRICE_ID_*` no son IDs reales de tu cuenta de Stripe (por ejemplo, si caen en los valores por defecto `'price_creator_pro_monthly'`, etc., de las líneas 145–158), la llamada real `this.stripe.checkout.sessions.create(...)` falla en Stripe porque ese `price_id` no existe en tu dashboard de Stripe y en producción lanza:
```json
{
  "message": "Stripe checkout session creation failed",
  "error": "Bad Request",
  "statusCode": 400
}
```

### Variables que Render necesita obligatoriamente para Stripe (y que faltan en `DEPLOYMENT.md`):
- `STRIPE_SECRET_KEY` (`sk_test_...` o `sk_live_...`)
- `STRIPE_WEBHOOK_SECRET` (`whsec_...` apuntando a `https://<tu-api>.onrender.com/api/billing/webhook`)
- `STRIPE_PRICE_ID_CREATOR_PRO_MONTHLY` (`price_...` real creado en tu cuenta de Stripe)
- `STRIPE_PRICE_ID_CREATOR_PRO_YEARLY` (`price_...` real creado en tu cuenta de Stripe)
- `STRIPE_PRICE_ID_ENTERPRISE_MONTHLY` (`price_...` real creado en tu cuenta de Stripe)
- `STRIPE_PRICE_ID_ENTERPRISE_YEARLY` (`price_...` real creado en tu cuenta de Stripe)

---

## 6. Guía de Corrección Recomendada (Cuando decidas modificar código)

1. **Usar `GET /api/profiles/me` y fijar `setProfileId` inmediatamente tras `fetchCurrentUser()`**:
   - En `apps/web/src/app/studio/appearance/page.tsx`, `apps/web/src/app/studio/links/page.tsx` y `apps/web/src/app/studio/settings/page.tsx`:
     Llamar a `setProfileId(userSession.profile.id)` en cuanto `fetchCurrentUser()` responda, y añadir un guard en `handleSave` para que si `profileId` aún está vacío recupere el ID desde `/api/profiles/me` antes de hacer `PUT`/`PATCH`/`POST`.
2. **Enviar `headers: getAuthHeaders()` en `fetchProfileLinks`**:
   - En `apps/web/src/lib/api-client.ts` (línea 131), agregar `headers: getAuthHeaders()` a `fetchProfileLinks(profileId)`.
3. **Desacoplar `apiUpdateProfile` de `apiSaveCustomTheme` y permitir a cuentas `OWNER` / presets guardar sin error `403`**:
   - En `apps/web/src/app/studio/appearance/page.tsx` (líneas 531–548): guardar siempre primero los datos del perfil (`apiUpdateProfile`) y no abortar el guardado del perfil si `apiSaveCustomTheme` devuelve `403` en cuentas `FREE`.
   - En `apps/api/src/modules/profile/profile.service.ts` (línea 355) y `apps/api/src/modules/link/link.service.ts` (línea 36): permitir bypass cuando `userRole === 'OWNER'` (o asignar el plan `ENTERPRISE` cuando `isFounder === true` en `validateGoogleUser`).
4. **Unificar todas las peticiones del navegador a través del Proxy `/api/[...path]` y sanitizar URLs**:
   - En `apps/web/src/lib/api-config.ts`: devolver `""` cuando `typeof window !== "undefined"` (para que el navegador use siempre el mismo origen de Vercel `/api/...` evitando cualquier error de CORS con Render) y sanitizar `.replace(/\/+$/, "").replace(/\/api$/, "")` en el servidor.
   - En `apps/web/src/app/api/[...path]/route.ts` y `apps/api/src/main.ts`: permitir automáticamente el propio host de Vercel (`VERCEL_URL` / `FRONTEND_URL` sanitizado).
5. **Configurar o habilitar fallback controlado de Stripe**:
   - Configurar los 4 `STRIPE_PRICE_ID_*` reales en Render o añadir una variable `ALLOW_STRIPE_SIMULATION=true` si deseas probar el flujo de upgrade en producción sin cargos reales de Stripe.
