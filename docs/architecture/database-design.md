# 🗄️ Database Design & Data Architecture: De la Teoría a la Producción

> **Metodología de Modelado**: Arquitectura ANSI/SPARC de 3 Niveles (Conceptual Chen ➔ Lógico Relacional 3FN ➔ Físico Hypertables)  
> **Motores de Datos**: PostgreSQL 16 + Extensión TimescaleDB 2.17+ + Redis 7 Stack  
> **ORM & Query Engine**: Prisma 6.4 (Tipado en `@repo/prisma`)  
> **Estado**: Aprobado, Sincronizado & Sembrado en Docker (`linktree_dev`)  

---

## 🏛️ Introducción Metodológica: Los 3 Niveles del Diseño de Datos

En la ingeniería de software y arquitectura de datos de clase mundial (siguiendo el estándar ANSI/SPARC), saltar directamente a escribir sentencias SQL o esquemas de ORM sin modelado previo es un antipatrón que genera incoherencias conceptuales y deuda técnica. 

Por eso, el diseño de datos de **OneLink** sigue rigurosamente los 3 niveles formales de abstracción con sus respectivos diagramas y especificaciones:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. MODELO CONCEPTUAL (Notación Peter Chen, 1976)                                       │
│    • 100% Agnóstico a la tecnología (SQL, NoSQL, ORM).                                │
│    • Define ENTIDADES semánticas del negocio, RELACIONES, ATRIBUTOS y CARDINALIDADES.  │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │  (Traducción y Normalización 3FN)
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. MODELO LÓGICO RELACIONAL (Edgar F. Codd, 1970)                                      │
│    • Aplica 1FN, 2FN, 3FN (Tercera Forma Normal) para evitar anomalías.                │
│    • Resuelve relaciones N:M, define Claves Primarias (PK) y Foráneas (FK).           │
│    • Diagrama de Clases / Estructura Lógica de Tablas e Integridad Referencial.        │
│    • Documenta desnormalizaciones tácticas de alto rendimiento (click_count).         │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │  (Optimización de Motor, Índices y Partición)
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. MODELO FÍSICO & RELACIONAL (PostgreSQL 16 + TimescaleDB + Prisma DDL)               │
│    • Diagrama Crow's Foot con tipos nativos (UUID, VARCHAR, TIMESTAMPTZ, INET, JSONB). │
│    • Particionamiento por tiempo (Hypertables 1 día) y compresión columnar.            │
│    • Índices B-Tree, índices parciales condicionales y políticas de integridad.        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Nivel 1: Modelo Conceptual (Notación Semántica de Peter Chen)

El modelo conceptual captura las entidades del mundo real y sus interacciones de negocio sin preocuparse por tablas, tipos de datos ni motores de almacenamiento.

### 1.1 Diagrama Entidad-Relación Conceptual Completo (Estilo Chen)

En la notación clásica de Peter Chen:
* **Rectángulos**: Entidades del Dominio (Sustantivos del Negocio).
* **Rombos**: Relaciones Semánticas (Verbos y Acciones).
* **Óvalos / Elipses**: Atributos Principales (con Claves Primarias Candidatas subrayadas `<u>id</u>`).
* **Líneas con Etiquetas**: Cardinalidades Mínimas y Máximas `(min, max)` como `(1,1)`, `(0,1)`, `(1,N)`, `(0,N)`.

