# Shelfside

**Aplicación minimalista para seguimiento de consumos culturales con soberanía de datos y portabilidad.**

Documento vivo de especificación para **Shelfside**: implementación pequeña, local y de un solo uso, inspirada en lo que funciona bien en **Yamtrack** y en preferencias de conversación: **metadatos buscables**, **librería propia**, **estados y progreso claros**, sin multi‑cuenta.

---

## 1. Visión y principios

| Principio | Descripción |
|-----------|-------------|
| **Dueño de los datos** | Persistencia en **SQLite** (u otro archivo local) con copias de seguridad simples (copiar el archivo o export JSON/CSV). |
| **Un solo "usuario"** | Sin cuentas, OAuth ni multi‑tenant; opcionalmente un PIN o cifrado del disco a nivel sistema operativo. |
| **Metadatos externos, control local** | Cada obra en tu biblioteca referencia una **fuente** (`source`) y un **id externo** (`media_id`), como en Yamtrack (`Item`: `media_id` + `source` + `media_type`). |
| **Prioridad de medios** | **Alta:** películas, series (TV), anime, juegos, libros. **Baja:** manga, cómics, juegos de mesa, etc. |
| **Complejidad acotada** | Sin Celery/Redis obligatorios en la v1; refrescos de metadatos y calendario **bajo demanda** o cron opcional más adelante. |
| **Privacidad** | **Cero telemetría** (sin analytics ni reportes de uso). Actualizaciones del cliente **sin seguimiento**: p. ej. releases en el repo o instalación manual; sin canales que identifiquen al usuario. |
| **Portable** | Datos en **SQLite + caché local** (p. ej. posters en `app_data_dir()`); respaldo = copiar carpeta o el archivo de base. **Import/export** puede ser v1 sencillo o v1.1; copiar/pegar el `.sqlite` es válido como mecanismo "manual". |
| **Plataformas (empaquetado)** | **Linux** (desarrollo y uso diario), **Android** (Tauri, APK sideload, sin Play Store) en Release 4; **Windows** en backlog (Release 7+); **macOS** solo si surge necesidad. Mismo shell **Tauri** en todas las superficies. |

Referencia en este repo: modelo `Item` y enumeraciones `Sources`, `MediaTypes`, `Status` en `src/app/models.py`.

---

## 2. Qué tomar de Yamtrack (patrones útiles)

### 2.1 Identidad de una obra en catálogo

Yamtrack separa:

- **Ítem canónico** (`Item`): título, imagen, `media_id`, `source`, `media_type`, y para TV también `season_number` / `episode_number` cuando el ítem representa temporada o episodio.
- **Registro de usuario** (por tipo: `Movie`, `TV`, `Anime`, …): estado, puntuación, progreso, fechas, etc.

Para tu app **mini**, puedes **aplanar** a dos niveles:

1. **`catalog_entry`** — lo que viene de la API (cache mínima: título, poster, ids).
2. **`library_row`** — tu fila: FK al catálogo + estado + progreso + notas.

O mantener la idea **Item + tracking** como Yamtrack si prefieres extensibilidad.

### 2.2 Unicidad (evitar duplicados)

Restricciones similares a las de `Item.Meta.constraints` en Yamtrack:

- Obra "padre" (película, serie TV, anime, juego, libro): única por `(source, media_id, media_type)` sin número de temporada/episodio.
- **Temporada**: única por `(source, media_id, media_type=season, season_number)`.
- **Episodio** (si lo modelas como fila): única por `(source, media_id, season_number, episode_number)`.

### 2.3 Estados

Alineado con `Status` en Yamtrack (`src/app/models.py`):

| Valor interno sugerido | Etiqueta UI |
|------------------------|-------------|
| `completed` | Completado |
| `in_progress` | En progreso |
| `planning` | Planeado |
| `paused` | Pausado |
| `dropped` | Abandonado |

Puedes omitir **Repeating** (re‑visionado) en la v1 o añadirlo después.

### 2.4 Series y anime: progreso en v1 (decidido)

En Yamtrack, el seguimiento fino de TV se apoya en **TMDB** para metadatos de temporadas/episodios y a menudo **TVMaze** para fechas/horas de emisión (`src/events/calendar/tv.py`).

En **esta app**, para **serie TV y anime** el MVP usa **una sola fila de biblioteca por título** (no grilla episodio a episodio en v1):

- **`current_season`** — temporada en la que vas.  
- **`last_episode_watched`** — último episodio visto dentro de esa temporada.  

