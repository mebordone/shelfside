# Changelog

Todos los cambios notables de **Shelfside** se documentan aquí (formato inspirado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/)).

## [Unreleased]

## [0.3.3] — 2026-05-24

### Añadido

- Botón **Sincronizar carpeta** en Ajustes: importa `.md` de la carpeta sync y reexporta el estado local (`syncSyncFolder`).
- Resumen legible de sync (`formatSyncSummary`) e i18n (`settings.sync_now`, `settings.sync_summary`, `settings.sync_help` actualizado).
- Merge por identidad de catálogo (`source` + `external_id` + `media_type`) cuando el `shelfside_id` del `.md` no coincide con el id local.
- Tests: merge catálogo/manual, `syncSyncFolder` (orden import→export), `formatSyncSummary`.

### Cambiado

- Import/merge actualiza la fila local existente por catálogo en lugar de intentar `INSERT` con el id del otro dispositivo.
- Export/import Markdown incluyen `progress_current`, `progress_total` y `owned` en frontmatter y merge.

### Corregido

- Import de `.md` editados a mano con el mismo `updated_at` (comparación de contenido).
- Permisos Tauri `fs` ampliados (`$HOME`, `$DOWNLOAD`, rutas bajo `/mnt/datos`) y `mkdir` tolerante en export.
- Logs de ejecución en Ajustes (copiar logs de runtime).

## [0.3.2] — 2026-05-23

### Añadido

- Registro de fuentes de catálogo (`sources/registry`) para alta y refresco TMDB / Open Library desde Buscar y detalle.
- `RelatedSuggestionsBlock` unificado; wrappers TMDB y Open Library.
- Helpers i18n compartidos (`labelForStatus`, `labelForMedia`); invalidación central `afterLibraryChanged`.
- `deleteLibraryEntryWithAssets` (SQL en `db`, poster en flow).
- `mapLibraryRowsWithPosters`; secciones de Ajustes y paneles de detalle biblioteca troceados.
- Botón **Reparar portada** para ítems Open Library con URL `/b/olid/` o sin poster.
- Límite blando en inicio (24 ítems por sección) con enlace a biblioteca completa.
- Mensajes i18n para export/import Markdown en Ajustes.

### Cambiado

- Rutas de búsqueda y biblioteca usan el registro de fuentes y poster mapping centralizado.
- Paginación Open Library: `totalPages` desde `numFound` y tamaño de página.
- Inicio recarga al volver desde otra ruta cuando la biblioteca cambió (`homeRefreshPending`).

### Documentación

- README: subsección Sync Markdown (Syncthing); versión v0.3.2 en roadmap.

## [0.3.1] — 2026-05-23

### Añadido

- Preferencias de **idioma de catálogo** en Ajustes (igual que la app / español / inglés) y filtro opcional «solo ediciones en ese idioma» para libros.
- Chip de preferencia de catálogo en Buscar; vacío con botón para quitar filtro estricto en Open Library.
- **Quitar de biblioteca** en el detalle de un ítem (con confirmación); borra entrada, catálogo local y poster en disco.

### Cambiado

- Búsqueda de libros: título mostrado prioriza la **edición** preferida; subtítulo con título de la obra si difiere.
- Open Library: `lang` y consulta `language:spa|eng` según preferencias.
- TMDB: parámetros `language` y `region` en búsqueda, detalle y relacionados.

### Corregido

- Portadas de libros en **Biblioteca** tras añadir desde Buscar: `assetProtocol` y CSP en Tauri; reutilizar URL `/b/id/` de la búsqueda; no guardar URLs `/b/olid/`; validación al descargar posters.
- Listado de biblioteca: recarga al volver desde detalle o tras quitar un ítem (invalidación de `librarySession`).

## [0.3.0] — Release 3 — 2026-05-23

### Añadido

