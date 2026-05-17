# Changelog

Todos los cambios notables de **Shelfside** se documentan aquí (formato inspirado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/)).

## [Unreleased]

## [0.2.0] — 2026-05-16

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

## [0.1.0] — Release 0

- Fundación: Tauri + SvelteKit estático, SQLite + migraciones numeradas, tema claro/oscuro, i18n base (español), README y build Linux.