```mermaid
flowchart TD
    classDef entity fill:#121215,stroke:#ffffff,stroke-width:2px,color:#fafafa;
    classDef relation fill:#27272a,stroke:#c8c5ca,stroke-width:1.5px,color:#fafafa;
    classDef attribute fill:#18181b,stroke:#52525b,stroke-width:1px,color:#a1a1aa;

    %% ================= ENTIDADES PRINCIPALES =================
    E_USER["USUARIO"]:::entity
    E_PROFILE["PERFIL"]:::entity
    E_LINK["ENLACE"]:::entity
    E_THEME["TEMA"]:::entity
    E_PLAN["PLAN_SUSCRIPCIÓN"]:::entity
    E_SUB["SUSCRIPCIÓN"]:::entity
    E_FLAG["ALERTA_SEGURIDAD<br/>(OneLink Sentinel)"]:::entity
    E_BLOCK["BLOQUEO_DOMINIO"]:::entity
    E_AUDIT["LOG_AUDITORÍA"]:::entity
    E_CLICK["EVENTO_CLIC"]:::entity
    E_VIEW["EVENTO_VISTA"]:::entity

    %% ================= RELACIONES (ROMBOS) =================
    R_HAS{"posee"}:::relation
    R_CONTAINS{"contiene"}:::relation
    R_APPLIES{"aplica"}:::relation
    R_SUBSCRIBES{"contrata"}:::relation
    R_DEFINES{"define"}:::relation
    R_TRIGGERS{"gatilla"}:::relation
    R_REVIEWS{"revisa"}:::relation
    R_EXECUTES{"ejecuta"}:::relation
    R_BLOCKS{"registra"}:::relation
    R_GEN_C{"genera"}:::relation
    R_GEN_V{"recibe"}:::relation

    %% ================= ATRIBUTOS CLAVE (ÓVALOS) =================
    A_U1(["<u>id</u>"]):::attribute --- E_USER
    A_U2(["email"]):::attribute --- E_USER
    A_U3(["rol"]):::attribute --- E_USER

    A_P1(["<u>id</u>"]):::attribute --- E_PROFILE
    A_P2(["username"]):::attribute --- E_PROFILE
    A_P3(["is_published"]):::attribute --- E_PROFILE

    A_L1(["<u>id</u>"]):::attribute --- E_LINK
    A_L2(["url"]):::attribute --- E_LINK
    A_L3(["posición"]):::attribute --- E_LINK

    A_PL1(["<u>code</u>"]):::attribute --- E_PLAN
    A_PL2(["price_cents"]):::attribute --- E_PLAN

    A_S1(["<u>id</u>"]):::attribute --- E_SUB
    A_S2(["status"]):::attribute --- E_SUB

    A_F1(["risk_score"]):::attribute --- E_FLAG
    A_F2(["threat_type"]):::attribute --- E_FLAG

    A_C1(["<u>clicked_at</u>"]):::attribute --- E_CLICK
    A_C2(["ip_address"]):::attribute --- E_CLICK

    %% ================= CONEXIONES CON CARDINALIDADES (CHEN) =================
    E_USER ---|1,1| R_HAS ---|0,1| E_PROFILE
    E_PROFILE ---|1,1| R_CONTAINS ---|0,N| E_LINK
    E_PROFILE ---|0,N| R_APPLIES ---|1,1| E_THEME
    E_USER ---|1,1| R_SUBSCRIBES ---|0,N| E_SUB
    E_PLAN ---|1,1| R_DEFINES ---|0,N| E_SUB
    E_USER ---|1,1| R_TRIGGERS ---|0,N| E_FLAG
    E_USER ---|1,1| R_REVIEWS ---|0,N| E_FLAG
    E_USER ---|1,1| R_EXECUTES ---|0,N| E_AUDIT
    E_USER ---|1,1| R_BLOCKS ---|0,N| E_BLOCK
    E_LINK ---|1,1| R_GEN_C ---|0,N| E_CLICK
    E_PROFILE ---|1,1| R_GEN_V ---|0,N| E_VIEW
```

