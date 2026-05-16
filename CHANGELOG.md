# Changelog

Todos los cambios notables de **Shelfside** se documentan aquí (formato inspirado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/)).

## [0.2.0] — 2026-05-15

### Añadido

- Biblioteca: lista con filtros por tipo, estado y texto; detalle y edición (`/library`, `/library/[id]`, `/library/[id]/edit`).
- Búsqueda TMDB y alta en biblioteca (`/search`); refresco bajo demanda desde detalle.
- Entradas manuales con imagen local opcional (`/add/manual`).
- Esquema `catalog_item` + `library_entry` (migración `002_catalog_library.sql`); progreso TV (`current_season`, `last_episode_watched`); puntuación 1–10.
- Caché de posters bajo datos de app (`AppLocalData`, carpeta `posters/`).
- Cliente TMDB: autenticación con **clave API v3** (`api_key` en URL) o **token de lectura JWT** (`Authorization: Bearer`).
- **Inicio** como panel agrupado por estado con rejilla compacta de tarjetas; enlace a biblioteca completa.
- Navegación superior con indicador de ruta activa.
- Capabilities: `remote.urls` para `http://localhost:1420` (desarrollo con `devUrl`).
- Detalle TMDB desde **Buscar** (`/search/movie|tv/[id]`): sección **Sugerencias TMDB** (recomendaciones y similares), misma UX que en el detalle de biblioteca para ítems TMDB (`TmdbRelatedSuggestionsBlock` compartido).
- Listado de resultados TMDB: microcopy bajo «Resultados» sobre el menú de estado al añadir.

### Corregido

- Filtro de estado en biblioteca: etiqueta “Todos” (antes se mostraba el texto de “Todos los tipos”).
- Formulario de edición: campos numéricos enlazaban `number` y fallaba `.trim()` al guardar.
- Alcance `fs:scope`: uso de `$APPLOCALDATA` en lugar de la variable no documentada `$APP`.

### Seguridad / operación

- Regenerá las claves TMDB si alguna vez se publicaron en un canal inseguro; no subas `.env` al repositorio.

## [0.1.0] — Release 0

- Fundación: Tauri + SvelteKit estático, SQLite + migraciones numeradas, tema claro/oscuro, i18n base (español), README y build Linux.