Los **totales** y nombres de episodios salen del **catálogo** al refrescar metadatos (TMDB / AniList); el usuario no marca cada episodio como fila independiente en v1. Más adelante se puede evolucionar a seguimiento por episodio si hace falta.

---

## 3. Integraciones de metadatos por tipo de medio

Tabla orientativa para **búsqueda + detalle** al añadir a la librería. Claves API: variables de entorno locales, nunca en el repo.

| Prioridad | Tipo | Fuente principal | Fuente secundaria / notas |
|-----------|------|------------------|---------------------------|
| Alta | **Película** | **TMDB** | — |
| Alta | **Serie (TV)** | **TMDB** (show + temporadas + episodios) | **TVMaze** (opcional v2: horarios más fieles si tienes `tvdb_id`) |
| Alta | **Anime** | **AniList GraphQL** (fuente canónica v1) | MAL como crossref opcional en v2 |
| Alta | **Juego** | **IGDB** | **Steam Web API** (opcional: sync de tiempo jugado / librería) |
| Alta | **Libro** | **Open Library** | **Google Books** (opcional: búsqueda/portada cuando OL se queda corto) |
| Alta | **Manual** | Entrada local (`source = manual`) | Título, notas, imagen local opcional; sin API |
| Baja | Manga / cómic / tablero | MAL / ComicVine / BGG | Solo si amplías alcance |

**Alcance v1:** solo los tipos **Alta** de esta tabla (más **manual**). Otros consumos culturales (podcasts, música, teatro, etc.) quedan para **releases futuros** si algún día se amplía el alcance.

Fuentes nombradas en Yamtrack (`Sources` en `src/app/models.py`): `tmdb`, `mal`, `igdb`, `openlibrary`, `comicvine`, `bgg`, `manual`, etc.

---

## 4. Modelo de datos conceptual (MVP)

Texto orientativo; nombres de tablas/campos ajustables.

### 4.1 `catalog_item`

| Campo | Descripción |
|-------|-------------|
| `id` | UUID o entero autoincremental |
| `media_type` | `movie` \| `tv` \| `season` \| `episode` \| `anime` \| `game` \| `book` |
| `source` | `tmdb` \| `anilist` \| `igdb` \| `openlibrary` \| `manual` \| … |
| `external_id` | ID en esa API (string para flexibilidad) |
| `title`, `image_url` | Cache de presentación |
| `season_number`, `episode_number` | Nullable; solo para ítems tipo temporada/episodio |
| `parent_catalog_id` | Opcional: episodio → temporada → serie |

### 4.2 `library_entry` (tu registro)

| Campo | Descripción |
|-------|-------------|
| `id` | |
| `catalog_item_id` | FK |
| `status` | Ver tabla de estados. **Default: `planning`** al agregar un ítem. |
| `score` | Opcional; escala **1–10** (compatible con IMDB, TMDB, MAL). |
| `current_season`, `last_episode_watched` | Solo TV/anime: temporada actual y último episodio visto (ver §2.4). Totales por temporada desde metadatos del catálogo. |
| `progress_current`, `progress_total` | Libros: páginas u otro avance opcional; juegos: horas opcionales. Películas: típicamente N/A; foco en `status`. |
| `owned` | Nullable; reservado para "lo tengo" (físico/Steam/etc.) en evolución futura sin bloquear v1. |
| `started_at` | Se setea **automáticamente** al cambiar status a `in_progress`. |
| `completed_at` | Se setea **automáticamente** al cambiar status a `completed`. |
| `notes` | Texto libre |
| `updated_at` | |

**Un solo usuario:** sin columna `user_id` o siempre `1`.

### 4.3 `activity_log` (opcional v1.5)

Eventos tipo "marcó episodio 5", "cambió a completado" — similar al historial en Yamtrack; útil para estadísticas y calendario retroactivo.

---

## 5. Flujos de producto (MVP)

1. **Buscar** → llamada a API del tipo elegido → lista de resultados con poster y año.  
2. **Añadir a biblioteca** → crear `catalog_item` (si no existe) + `library_entry` con estado por defecto `planning`.  
3. **Detalle** → refrescar metadatos bajo demanda ("Actualizar desde TMDB / AniList").  
4. **Editar** → estado, progreso, nota, puntuación. Al cambiar a `in_progress` se registra `started_at`; al cambiar a `completed` se registra `completed_at`. Ambos automáticos.  
5. **Listar / filtrar** → por tipo, estado, texto.  
6. **Configuración** → tema, idioma (es/en), backup/export (CSV, MD), reinicio total (`/settings`).  
7. **Estadísticas** → conteos por estado y tipo; gráficos simples (`/stats`, ruta propia).  
8. **Etiquetas / listas personalizadas** → no prioritario en v1; se puede posponer.