### 1.2 Diccionario Semántico y Reglas de Negocio
1. **Regla de Identidad y Perfil (1:1)**: Un `USUARIO` creador posee exactamente cero o un `PERFIL` público (`/@username`). No se permite la tenencia de múltiples perfiles con la misma cuenta en el tier gratuito para evitar squatting de vanity URLs.
2. **Regla de Monopolio de Tema (N:1)**: Un `PERFIL` aplica exactamente un `TEMA` predeterminado del sistema o un tema personalizado. Múltiples perfiles pueden compartir el mismo preset (`Obsidian Kinetic`, `Carbon Architecture`, etc.).
3. **Regla de Contratación y Facturación (1:N)**: Un `USUARIO` puede generar múltiples `SUSCRIPCIÓN` a lo largo de su ciclo de vida (Free ➔ Pro ➔ Cancelado ➔ Pro), pero solo una está activa en un instante dado. Un `PLAN_SUSCRIPCIÓN` define los límites y precio de miles de suscripciones.
4. **Regla de Seguridad Activa OneLink Sentinel (1:N)**: Cuando un `USUARIO` intenta guardar un enlace cuya heurística o tensor ONNX detecta peligro (`risk_score >= 0.75`), se gatilla una `ALERTA_SEGURIDAD` inmutable.
5. **Regla de Moderación y Auditoría (1:N)**: Un `USUARIO` con rol `SUPER_ADMIN` revisa las alertas de seguridad y ejecuta acciones registradas en `LOG_AUDITORÍA`.
6. **Regla de Telemetría Masiva (1:N)**: Un `ENLACE` genera potencialmente millones de `EVENTO_CLIC`. Los clics se registran de forma asíncrona sin bloquear la redirección del visitante.

---

## 2. Nivel 2: Modelo Lógico Relacional (Diagrama de Estructuras & 3FN)

El modelo lógico traduce las entidades conceptuales a **relaciones formales (esquema de tablas)**, definiendo las Claves Primarias (`PK`), Claves Foráneas (`FK`), y demostrando el cumplimiento riguroso de la **Tercera Forma Normal (3FN)** de Edgar Codd.

### 2.1 Diagrama Lógico Relacional de Estructura de Tablas