- Pantalla **`/settings`**: tema, idioma **es/en** (traducción completa), ruta/tamaño de DB, carpeta de sync, export/import Markdown, export CSV y backup DB (diálogo «Guardar como…»), reinicio de fábrica (zona peligro).
- Pantalla **`/stats`**: conteos por estado y tipo de medio; barras CSS.
- i18n: [`src/lib/i18n/index.ts`](src/lib/i18n/index.ts), [`en.ts`](src/lib/i18n/en.ts); locale en `localStorage`.
- Export/sync: [`src/lib/export/`](src/lib/export/) (CSV, Markdown, backup, slug), [`src/lib/sync/`](src/lib/sync/) (parse, merge LWW).
- [`src/lib/db/stats.ts`](src/lib/db/stats.ts), [`src/lib/db/reset.ts`](src/lib/db/reset.ts).
- Navegación: enlaces a Configuración y Estadísticas.

### Cambiado

- Inicio (`/`): sin pie técnico de tema ni metadatos de DB.
- Capabilities FS: scope `$HOME/**` para carpetas elegidas y sync.

## [0.2.0] — Release 2 — 2026-05-16

### Añadido

- Biblioteca: lista con filtros por tipo, estado y texto; detalle y edición (`/library`, `/library/[id]`, `/library/[id]/edit`).
- Búsqueda TMDB (películas y series) y alta en biblioteca (`/search`); refresco bajo demanda desde detalle.
- **Libros (Open Library):** búsqueda en `/search` (sin API key; `lang=es`), detalle por edición (`/search/book/[editionId]`), alta y refresco en biblioteca; sugerencias por temas/autor del work.
- Entradas **manuales** en `/add/manual` (película, serie o libro; autor/año opcionales en libros; imagen local opcional; metadatos en `metadata_json` cuando aplica).
- **Paginación** en Buscar (TMDB: 20/página; Open Library: 10/página) y en lista de Biblioteca (20/página), con contador, Anterior/Siguiente y caché de páginas ya visitadas.
- **FilterChipBar:** filtros compactos en inicio (tipo de medio), buscar (fuente TMDB / Open Library) y biblioteca (tipo + estado).
- Filtro de tipo en inicio persistido en `localStorage` (`homeMediaFilter`).
- Componente unificado `AddToLibraryMenuButton` (reemplaza `TmdbAddMenuButton`).
- Esquema `catalog_item` + `library_entry` (migración `002_catalog_library.sql`); progreso TV (`current_season`, `last_episode_watched`); puntuación 1–10.
- Caché de posters bajo datos de app (`AppLocalData`, carpeta `posters/`).
- Cliente TMDB: autenticación con **clave API v3** (`api_key` en URL) o **token de lectura JWT** (`Authorization: Bearer`).
- **Inicio** como panel agrupado por estado con rejilla compacta de tarjetas; enlace a biblioteca completa.
- Navegación superior con indicador de ruta activa.
- Capabilities: `remote.urls` para `http://localhost:1420` (desarrollo con `devUrl`).
- Detalle TMDB desde **Buscar** (`/search/movie|tv/[id]`): sección **Sugerencias TMDB** (recomendaciones y similares), misma UX que en el detalle de biblioteca para ítems TMDB (`TmdbRelatedSuggestionsBlock` compartido).
- Listado de resultados TMDB: microcopy bajo «Resultados» sobre el menú de estado al añadir.
- Cliente Open Library (búsqueda, detalle de edición, metadatos para catálogo y sugerencias relacionadas).

### Cambiado

- Pantalla Buscar unificada (TMDB + Open Library) con `searchSession` compartido entre rutas.
- Biblioteca: toolbar de chips en lugar del panel de selects; recarga inmediata al cambiar tipo/estado.

### Corregido

- Filtro de estado en biblioteca: etiqueta “Todos” (antes se mostraba el texto de “Todos los tipos”).
- Formulario de edición: campos numéricos enlazaban `number` y fallaba `.trim()` al guardar.
- Alcance `fs:scope`: uso de `$APPLOCALDATA` en lugar de la variable no documentada `$APP`.

### Seguridad / operación

- Regenerá las claves TMDB si alguna vez se publicaron en un canal inseguro; no subas `.env` al repositorio.

## [0.1.0] — Release 1

- Fundación: Tauri + SvelteKit estático, SQLite + migraciones numeradas, tema claro/oscuro, i18n base (español), README y build Linux.
