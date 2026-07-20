# Changelog

Todos los cambios notables de **Shelfside** se documentan aquí (formato inspirado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/)).

## [Unreleased]

## [0.4.8] — 2026-07-20

> Pulido post-madurez R4: sync que no molesta ni reescribe de más, posters offline tras sync, y recomendaciones de libros mucho más relevantes.

### Añadido

- **Posters:** backfill en segundo plano tras sincronizar — descarga y guarda localmente los pósters de ítems que llegaron por CSV (u otros sin `poster_local_path`), sin bumpear `updated_at` del catálogo.
- **Libros / sugerencias:** recomendaciones Open Library por **serie + autor + subjects** filtrados (blacklist de tags genéricos), scoring y diversificación; menos requests (sin N+1 a `/subjects`).

### Cambiado

- **Sync CSV:** no reescribe `shelfside.csv` si el contenido serializado es idéntico al del disco (evita re-propagación Syncthing).
- **Arranque:** la sync al abrir sigue corriendo pero **sin cartel** en Inicio; el resultado se persiste y se ve en Ajustes.
- **Ajustes → Datos:** «Última sincronización» con **fecha/hora** + relativo + resumen; el texto distingue «reescribió» vs «ya estaba al día».

### Release

- Versión **0.4.8**. `npm run check` sin errores; 249 tests en verde. APK validado en dispositivo.

## [0.4.7] — 2026-07-17

> Paquete de madurez post-R4. Retoques de UX pedidos (limpiar/derivar búsqueda, ver categorías en grilla, más sugerencias, recomendados clicables) más piezas de madurez (Inicio con marca + toggle, filtros recordados, última sync, retry, vacíos).

### Añadido

- **Inicio:** header **Shelfside** siempre visible en móvil con toggle **carrusel | grilla** a la derecha (en desktop, junto a los filtros). Bloque **Continuar** con hasta 3 ítems en progreso.
- **Biblioteca:** toggle **grilla | lista** persistido; se recuerdan los filtros de **tipo** y **estado** entre sesiones.
- **Ajustes → Datos:** «Última sincronización: hace X» con resumen corto (OK/error) tras cada sync.
- **Búsqueda y sugerencias:** botón **Reintentar** cuando falla la carga.
- **Sugerencias:** póster clicable para abrir la ficha y hoja **Ver más** con paginación (TMDB).
- **Biblioteca ↔ Búsqueda:** limpiar/reiniciar búsqueda con «×» y derivar la consulta desde Biblioteca al catálogo cuando no hay resultados.

### Cambiado

- Vacíos de Biblioteca con copy distinto según haya filtros activos o la biblioteca esté vacía.

### Release

- Versión **0.4.7**. `npm run check` sin errores; suite de tests en verde. APK instalado por `adb` para validación.

## [0.4.6] — 2026-07-17

### Añadido

- Guía **PC ↔ Syncthing ↔ Android** en README (CSV `shelfside.csv`, orden recomendado, tombstones, Markdown = export).
- Mensajes de error de red/API más claros en búsqueda y sugerencias (`userFacingError`).

### Cambiado

- Confirmado: sync al abrir no bloquea el arranque; si falla, banner de error y la UI sigue usable (test de layout).
- Tombstones CSV (B3) cubiertos por la suite existente (`mergeFromCsv` / `writeTombstoneCsv` / clean recycle).

### Release

