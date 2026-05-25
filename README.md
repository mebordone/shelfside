# Shelfside

Aplicación minimalista para seguimiento de consumos culturales con soberanía de datos y portabilidad (**Tauri** + **Svelte 5**).

- Especificación: [project.md](./project.md)
- Roadmap: [roadmap.md](./roadmap.md)
- Cambios por versión: [CHANGELOG.md](./CHANGELOG.md)

**Plataformas (roadmap):** desarrollo y uso diario en **Linux**; **Android** (Tauri, APK sideload) en Release 5 (`v0.5.0`), antes que **Windows** (backlog Release 7+). Biblioteca compartida PC ↔ celu vía carpeta **Syncthing / Nextcloud** y archivos Markdown (no servidor propio). Ver [roadmap.md](./roadmap.md) y `project.md` §8.

---

## Cómo correr el proyecto (mínimo)

1. Instalá **Node.js** (LTS), **Rust** (`rustup` + stable) y las **librerías de sistema** de tu SO (ver abajo; en Linux: WebKitGTK, etc.).
2. En la carpeta del repo:

```bash
npm install
cp .env.example .env
# Editá .env y poné al menos VITE_TMDB_API_KEY para usar /search (TMDB).
npm run tauri:dev
# equivalente: npm run tauri dev
```

La primera vez que corrés Tauri, **Cargo** descargará dependencias Rust (plugins `sql`, `fs`, `dialog`); puede tardar varios minutos.

Para validar solo el frontend (sin ventana de escritorio):

```bash
npm run dev
```

(La base SQLite y los plugins Tauri **no** están disponibles en el navegador; servís para revisar UI estática. El flujo real de biblioteca es con `npm run tauri dev`.)

---

## Probar el funcionamiento (checklist rápido)

Con la app abierta (`npm run tauri dev`):

1. **Migraciones:** si arranca sin error en pantalla, `001` y `002` se aplicaron. Si ves error de SQL o tablas faltantes y venías de una versión vieja, borrá la base del usuario (ver sección *Base de datos* más abajo) y reiniciá.
2. **Inicio:** panel por estado con barra de chips de tipo (Todos / Película / Serie TV / Libro; recuerda el último en `localStorage`); pie con estado de DB y selector de tema.
3. **Manual:** **Añadir manual** → película, serie o **libro** (autor/año opcionales) + imagen opcional → guardar → **Biblioteca** e **Inicio**; **Editar** (estado, notas; TV: temporada/episodio).
4. **Buscar:** chips **Pelis y series** (TMDB; requiere `VITE_TMDB_API_KEY`) u **Libros** (Open Library; sin clave). Resultados paginados (20 ítems por página en TMDB, 10 en libros); contador y Anterior/Siguiente; caché al volver atrás. **Añadir** con menú de estado. Detalle libro: `/search/book/[editionId]`; sugerencias TMDB u OL por tema/autor. En biblioteca: **Actualizar desde TMDB** o **Actualizar desde Open Library** según la fuente.
5. **Filtros:** en **Biblioteca**, chips de tipo y estado (recarga al instante), búsqueda por título con **Aplicar** o Enter; lista paginada (20 por página).
6. **Reinicio:** cerrá la app y volvé a abrir: la biblioteca y posters cacheados deben persistir.
7. **Consola WebView (opcional):** en el flujo anterior no deberían aparecer errores rojos de JS.

Antes de un PR o release:

```bash
npm run verify   # lint + cobertura + check + build
```

Para compilar el binario de escritorio:

```bash
npm run tauri build
```

Salida típica: `src-tauri/target/release/` (y bundles según `tauri.conf.json`).

---

## Requisitos

| Herramienta | Para qué |
|-------------|-----------|
| **Node.js** (LTS) + npm | Dependencias JS y scripts `npm run …` |
| **Rust** (`rustc`, `cargo`) | Compilar el núcleo Tauri (`src-tauri/`) |
| **Dependencias de sistema** (sobre todo en **Linux**) | WebKit y enlazado nativo que usa Tauri |