```mermaid
classDiagram
    direction LR

    class USUARIOS {
        UUID id [PK]
        VARCHAR(255) email [UK]
        VARCHAR(255) password_hash
        VARCHAR(100) name
        VARCHAR(255) google_id [UK]
        ENUM role
        BOOLEAN is_banned
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    class PERFILES {
        UUID id [PK]
        UUID user_id [FK, UK]
        VARCHAR(30) username [UK]
        VARCHAR(100) title
        VARCHAR(500) bio
        TEXT avatar_url
        UUID theme_id [FK]
        BOOLEAN is_published
        VARCHAR(60) seo_title
        VARCHAR(160) seo_description
    }

    class ENLACES {
        UUID id [PK]
        UUID profile_id [FK]
        VARCHAR(200) title
        TEXT url
        ENUM type
        INTEGER position
        TEXT thumbnail_url
        BOOLEAN is_active
        BIGINT click_count [Desnorm. Táctica]
    }

    class ENLACES_SOCIALES {
        UUID id [PK]
        UUID profile_id [FK]
        ENUM platform
        TEXT url
        INTEGER position
        BOOLEAN is_active
    }

    class TEMAS {
        UUID id [PK]
        VARCHAR(50) name
        ENUM bg_type
        TEXT bg_value
        ENUM btn_style
        VARCHAR(50) btn_color
        VARCHAR(50) btn_text_color
        VARCHAR(50) font_family
        VARCHAR(50) text_color
        BOOLEAN is_default
    }

    class TEMAS_PERSONALIZADOS {
        UUID id [PK]
        UUID profile_id [FK, UK]
        ENUM bg_type
        TEXT bg_value
        ENUM btn_style
        VARCHAR(50) btn_color
        VARCHAR(50) btn_text_color
        VARCHAR(50) font_family
        VARCHAR(50) text_color
        INTEGER btn_radius
    }

    class PLANES {
        UUID id [PK]
        VARCHAR(50) code [UK]
        VARCHAR(100) name
        INTEGER price_cents
        ENUM interval
        JSONB features
        VARCHAR(100) stripe_price_id [UK]
        BOOLEAN is_active
    }

    class SUSCRIPCIONES {
        UUID id [PK]
        UUID user_id [FK]
        UUID plan_id [FK]
        VARCHAR(100) stripe_customer_id
        VARCHAR(100) stripe_subscription_id [UK]
        ENUM status
        TIMESTAMPTZ current_period_end
    }

    class ALERTAS_SEGURIDAD {
        UUID id [PK]
        UUID user_id [FK]
        TEXT submitted_url
        DECIMAL(5,4) risk_score
        ENUM threat_type
        DECIMAL(5,4) ai_confidence
        INET ip_address
        ENUM status
        UUID reviewed_by [FK]
        TEXT resolution_notes
    }

    class BLOQUEO_DOMINIOS {
        UUID id [PK]
        VARCHAR(255) domain_pattern [UK]
        VARCHAR(500) reason
        UUID added_by [FK]
        TIMESTAMPTZ created_at
    }

    class AUDITORIA_ADMIN {
        UUID id [PK]
        UUID admin_user_id [FK]
        VARCHAR(100) action
        VARCHAR(50) target_type
        UUID target_id
        TEXT reason
        JSONB metadata
        TIMESTAMPTZ created_at
    }

    class EVENTOS_CLIC {
        BIGINT id [PK]
        UUID link_id [FK]
        UUID profile_id [FK]
        TIMESTAMPTZ clicked_at [PK]
        INET ip_address
        TEXT user_agent
        TEXT referrer
        CHAR(2) country
        BOOLEAN is_bot
    }

    class EVENTOS_VISTA {
        BIGINT id [PK]
        UUID profile_id [FK]
        TIMESTAMPTZ viewed_at [PK]
        INET ip_address
        TEXT user_agent
        TEXT referrer
        CHAR(2) country
        BOOLEAN is_unique
        BOOLEAN is_bot
    }

    %% Relaciones Lógicas con Integridad Referencial
    USUARIOS "1" --> "0..1" PERFILES : FK user_id
    PERFILES "1" --> "0..*" ENLACES : FK profile_id
    PERFILES "1" --> "0..*" ENLACES_SOCIALES : FK profile_id
    TEMAS "1" <-- "0..*" PERFILES : FK theme_id
    PERFILES "1" --> "0..1" TEMAS_PERSONALIZADOS : FK profile_id
    USUARIOS "1" --> "0..*" SUSCRIPCIONES : FK user_id
    PLANES "1" --> "0..*" SUSCRIPCIONES : FK plan_id
    USUARIOS "1" --> "0..*" ALERTAS_SEGURIDAD : FK user_id
    USUARIOS "0..1" <-- "0..*" ALERTAS_SEGURIDAD : FK reviewed_by
    USUARIOS "0..1" <-- "0..*" BLOQUEO_DOMINIOS : FK added_by
    USUARIOS "1" --> "0..*" AUDITORIA_ADMIN : FK admin_user_id
    ENLACES "1" --> "0..*" EVENTOS_CLIC : FK link_id
    PERFILES "1" --> "0..*" EVENTOS_VISTA : FK profile_id
```

### 2.2 Proceso Formal de Normalización (1FN, 2FN, 3FN)

A continuación se demuestra matemáticamente cómo el esquema lógico de OneLink alcanza la **Tercera Forma Normal (3FN)** sin anomalías:

#### 1. Primera Forma Normal (1FN) — Atomicidad de Dominios
* **Definición**: Todos los atributos contienen únicamente valores atómicos indivisibles; no existen grupos repetitivos ni arrays no escalables.
* **Violación Típica**: Guardar una lista de redes sociales o múltiples URLs dentro de una sola celda como `social_links: "ig:alex,tk:alex,yt:alex"`.
* **Solución OneLink**: Se desacopló la entidad `social_links`, donde cada fila almacena una única tupla atómica: `(id, profile_id, platform, url, position, is_active)`. De igual forma, los enlaces son entidades independientes asociadas por Clave Foránea (`profile_id`).

#### 2. Segunda Forma Normal (2FN) — Dependencia Funcional Completa
* **Definición**: La relación está en 1FN y cada atributo no clave depende funcionalmente de la **totalidad** de la Clave Primaria, no de una parte de una clave compuesta.
* **Demostración de Dependencias Funcionales (DF)**:
  * En `USUARIOS`: `id ➔ {email, password_hash, name, google_id, role, is_banned}`
  * En `PERFILES`: `id ➔ {user_id, username, title, bio, theme_id, is_published}`
  * En `ENLACES`: `id ➔ {profile_id, title, url, type, position, is_active}`