---

## 6. Roadmap por fases

### Fase 0 — Proyecto

- **Tauri + Svelte 5 + TypeScript + Tailwind CSS**; desarrollo en **Linux**, UI preparada para responsive antes de Android.
- Repo, formato de config (`.env.example`), SQLite en `app_data_dir()`, caché de posters en `app_data_dir()` para uso offline de la biblioteca.
- Esquema inicial + migraciones con **scripts SQL a mano** + tabla `migrations` (sin librerías externas).
- Empaquetado: **Linux** primero; **Android** (Release 4 / `v0.4.0`); **Windows** después (backlog).

### Fase 1 — Catálogo + librería (sin auth)

- CRUD mínimo de `library_entry` con progreso TV/anime según §2.4 (`current_season`, `last_episode_watched`).
- **Películas (TMDB)** + **Libros (Open Library)** primero si quieres APIs sencillas de validar; o **TMDB películas + TMDB TV** si prefieres un solo cliente TMDB.
- Entradas **`manual`** mínimas (añadir sin API).

### Fase 2 — Configuración, exportaciones y estadísticas

- Pantalla **Configuración** (`/settings`): tema, idioma (es \| en, traducción completa), datos (backup, export CSV/MD a ruta elegida, reinicio total).
- Export **CSV** y **Markdown** (carpeta destino elegida por el usuario; compatible Obsidian/Joplin).
- Pantalla **Estadísticas** (`/stats`): conteos por estado y tipo; gráficos livianos.

### Fase 3 — Android y sincronización entre dispositivos

Cortes semver en [`roadmap.md`](./roadmap.md) Release 4: **`v0.4.0`–`v0.4.6`** (toolchain → sync → UI móvil → paridad → APK release).

- **Tauri Android** (APK sideload; sin Play Store; software libre de uso personal).
- **Paridad** con desktop en pantallas existentes; navegación móvil con **barra inferior** (Inicio · Biblioteca · Buscar · Más).
- Validación de plugins (`sql`, `fs`, `dialog`, `http`) en Android; carpeta sync por **ruta escrita** (en móvil el folder picker de Tauri no está disponible) con validación, auto-subcarpeta `shelfside/` y permiso de acceso a archivos cuando hace falta.
- **Sync por carpeta** (Syncthing / Nextcloud) sobre un **archivo CSV** (desde `v0.4.1`): merge LWW al **abrir** (toast + resumen; toggle en Ajustes) y botón manual; SQLite **solo local** (no replicar el `.db` vivo). El **Markdown** pasa a export de solo lectura (Obsidian/Joplin). Ver §8.
- **B1** UUID para manuales nuevos en **`v0.4.0`**.
- Opcional: episodio a episodio o etiquetas/listas si el uso lo pide.

### Fase 4 — Anime y juegos

- Anime: **AniList GraphQL** (fuente canónica; no requiere secret para queries públicas).
- Juegos: IGDB.

### Fase 5 — Calendario / próximos estrenos

- TV: TMDB fechas + opcional TVMaze.
- Anime: AniList `airingSchedule`.

### Fase 6 — Baja prioridad

- Build **Windows** (y **macOS** si aplica); releases ampliados sin telemetría.
- Manga, cómics, tableros, importaciones masivas (Trakt), notificaciones.
- Sync avanzado (conflictos `*.sync-conflict`, vault Obsidian bidireccional, etc.).

---

## 7. Stack técnico (**decidido** para este proyecto)

| Capa | Elección | Notas |
|------|----------|-------|
| **App shell** | **Tauri** | Linux + Android (mismo frontend); Windows en backlog. Datos locales, sin servidor propio. |
| **Frontend** | **Svelte 5 + TypeScript** | Sin virtual DOM; compila a JS vanilla; bundle mínimo; poco boilerplate. |
| **Estilos** | **Tailwind CSS** | Tema claro/oscuro; componentes propios sin librería de UI pesada. |
| **Base de datos** | **SQLite vía `tauri-plugin-sql`** | SQL directo desde TypeScript; sin commands Rust por cada query. |
| **Lógica de negocio** | **TypeScript** (frontend) | Clientes API, validaciones, manejo de estado — todo en TS. |
| **Rust** | Mínimo: solo filesystem y casos puntuales | Evitar compilar Rust para lógica de negocio ordinaria. |
| **Migraciones** | **Scripts SQL a mano** + tabla `migrations` | ~30 líneas de TS; cero dependencias externas. |