Documentación oficial de prerequisitos: [Tauri — Prerequisites](https://tauri.app/start/prerequisites/).

### Node.js

- Descargá la versión **LTS** desde [nodejs.org](https://nodejs.org/) o usá el gestor de versiones que prefieras (`nvm`, `fnm`, paquetes de la distro).
- Comprobación:

```bash
node -v
npm -v
```

Reiniciá la terminal después de instalar.

### Rust

Instalación recomendada con **rustup**:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Elegí la opción por defecto (stable). Luego:

```bash
source "$HOME/.cargo/env"   # o cerrá y abrí la terminal
rustc -V
cargo -V
```

### Linux — librerías de sistema (Debian / Ubuntu)

Ejemplo para distros basadas en Debian (nombres pueden variar según versión):

```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libxdo-dev
```

**Otras distribuciones** (Arch, Fedora, openSUSE, etc.): listas de paquetes equivalentes en la misma [página de prerequisitos de Tauri](https://tauri.app/start/prerequisites/#linux).

### Android (Release 5 — planificado)

Cuando se implemente el cliente móvil: [prerrequisitos Android de Tauri](https://tauri.app/start/prerequisites/#android) (SDK, NDK, etc.), build con `tauri android build`, instalación por **sideload** (sin Play Store). La carpeta de sync suele ser la que **Syncthing** replica en el dispositivo.

### Windows y macOS (backlog)

- **Windows** (Release 7+): [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) y [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/). Detalle: [prerequisites — Windows](https://tauri.app/start/prerequisites/#windows).
- **macOS:** Xcode o **Xcode Command Line Tools** (`xcode-select --install`). Detalle: [prerequisites — macOS](https://tauri.app/start/prerequisites/#macos).

---

## Configuración opcional (`.env`)

Cuando integres APIs (TMDB, IGDB, AniList, etc.):

```bash
cp .env.example .env
```

Completá los valores en `.env` (no lo subas al repo: está en `.gitignore`). Las variables `VITE_*` las usa el frontend en build/dev.

Para **buscar y añadir películas/series desde TMDB** necesitás al menos `VITE_TMDB_API_KEY`. Podés usar la **clave API v3** (hex de 32 caracteres) o el **token de acceso de lectura** (JWT que empieza con `eyJ`); el cliente elige el método según el formato.

**Libros (Open Library)** no requieren clave: la búsqueda y el detalle usan la API pública con `lang=es`.

---

## Release 2 — Biblioteca y catálogo (`v0.2.0`)

Incluye **películas, series TV y libros** (TMDB + Open Library + alta manual).

- **Rutas:** `/` (inicio / panel por estado), `/library` (lista paginada con filtros en chips), `/library/[id]` (detalle y refresco TMDB u Open Library), `/library/[id]/edit`, `/search` (chips TMDB / Libros, paginado), `/search/movie|tv/[id]`, `/search/book/[editionId]`, `/add/manual` (película, serie o libro).
- **Catálogo:** TMDB para cine y TV; **Open Library** para libros (búsqueda, detalle por edición, refresco y sugerencias por tema/autor); entradas **manuales** para los tres tipos con imagen local opcional.
- **UI:** `FilterChipBar` para filtros compactos (inicio, buscar, biblioteca); `SearchResultsPagination` compartido entre buscar y biblioteca.
- **Datos:** tablas `catalog_item` y `library_entry` (migración `002_catalog_library.sql`); estado por defecto `planning`; puntuación 1–10; progreso TV (`current_season`, `last_episode_watched`); metadatos de libro en `metadata_json` cuando aplica.
- **Posters:** se descargan a disco bajo el directorio de datos de la app (`BaseDirectory.AppLocalData`, carpeta `posters/`); en la UI se sirven con `convertFileSrc` cuando hay `poster_local_path` (requiere `assetProtocol` habilitado en `tauri.conf.json`).
- **Permisos Tauri:** plugins **sql**, **fs** y **dialog**; capabilities con `fs:default` + `fs:scope` (`$APPLOCALDATA`, `$APPDATA`, `$APPCACHE`, `$HOME`) y `remote.urls` para Vite en desarrollo (`http://localhost:1420`, etc.).

---

## Release 3 — Configuración, export y estadísticas (`v0.3.0`)

- **Rutas:** `/settings` (tema, idioma es/en, datos, sync, export CSV, backup DB, reinicio de fábrica), `/stats` (conteos por estado y tipo).
- **Sync Markdown (Syncthing):** en Ajustes, definí la carpeta de sincronización. **Exportar** escribe `library/{slug}-{id}.md` en esa carpeta; copiala con Syncthing o Nextcloud al otro dispositivo. **Importar / combinar** lee los `.md` y fusiona por `shelfside_id` y `updated_at` (last-write-wins); no borra entradas locales ni sincroniza el `.sqlite`. No versiones la base SQLite en la carpeta sync.
- **CSV y backup:** diálogo «Guardar como…» cada vez (`library.csv`, `shelfside-YYYY-MM-DD-HHmm.db`).
- **CSV columnas:** `shelfside_id`, `title`, `media_type`, `source`, `external_id`, `status`, `score`, `current_season`, `last_episode_watched`, `started_at`, `completed_at`, `notes`, `image_url`, `catalog_updated_at`, `library_updated_at`.

---

## Base de datos

SQLite con [`@tauri-apps/plugin-sql`](https://v2.tauri.app/plugin/sql/): archivo `shelfside.db` bajo el **directorio de datos de la aplicación** del SO (no dentro del repo). El identificador de la app es `com.mebordone.shelfside` en `tauri.conf.json`.

- **Linux (típico):** `~/.local/share/com.mebordone.shelfside/` — ahí está `shelfside.db` y la carpeta `posters/` (caché de carátulas).
- **Respaldo:** copiá ese directorio (o al menos `shelfside.db` + `posters/`) antes de reinstalar o borrar datos.

Migraciones en [`migrations/`](./migrations/), aplicadas al arranque desde `src/lib/db/`.

En Tauri 2 el **ACL** del plugin SQL exige permisos explícitos además de `sql:default`. Este repo declara en [`src-tauri/capabilities/default.json`](src-tauri/capabilities/default.json) también `sql:allow-load`, `sql:allow-execute` y `sql:allow-select`. Si aparece un error del tipo `sql.execute not allowed`, revisá que esa capability siga aplicada a la ventana `main`.

Si ves **`no such table: app_meta`** después de actualizar el proyecto: puede quedar una **base vieja** creada cuando el runner de migraciones omitía los `CREATE` (bug ya corregido). Borrá el archivo SQLite de la app (p. ej. `shelfside.db` bajo el directorio de datos de Shelfside en tu usuario, típicamente `~/.local/share/com.mebordone.shelfside/` en Linux) o desinstalá datos de la app y volvé a ejecutar `npm run tauri dev`.

Tras actualizar a **0.2.0**, si falta el esquema de biblioteca (`no such table: catalog_item`), borrá la misma base para que se apliquen `001` y `002` desde cero.

---

## Tests y comprobaciones

```bash
npm run lint          # ESLint: complejidad ciclomática ≤ 10, cognitiva ≤ 15
npm run test          # Vitest sin cobertura
npm run test:coverage # Vitest + cobertura (umbrales en vitest.config.ts)
npm run check         # svelte-check + TypeScript
npm run build         # build estático (SvelteKit)
```

Cobertura: `src/**/*.{ts,svelte}` con exclusiones de rutas de UI extensas, `poster`, reexport `api/index` y tests (ver [`vitest.config.ts`](vitest.config.ts)); umbrales globales mínimos 60 % líneas/declaraciones. La lógica de `src/lib/db/**` y `src/lib/api/tmdb/**` se cubre con tests unitarios.

| Área | Archivo(s) |
|------|----------------|
| i18n `t()` | [`src/lib/i18n/i18n.test.ts`](src/lib/i18n/i18n.test.ts) |
| Export / sync | [`src/lib/export/`](src/lib/export/), [`src/lib/sync/`](src/lib/sync/) |
| Stats / reset | [`src/lib/db/stats.test.ts`](src/lib/db/stats.test.ts), [`src/lib/db/reset.test.ts`](src/lib/db/reset.test.ts) |
| Migraciones (`splitStatements`, `runMigrations`) | [`src/lib/db/migrate.test.ts`](src/lib/db/migrate.test.ts) |
| Reexport `db` | [`src/lib/db/index.test.ts`](src/lib/db/index.test.ts) |
| Catálogo SQL | [`src/lib/db/catalog.test.ts`](src/lib/db/catalog.test.ts) |
| Biblioteca / reglas | [`src/lib/db/library.test.ts`](src/lib/db/library.test.ts), [`src/lib/db/libraryRules.test.ts`](src/lib/db/libraryRules.test.ts) |
| TMDB (cliente HTTP) | [`src/lib/api/tmdb/client.test.ts`](src/lib/api/tmdb/client.test.ts) |
| Open Library (cliente HTTP) | [`src/lib/api/openlibrary/client.test.ts`](src/lib/api/openlibrary/client.test.ts), [`editionDetail.test.ts`](src/lib/api/openlibrary/editionDetail.test.ts) |
| Catálogo libros / related OL | [`src/lib/library/openLibraryCatalogMeta.test.ts`](src/lib/library/openLibraryCatalogMeta.test.ts), [`src/lib/library/openLibraryRelatedHits.test.ts`](src/lib/library/openLibraryRelatedHits.test.ts), [`openLibraryFlow.test.ts`](src/lib/library/openLibraryFlow.test.ts) |
| Paginación búsqueda / biblioteca | [`src/lib/library/searchPagination.test.ts`](src/lib/library/searchPagination.test.ts), [`catalogSearchPage.test.ts`](src/lib/library/catalogSearchPage.test.ts) |
| FilterChipBar | [`src/lib/components/FilterChipBar.svelte.test.ts`](src/lib/components/FilterChipBar.svelte.test.ts) |
| Posters (rutas relativas) | [`src/lib/poster/storage.test.ts`](src/lib/poster/storage.test.ts) |
| Conexión SQLite (mock del plugin) | [`src/lib/db/connection.test.ts`](src/lib/db/connection.test.ts) |
| Store de tema | [`src/lib/stores/theme.svelte.test.ts`](src/lib/stores/theme.svelte.test.ts) |
| Layout arranque | [`src/routes/layout.svelte.test.ts`](src/routes/layout.svelte.test.ts) + [`src/test/LayoutHarness.svelte`](src/test/LayoutHarness.svelte) |
| Página inicio | [`src/routes/page.svelte.test.ts`](src/routes/page.svelte.test.ts) |

[`eslint.config.js`](eslint.config.js) · resolución `browser` en Vitest · [`src/test/vitest-setup.ts`](src/test/vitest-setup.ts). No uses el prefijo `+` en nombres de archivos de test.

---

## Versión

- **v0.3.2** — Consolidación pre-v0.4: registro de fuentes, componentes relacionados unificados, i18n/mutaciones/delete flow, settings y detalle modularizados, reparar portada OL, límite en inicio, paginación OL y mensajes sync MD.
- **v0.3.1** — Idioma de catálogo (Ajustes + Buscar), títulos de edición en Open Library, TMDB con `language`/`region`, portadas OL en biblioteca, quitar ítem de biblioteca.
- **v0.3.0** — Release 3: `/settings`, `/stats`, i18n es/en, export CSV, backup DB, sync Markdown (carpeta + merge manual), reinicio de fábrica (detalle en [CHANGELOG.md](./CHANGELOG.md)).
- **v0.2.0** — Release 2: biblioteca, TMDB (película/TV), **libros (Open Library)**, manual (incl. libro), paginación, `FilterChipBar`, posters en caché, panel de inicio por estado.
- **v0.1.0** — Release 1: fundación (scaffold, SQLite, migraciones, tema, i18n base).

Antes de etiquetar un release: `npm run verify` (lint + cobertura + `svelte-check` + build Vite). Con **Rust** y prerequisitos de Tauri instalados: `npm run tauri build` (artefactos bajo `src-tauri/target/release/` y bundles según `tauri.conf.json`).

Para crear la etiqueta git del corte (cuando los cambios ya estén commiteados en la rama deseada):

```bash
git tag -a v0.2.0 -m "Release 2: biblioteca, TMDB, Open Library (libros) y catálogo MVP"
```