* Como todas las tablas transaccionales utilizan Claves Primarias Simples (`UUID id`), **no existen claves compuestas parciales en las tablas del núcleo transaccional**, cumpliendo la 2FN por definición estructural.
* En las tablas de eventos (`click_events`), la clave compuesta es `(id, clicked_at)` por requerimiento del particionamiento por rangos temporales de TimescaleDB.

#### 3. Tercera Forma Normal (3FN) — No Dependencia Transitiva
* **Definición**: La relación está en 2FN y no existen atributos no clave que dependan funcionalmente de otros atributos no clave (es decir, si `A ➔ B` y `B ➔ C`, entonces `C` debe residir en su propia relación).
* **Violación Típica**: Almacenar en la tabla `subscriptions` el nombre del plan y su precio: `(id, user_id, plan_name, price_cents)`. Si el precio del plan cambia, se tendrían que actualizar miles de registros de suscripción (anomalía de modificación).
* **Solución OneLink**: Se crea la relación `PLANES` (`code ➔ {name, price_cents, interval}`). La relación `SUSCRIPCIONES` contiene únicamente la clave foránea `plan_id`. Si el precio de un plan cambia en Stripe, solo se actualiza una única tupla en `PLANES`.

### 2.3 Desnormalizaciones Tácticas de Alto Rendimiento Justificadas

En sistemas distribuidos de alto tráfico, la adhesión dogmática a la 3FN puede degradar severamente la latencia en operaciones de lectura intensa (*Read-Heavy Workloads*). OneLink aplica dos desnormalizaciones conscientes:

| Campo Desnormalizado | Tabla | Forma Normal Estricta | Justificación de Ingeniería (High-Throughput) | Mecanismo de Consistencia |
|---|---|---|---|---|
| **`click_count`** (`BIGINT`) | `links` | Violación 3FN (es un valor derivado de `click_events`) | Si un perfil recibe 50,000 clics diarios, calcular `COUNT(*)` en el dashboard del creador generaría lecturas secuenciales masivas en disco. | BullMQ acumula contadores en memoria en Redis y ejecuta un `UPDATE links SET click_count = click_count + batch` cada 10s. |
| **`features`** (`JSONB`) | `plans` | Violación 1FN (objeto estructurado no relacional) | Permite añadir nuevas banderas de suscripción (`custom_domains`, `sentinel_ai_pro`, `max_links`) sin requerir migraciones DDL de esquema bloqueantes en PostgreSQL en caliente. | Validación rígida en tiempo de ejecución garantizada por Zod en `@repo/shared`. |
| **`metadata`** (`JSONB`) | `admin_audit_logs` | Violación 1FN | Almacena el snapshot diferencial (diff before/after) de cualquier entidad modificada por el Super Admin sin requerir una tabla por cada tipo de entidad del sistema. | Ledger de auditoría inmutable (solo `INSERT`, nunca `UPDATE` ni `DELETE`). |

---

## 3. Nivel 3: Modelo Físico & Relacional (Crow's Foot ERD + PostgreSQL + TimescaleDB)

El modelo físico implementa las estructuras relacionales optimizadas para los motores de almacenamiento **PostgreSQL 16** (transaccional ACID) y **TimescaleDB** (series temporales distribuidas):

### 3.1 Diagrama Crow's Foot Físico de Base de Datos