**UX:** interfaz **minimalista**; **tema claro y oscuro** (uso habitual: oscuro). **Idioma UI:** español en v1, con textos preparados para **i18n** futuro (claves, no strings hardcodeados).

Yamtrack en este repo usa **Django**; aquí el foco es binario Tauri + front liviano.

---

## 8. Decisiones cerradas (especificación completa)

Resumen único para implementar sin reabrir discusiones. Todas las preguntas están **respondidas**.

### Stack, plataformas y fases de cliente

- **Tauri** en **Linux** (desarrollo diario) y **Android** (Release 4 / `v0.4.0`); **Windows** en Release 7+ (backlog).
- **Sin Play Store** en v1: distribución Android por **APK sideload** (software libre; quien quiera lo instala).
- **Uso personal:** PC en casa, celular fuera; misma biblioteca vía **carpeta sincronizada** (ver §8 sync), no cuenta en la nube propia de Shelfside.
- **Frontend:** Svelte 5 + TypeScript + Tailwind CSS.
- **Lógica de negocio:** TypeScript; Rust solo para filesystem y operaciones que TypeScript no puede hacer directamente.
- **SQLite:** vía `tauri-plugin-sql` (sin `sqlx` ni `rusqlite`).
- **Migraciones:** scripts SQL numerados en `migrations/` + tabla `migrations` en la DB; sin librerías externas.

### Alcance de "consumo cultural" (v1)

- Solo los medios de la tabla del **§3** (película, serie TV, anime, juego, libro) más entradas **manuales**. Ampliar a otros tipos solo en **versiones futuras**.

### Series y anime: progreso

- **Una fila de biblioteca por serie/anime** con **`current_season`** + **`last_episode_watched`** (detalle en **§2.4**).

### Anime vs live-action (fuentes)

- **Anime** (`media_type` anime): fuente canónica **AniList GraphQL** en v1. No requiere client secret para queries públicas; schema más rico que MAL. MAL como crossref opcional en v2.
- **Live-action y series TV "generalistas":** **TMDB**.

### Libros, películas, juegos

- **ISBN** no obligatorio. Libros: campo de **páginas** opcional; el día a día es **estado** más que número. Películas: **estado** principal.  
- Juegos: **estado** en v1; campo nullable **`owned`** reservado para evolución sin complicar el MVP.

### Puntuación, estado, fechas

- **Puntuación:** escala **1–10**, compatible con IMDB, TMDB y MAL.
- **Estado por defecto al agregar:** `planning`.
- **`started_at` / `completed_at`:** automáticos al cambiar status a `in_progress` / `completed` respectivamente. Si el usuario revierte el status, el campo queda como estaba (no se borra automáticamente).

### Exportación, portable, offline

**Roles de artefacto (decisión `v0.4.1+`):** separar **sync/backup de datos** (máquina ↔ máquina) del **export para vault** (humano).

| Artefacto | Rol | Notas |
|-----------|-----|-------|
| **CSV** (un archivo, p. ej. `shelfside.csv` en la carpeta sync) | **Sync + backup entre dispositivos** | Merge **LWW** por fila; identidad por catálogo (`source`+`external_id`+`media_type`) y manuales por `external_id` UUID; tombstones = columnas `deleted` / `deleted_at`. **Shelfside es el único que lo escribe.** Columnas en README. |
| **Markdown** (`library/*.md`, frontmatter YAML, cuerpo = `notes`) | **Export de solo lectura** (Obsidian / Joplin) | One-way; opcional «Importar Markdown» **puntual** para migrar v0.3.x → CSV. **No** es canal de sync automático. |
| **`.sqlite`** | **Backup catastrófico local** | Copia fiel de la DB desde Configuración; no es artefacto multi-dispositivo. |