- Versión **0.4.6** — cierre Release 4.
- Binarios en GitHub Releases: [v0.4.6](https://github.com/mebordone/shelfside/releases/tag/v0.4.6) (`.deb`, AppImage, APK Android **release firmado**).

## [0.4.5-ux.1] — 2026-07-17

> Corte intermedio de UX móvil dentro de la línea **0.4.5** (plan «v0.4.5.1»). Paquete semver `0.4.5-ux.1` (Tauri no acepta `0.4.5.1`). La release distribuible sigue siendo `0.4.6`.

### Añadido

- **Detalle:** chip de estado tocable con selector rápido; progreso de TV (temporada/episodio) editable in situ con `−/+` y CTA `+1 episodio`; progreso de libro editable al tocar páginas.
- Acceso visible `…` a edición rápida en tarjetas de Inicio y filas de Biblioteca (además del long-press).

### Cambiado

- Filtro de medio: etiqueta «Todos» (antes «Todos los tipos») y chips un poco más compactos sin bajar de ~44px de alto.

## [0.4.5] — 2026-07-17

### Añadido

- **Búsqueda móvil:** input `type="search"` con `enterkeyhint`, scroll al focus; CTA «Añadir» y menú de estados con targets ~44px; detalle TMDB/OL con botón full-width en móvil.
- **Alta manual:** footer sticky Guardar, targets táctiles; mensaje claro si el picker de imagen falla en Android.
- **Stats:** barras y tipografía más legibles; empty con enlaces a Biblioteca y Buscar.
- **Export / backup:** helper de destino (`saveDestination`); Markdown a `library/` de sync o fallback Descargas/`shelfside-library/`; backup/CSV one-shot con `dialog.save` o fallback a Descargas + mensaje con path.

### Cambiado

- Botones de datos en Ajustes con `shelf-touch` / `min-h-11`.
- Compact «+» de related ≥ 44px; thumbs de búsqueda degradan a placeholder si fallan.

## [0.4.4] — 2026-07-17

### Añadido

- **Inicio:** carrusel horizontal por sección, empty por sección, long-press → edición rápida (estado + progreso TV).
- **Biblioteca:** filas enteras tappeables, empties con CTAs, paginación con targets ~44px.
- Progreso de **libro** (`progress_current` / `progress_total`) en detalle y formulario de edición.
- Sheet **edición rápida** compartido (Inicio + biblioteca).

### Cambiado

- Shell móvil: indicador de tab activo (`border-t`); sin header en Inicio (safe-area en el main).
- Acciones de detalle apiladas y táctiles en móvil; footer sticky al guardar en edit.
- Filtros de biblioteca: chips de estado en fila propia.

### Corregido

- Banner de sync al abrir: padding `safe-area-inset-top` en Inicio para que «Cerrar» no quede bajo la barra de estado.

## [0.4.3] — 2026-07-17

### Añadido

- **Shell móvil:** detección `isMobileLayout` (viewport ≤767px o Android).
- **Bottom navigation** con 4 tabs: Inicio, Biblioteca, Buscar, Más (safe-area inferior).
- Hoja **«Más»** con enlaces a Alta manual, Estadísticas y Configuración.
- Targets táctiles ~44px (`.shelf-touch`, `.shelf-btn-primary`) en nav y CTAs principales.

### Cambiado

- En desktop se mantiene el nav superior; en móvil, header compacto + bottom bar.
- **Pulido Inicio (móvil):** marca sin bloque verde sólido; títulos de cards en zinc (no emerald); chips de filtro ~44px; progreso TV sin `T—` (`E144` / `T2` / `T2 · E4`).

### Corregido

- Alineación ELF **16 KB** de `libshelfside_lib.so` (flags de linker en `build.rs`) para el aviso de compatibilidad en Android.

## [0.4.2] — 2026-07-17

### Añadido

- **Sync al abrir:** tras migraciones, si hay carpeta sync y el toggle está activo, sincroniza `shelfside.csv` en background sin bloquear la UI.
- Banner bajo el nav con progreso («Sincronizando…»), resumen (`formatSyncSummary`) o error.
- Preferencia **Sincronizar al abrir** en Ajustes (`localStorage` `shelfside-sync-on-start`); default **on** solo si ya hay carpeta configurada.

### Notas

- Misma lógica en desktop y Android. En Android no se abre el diálogo de permisos al boot; si falla el acceso, el banner lo indica.

## [0.4.1] — 2026-07-16

### Añadido

- **Sync CSV:** canal de sincronización `shelfside.csv` (merge LWW, tombstones `deleted`/`deleted_at`, limpiar papelera).
- Campo de **ruta sync editable** en Ajustes (+ validación). Si la ruta no termina en `shelfside/`, la app crea y usa esa subcarpeta automáticamente.
- En Android: ruta Syncthing precargada (`/storage/emulated/0/Sync`), permiso **Acceso a todos los archivos** (`MANAGE_EXTERNAL_STORAGE` + plugin nativo), sin selector de carpeta (no soportado por Tauri).
- Permisos FS Android ampliados (`$DOCUMENT`, `$DOWNLOAD`, `/storage/emulated/0/**`) y `plugin-http` para descargar posters sin CORS del WebView.
- Safe-area en la barra de navegación (evita solaparse con la barra de estado en Android edge-to-edge).

### Cambiado

- Botón **Sincronizar** opera sobre CSV (ya no sobre `library/*.md`); al sincronizar aplica el borrador de ruta si aún no había carpeta activa.
- Tombstones al quitar de biblioteca se escriben en el CSV.
- Export/Import **Markdown** quedan para Obsidian / migración («Más opciones»).
- Resumen de sync más claro: del CSV (nuevas/actualizadas/…) y luego reescritura del CSV con el estado completo.
- Textos i18n de sync actualizados.

### Notas

- Migración desde sync MD v0.3.x: «Importar Markdown» una vez y luego sync CSV.
- **QA:** roundtrip PC ↔ Syncthing ↔ Android (Samsung S23) verificado con sync manual del CSV.
- En Android concedé acceso a archivos cuando la app lo pida; el APK de depuración puede mostrar aviso de alineación 16 KB (no bloquea el uso).

## [0.4.0] — 2026-05-25

### Añadido

- **Android (Tauri):** `tauri android init`, proyecto Gradle en `src-tauri/gen/android/`, scripts npm `tauri:android:*`.
- Capability **`mobile`** (`platforms: android`) con permisos base `sql`, `fs` (app local), `dialog`.
- **B1:** tests explícitos UUID v4 en `addManualToLibrary` y roundtrip export Markdown para manuales.
- README: checklist toolchain Android desde cero en Linux (JDK, SDK, NDK, `rustup`, `adb`, primer build e instalación APK).

### Cambiado

- Capability **`default`** limitada a desktop (`linux`, `windows`, `macOS`).
- Versión semver `0.4.0` en `package.json`, `tauri.conf.json` y `Cargo.toml`.

### Notas

- Manuales creados **antes** de v0.4.0 pueden tener `external_id` no-UUID; reexportar desde Ajustes para alinear sync multi-dispositivo.
- Sync de carpeta en Android y scopes `fs` ampliados: **`v0.4.1`**. UI móvil (bottom bar): **`v0.4.3`**.

### Conocido en Android (validación SM-G525F)

- Inicio/Biblioteca cargan; primera navegación puede demorar (arranque en frío).
- Selector de carpeta sync: no implementado en móvil → usar ruta escrita en **v0.4.1**.
- Posters TMDB en Buscar: error CORS en WebView; workaround futuro: guardar poster local al añadir.
- Export CSV: mensaje «tab inactive» en devtools; el flujo en el dispositivo puede completarse igual.
- Alta manual sin notas: reportado en QA; el código admite `notes: null` — revisar reproducción en **v0.4.1**.

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