```mermaid
erDiagram
    users ||--o| profiles : "1:1 user_id"
    users ||--o{ subscriptions : "1:N user_id"
    users ||--o{ security_flags : "1:N user_id"
    users ||--o{ admin_audit_logs : "1:N admin_user_id"
    plans ||--o{ subscriptions : "1:N plan_id"
    profiles ||--o{ links : "1:N profile_id"
    profiles ||--o{ social_links : "1:N profile_id"
    profiles }o--o| themes : "N:1 theme_id"
    profiles ||--o| custom_themes : "1:1 profile_id"
    profiles ||--o{ page_views : "1:N profile_id"
    links ||--o{ click_events : "1:N link_id"

    users {
        uuid id PK "gen_random_uuid()"
        varchar email UK "Indexed lower(email)"
        varchar password_hash "Nullable for OAuth"
        varchar name "Display name"
        varchar google_id UK "Nullable OpenID"
        enum role "CREATOR, SUPER_ADMIN, OWNER"
        boolean is_banned "Default false"
        timestamptz created_at "Default now()"
        timestamptz updated_at
        timestamptz deleted_at "Soft delete"
    }

    plans {
        uuid id PK
        varchar code UK "FREE, PRO, ENTERPRISE"
        varchar name "Plan name"
        integer price_cents "Price in USD cents"
        enum interval "MONTHLY, YEARLY"
        jsonb features "Tier limit flags"
        varchar stripe_price_id UK
        boolean is_active "Default true"
        timestamptz created_at
    }

    subscriptions {
        uuid id PK
        uuid user_id FK "References users(id)"
        uuid plan_id FK "References plans(id)"
        varchar stripe_customer_id
        varchar stripe_subscription_id UK
        enum status "ACTIVE, PAST_DUE, CANCELED, TRIALING"
        timestamptz current_period_end
        timestamptz created_at
        timestamptz updated_at
    }

    security_flags {
        uuid id PK
        uuid user_id FK "References users(id)"
        text submitted_url "Target URL"
        decimal risk_score "Sentinel score (5,4)"
        enum threat_type "PHISHING, MALWARE, CRYPTO_DRAINER, SPAM"
        decimal ai_confidence "(5,4)"
        inet ip_address "Origin IP"
        enum status "BLOCKED_AUTO, PENDING_REVIEW, RESOLVED_BENIGN, BANNED"
        uuid reviewed_by FK "References users(id)"
        text resolution_notes
        timestamptz created_at
    }

    domain_blocklist {
        uuid id PK
        varchar domain_pattern UK "*.drainer.xyz"
        varchar reason "Campaign details"
        uuid added_by FK "References users(id)"
        timestamptz created_at
    }

    admin_audit_logs {
        uuid id PK
        uuid admin_user_id FK "References users(id)"
        varchar action "BAN_USER, BLOCK_DOMAIN, etc."
        varchar target_type "USER, LINK, PROFILE, PLAN"
        uuid target_id
        text reason "Audit justification"
        jsonb metadata "Diff before/after"
        timestamptz created_at
    }

    profiles {
        uuid id PK
        uuid user_id FK,UK "References users(id)"
        varchar username UK "Indexed vanity slug (3-30 chars)"
        varchar title "Display title"
        varchar bio "Bio description (max 500)"
        text avatar_url "CDN processed URL"
        uuid theme_id FK "References themes(id)"
        boolean is_published "Default false"
        varchar seo_title "Meta title (max 60)"
        varchar seo_description "Meta desc (max 160)"
        text og_image_url "Dynamic OG URL"
        timestamptz created_at
        timestamptz updated_at
    }

    links {
        uuid id PK
        uuid profile_id FK "References profiles(id)"
        varchar title "Link label (max 200)"
        text url "Target destination URL"
        enum type "LINK, HEADER, DIVIDER"
        integer position "Order index (0,1,2...)"
        text thumbnail_url "Icon or image"
        boolean is_active "Default true"
        bigint click_count "High-read atomic counter"
        timestamptz created_at
        timestamptz updated_at
    }

    themes {
        uuid id PK
        varchar name "Theme name"
        enum bg_type "SOLID, GRADIENT, IMAGE"
        text bg_value "CSS string or image URL"
        enum btn_style "FILLED, OUTLINE, SHADOW, ROUNDED"
        varchar btn_color "Hex or rgba"
        varchar btn_text_color "Hex or rgba"
        varchar font_family "Inter, Geist, etc."
        varchar text_color "Hex color code"
        boolean is_default "Default theme flag"
        text preview_url
        timestamptz created_at
    }

    custom_themes {
        uuid id PK
        uuid profile_id FK,UK "References profiles(id)"
        enum bg_type "SOLID, GRADIENT, IMAGE"
        text bg_value
        enum btn_style "FILLED, OUTLINE, SHADOW, ROUNDED"
        varchar btn_color
        varchar btn_text_color
        varchar font_family
        varchar text_color
        integer btn_radius "Border radius in px"
        timestamptz created_at
        timestamptz updated_at
    }

    social_links {
        uuid id PK
        uuid profile_id FK "References profiles(id)"
        enum platform "INSTAGRAM, TIKTOK, YOUTUBE, etc."
        text url "Social profile URL"
        integer position "Display order"
        boolean is_active "Toggle visibility"
        timestamptz created_at
    }

    page_views {
        bigint id PK
        uuid profile_id FK
        timestamptz viewed_at "Partition key (Hypertable)"
        inet ip_address "Truncated anonymized IP"
        text user_agent
        text referrer
        char country "2-letter ISO"
        boolean is_unique "Daily unique flag"
        boolean is_bot "Crawler flag"
    }

    click_events {
        bigint id PK
        uuid link_id FK
        uuid profile_id FK
        timestamptz clicked_at "Partition key (Hypertable)"
        inet ip_address "Truncated anonymized IP"
        text user_agent
        text referrer
        char country "2-letter ISO"
        boolean is_bot "Crawler flag"
    }
```