- **Historia:** en **Release 3 / 3.3 (v0.3.x)** el **Markdown** fue el canal de sync (export + import/merge LWW, tombstones B3). Desde **`v0.4.1`** ese rol pasa al **CSV**; el motor de merge (`src/lib/sync/`) se **porta** de filas Markdown a filas CSV y el Markdown queda como export. Ver `roadmap.md` (Release 4 → «Cambio de protocolo de sync/backup»).
- **CSV y backup:** el **CSV de sync** vive en la carpeta sincronizada (Shelfside lo lee/escribe en cada sync). El **backup `.sqlite`** y el **export Markdown** usan diálogo «Guardar como…» cada vez. Posters: no embebidos; opcional `image_url` como columna CSV / frontmatter.
- **Sync entre PC y celu:** carpeta replicada por **Syncthing** o **Nextcloud** que contiene el **CSV**; Shelfside no implementa red — solo lee/escribe el archivo. **No** usar `shelfside.db` como artefacto sincronizado entre dispositivos. Disciplina ante conflictos: sync en la app → esperar a que Syncthing replique → sync en el otro dispositivo (LWW por fila resuelve el resto).
- **Reiniciar datos:** borra **todo** el contenido de usuario: tablas de biblioteca/catálogo (vía SQL o borrado de `shelfside.db` + migraciones) y archivos en `posters/` bajo `app_data_dir()`. Requiere confirmación explícita en UI.
- **Portable:** datos en SQLite + caché en `app_data_dir()`; respaldo = copiar `shelfside.db` o carpeta de datos desde **Configuración**.
- **Offline:** ver y editar la biblioteca y posters en caché; **búsqueda** de obras nuevas requiere red.

### Configuración (UI)

- Pantalla **`/settings`**: tema claro/oscuro, idioma UI, bloque **Datos** (ruta/tamaño DB, carpeta de sincronización, export CSV/MD, backup `.sqlite`, reiniciar **todo** con confirmación).
- Pantalla **`/stats`**: estadísticas (ruta propia, no dentro de settings).
- **Inicio (`/`):** sin controles técnicos; resumen por estado únicamente.

### Idioma UI (i18n)

- Selector **español** e **inglés** en Release 3 (`v0.3.0`); **traducción completa** (todas las claves `t()` en `en`); sin fallback parcial en esa release.
- Persistencia de locale en `localStorage`.
- **Idioma de catálogo** (`v0.3.1`): independiente de la UI (o «igual que la app»); afecta TMDB (`language`/`region`) y Open Library (`lang` + filtro opcional `language:spa|eng`). Títulos de búsqueda de libros priorizan la edición preferida.

### Estadísticas

- Ruta **`/stats`**; agregados sobre `library_entry` + `catalog_item` (sin `activity_log`): conteos por **estado** y por **tipo de medio**; gráficos **simples** (HTML/CSS, sin librería de charts pesada).

### Catálogo manual

- **Sí:** `source = manual` para añadir consumos sin API (título, notas, imagen local opcional).

### Privacidad

- **Cero telemetría.** Actualizaciones del app **sin analytics** (artefactos en GitHub o instalación manual).

### Cómo obtener claves API

No pegues claves en el repositorio; usá variables de entorno o un archivo local ignorado por git (`.env`).