---

## 4. Particionamiento TimescaleDB (Hypertables) & Compresión Columnar

Para garantizar que millones de eventos de telemetría no saturen el almacenamiento ni degraden los tiempos de consulta del creador:

```sql
-- 1. Conversión a Hypertables particionadas por día
SELECT create_hypertable('click_events', 'clicked_at', chunk_time_interval => INTERVAL '1 day');
SELECT create_hypertable('page_views', 'viewed_at', chunk_time_interval => INTERVAL '1 day');

-- 2. Compresión Columnar automática para fragmentos mayores a 7 días
ALTER TABLE click_events SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'profile_id, link_id',
  timescaledb.compress_orderby = 'clicked_at DESC'
);
SELECT add_compression_policy('click_events', INTERVAL '7 days');

-- 3. Vista Materializada Continua para métricas por hora
CREATE MATERIALIZED VIEW hourly_link_clicks
WITH (timescaledb.continuous) AS
SELECT
    link_id,
    profile_id,
    time_bucket('1 hour', clicked_at) AS hour,
    COUNT(*) as total_clicks,
    COUNT(DISTINCT ip_address) as unique_clicks
FROM click_events
WHERE is_bot = false
GROUP BY link_id, profile_id, time_bucket('1 hour', clicked_at);
```

---

## 5. Plan Estratégico de Indexación

| Tabla | Definición del Índice | Patrón de Acceso Justificado |
|---|---|---|
| `profiles` | `CREATE UNIQUE INDEX idx_profiles_username ON profiles(LOWER(username))` | **Hot Path**: Resolución instantánea (<1ms) de slugs de creador en `/@username` |
| `links` | `CREATE INDEX idx_links_profile_position ON links(profile_id, position) WHERE is_active = true` | Índice parcial: Carga ultra-rápida de enlaces activos ordenados por posición |
| `security_flags` | `CREATE INDEX idx_security_flags_risk ON security_flags(risk_score DESC, created_at DESC)` | Alimenta la cola de moderación del Super Admin priorizando amenazas críticas |
| `domain_blocklist` | `CREATE UNIQUE INDEX idx_blocklist_pattern ON domain_blocklist(domain_pattern)` | Búsqueda y sincronización instantánea con los sets de Redis |
| `click_events` | `CREATE INDEX idx_clicks_link_time ON click_events(link_id, clicked_at DESC)` | Rango de fechas para las gráficas analíticas del estudio |