| Servicio | Dónde crear / gestionar la clave |
|----------|----------------------------------|
| **TMDB** | [Configuración de API en TheMovieDB](https://www.themoviedb.org/settings/api) |
| **IGDB** (vía Twitch) | Crear app en [Twitch Developer Console](https://dev.twitch.tv/console/apps); luego registro en [IGDB API](https://api-docs.igdb.com/#account-creation) |
| **AniList** | [AniList → Settings → Developer](https://anilist.co/settings/developer) *(queries públicas no requieren secret en v1)* |
| **MyAnimeList** | [MyAnimeList → API](https://myanimelist.net/apiconfig) *(solo si se incorpora en v2 como crossref)* |

*(Open Library no exige clave para muchos usos; revisá sus límites de tasa en su documentación actual.)*

---

## 9. Estructura de carpetas del repo

```
/
├── src/                   # Svelte frontend
│   ├── lib/               # lógica, clientes API, stores
│   │   ├── api/           # clientes TMDB, AniList, IGDB, OpenLibrary
│   │   ├── db/            # queries SQL, runner de migraciones
│   │   └── stores/        # estado global Svelte
│   └── routes/            # pantallas (lista, detalle, edición)
├── src-tauri/             # Rust / configuración Tauri
├── migrations/            # 001_initial_schema.sql, 002_...sql
└── data/                  # runtime local (DB, caché de posters) — en .gitignore
```

---

## 10. Próximo paso recomendado

Con el stack cerrado, el siguiente trabajo concreto es:

1. **Scaffold del proyecto** — `npm create tauri-app` con template Svelte + TypeScript.
2. **Schema SQL inicial** — tablas `catalog_item`, `library_entry`, `migrations`; runner de migraciones en TypeScript.
3. **Cliente TMDB** — búsqueda de películas y series como primer caso de uso real.
4. **Pantallas base** — lista / detalle / edición de progreso.
5. **Obtener claves API** según la tabla del §8 sin commitearlas.

---

## 11. Referencias técnicas para el desarrollo

### 11.1 APIs y servicios que usa Yamtrack (código de referencia en este repo)

Yamtrack separa más o menos tres capas: **proveedores de catálogo** (búsqueda y metadatos por tipo de medio), **calendario** (fechas de emisión / estrenos) e **integraciones** (importar listas, OAuth, webhooks). Los valores `source` admitidos en el modelo están en `Sources` dentro de `src/app/models.py`.

#### Proveedores de catálogo (`src/app/providers/`)

| Fuente (`source`) | Rol | Base URL (en código) | Archivo |
|-------------------|-----|------------------------|---------|
| **TMDB** | Películas, series TV, temporadas y episodios (metadatos principales) | `https://api.themoviedb.org/3` | `tmdb.py` |
| **AniList** | Anime (fuente canónica v1; GraphQL) | `https://graphql.anilist.co` | `anilist.py` (importaciones) |
| **MAL** | Anime y manga (API v2) — crossref v2 | `https://api.myanimelist.net/v2` | `mal.py` |
| **IGDB** | Juegos | `https://api.igdb.com/v4` | `igdb.py` |
| **Open Library** | Libros | `https://openlibrary.org/api`, búsqueda `https://openlibrary.org/search.json` | `openlibrary.py` |
| **Hardcover** | Libros (GraphQL alternativo) | `https://api.hardcover.app/v1/graphql` | `hardcover.py` |
| **Comic Vine** | Cómics | `https://comicvine.gamespot.com/api` | `comicvine.py` |
| **MangaUpdates** | Manga | `https://api.mangaupdates.com/v1` | `mangaupdates.py` |
| **BGG** | Juegos de mesa (XML API2) | `https://boardgamegeek.com/xmlapi2` | `bgg.py` |
| **Manual** | Entradas sin API externa | — | `manual.py` |

#### Calendario y horarios (`src/events/calendar/`)

| Servicio | Uso en Yamtrack | Dónde mirar |
|----------|-----------------|-------------|
| **TMDB** | Metadatos de temporadas/episodios de TV | `tv.py` |
| **TVMaze** | `airstamp` por episodio cuando hay `tvdb_id` | `tv.py` — `https://api.tvmaze.com` |
| **AniList GraphQL** | Calendario de emisión de anime (`airingSchedule`) | `anime.py` — `https://graphql.anilist.co` |

#### Importaciones, OAuth y otros (`src/integrations/`)

| Servicio | Uso | Referencia en código |
|----------|-----|----------------------|
| **Trakt** | Import listas / historial vía OAuth | `imports/trakt.py` |
| **AniList** | Import listas (OAuth + GraphQL) | `imports/anilist.py` |
| **Simkl** | Import | `imports/simkl.py` |
| **Kitsu** | Import | `imports/kitsu.py` |
| **MAL** | Import desde cuenta MAL | `imports/mal.py` |
| **Steam Web API** | Sincronización relacionada con juegos | `imports/steam.py` |
| **Plex webhooks** | Eventos desde Plex | `webhooks/plex.py` |

### 11.2 Documentación oficial útil

| API | Documentación |
|-----|----------------|
| TMDB | [The Movie Database — API](https://developer.themoviedb.org/docs) |
| IGDB | [IGDB API docs](https://api-docs.igdb.com/) |
| AniList | [AniList API v2 (GraphQL)](https://anilist.gitbook.io/anilist-apiv2-docs/) |
| MyAnimeList | [MAL API](https://myanimelist.net/apiconfig) |
| Open Library | [Open Library API](https://openlibrary.org/developers/api) |
| TVMaze | [TVMaze API](https://www.tvmaze.com/api) |
| TheTVDB | [TheTVDB API v4](https://thetvdb.com/api-information) |
| Trakt | [Trakt API](https://trakt.docs.apiary.io/) |
| Steam Web API | [Steam Web API Key](https://steamcommunity.com/dev) |
| Tauri | [Tauri docs](https://tauri.app/) |
| tauri-plugin-sql | [tauri-plugin-sql](https://github.com/tauri-apps/tauri-plugin-sql) |
| Svelte 5 | [Svelte docs](https://svelte.dev/docs) |

---

*Especificación de **Shelfside**; el código de Yamtrack en este repo sigue siendo referencia viva para detalles de integración.*