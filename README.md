# Shelfside

Aplicación minimalista para seguimiento de consumos culturales con soberanía de datos y portabilidad (escritorio **Tauri** + **Svelte 5**).

- Especificación: [project.md](./project.md)
- Roadmap: [roadmap.md](./roadmap.md)

---

## Cómo correr el proyecto (mínimo)

1. Instalá **Node.js** (LTS), **Rust** y las **librerías de sistema** de tu SO (ver abajo; en Linux son paquetes tipo WebKitGTK).
2. En la carpeta del repo:

```bash
npm install
cp .env.example .env   # opcional hasta que uses APIs
npm run tauri dev
```

Para validar todo antes de un PR o un release:

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

### Windows y macOS

- **Windows:** [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (carga de trabajo “Desarrollo para escritorio con C++”) y [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/). Detalle: [prerequisites — Windows](https://tauri.app/start/prerequisites/#windows).
- **macOS:** Xcode o al menos **Xcode Command Line Tools** (`xcode-select --install`). Detalle: [prerequisites — macOS](https://tauri.app/start/prerequisites/#macos).

---

## Configuración opcional (`.env`)

Cuando integres APIs (TMDB, IGDB, AniList, etc.):

```bash
cp .env.example .env
```

Completá los valores en `.env` (no lo subas al repo: está en `.gitignore`). Las variables `VITE_*` las usa el frontend en build/dev.

---

## Base de datos

SQLite con [`@tauri-apps/plugin-sql`](https://v2.tauri.app/plugin/sql/): archivo bajo el directorio de datos de la app (`sqlite:shelfside.db`). Migraciones en [`migrations/`](./migrations/), aplicadas al arranque desde `src/lib/db/`.

En Tauri 2 el **ACL** del plugin SQL exige permisos explícitos además de `sql:default`. Este repo declara en [`src-tauri/capabilities/default.json`](src-tauri/capabilities/default.json) también `sql:allow-load`, `sql:allow-execute` y `sql:allow-select`. Si aparece un error del tipo `sql.execute not allowed`, revisá que esa capability siga aplicada a la ventana `main`.

Si ves **`no such table: app_meta`** después de actualizar el proyecto: puede quedar una **base vieja** creada cuando el runner de migraciones omitía los `CREATE` (bug ya corregido). Borrá el archivo SQLite de la app (p. ej. `shelfside.db` bajo el directorio de datos de Shelfside en tu usuario, típicamente `~/.local/share/com.mebordone.shelfside/` en Linux) o desinstalá datos de la app y volvé a ejecutar `npm run tauri dev`.

---

## Tests y comprobaciones

```bash
npm run lint          # ESLint: complejidad ciclomática ≤ 10, cognitiva ≤ 15
npm run test          # Vitest sin cobertura
npm run test:coverage # Vitest + cobertura (umbrales en vitest.config.ts)
npm run check         # svelte-check + TypeScript
npm run build         # build estático (SvelteKit)
```

Cobertura: `src/**/*.{ts,svelte}` excluyendo `*.test.ts`, `src/test/` y `src/routes/+layout.ts`. Umbrales mínimos alineados con **AGENTS** (60 % líneas/declaraciones; ver [`vitest.config.ts`](vitest.config.ts)).

| Área | Archivo(s) |
|------|----------------|
| i18n `t()` | [`src/lib/i18n/es.test.ts`](src/lib/i18n/es.test.ts) |
| Migraciones (`splitStatements`, `runMigrations`) | [`src/lib/db/migrate.test.ts`](src/lib/db/migrate.test.ts) |
| Reexport `db` | [`src/lib/db/index.test.ts`](src/lib/db/index.test.ts) |
| Conexión SQLite (mock del plugin) | [`src/lib/db/connection.test.ts`](src/lib/db/connection.test.ts) |
| Store de tema | [`src/lib/stores/theme.svelte.test.ts`](src/lib/stores/theme.svelte.test.ts) |
| Layout arranque | [`src/routes/layout.svelte.test.ts`](src/routes/layout.svelte.test.ts) + [`src/test/LayoutHarness.svelte`](src/test/LayoutHarness.svelte) |
| Página inicio | [`src/routes/page.svelte.test.ts`](src/routes/page.svelte.test.ts) |

[`eslint.config.js`](eslint.config.js) · resolución `browser` en Vitest · [`src/test/vitest-setup.ts`](src/test/vitest-setup.ts). No uses el prefijo `+` en nombres de archivos de test.

---

## Versión

Release 0 — fundación: **0.1.0** (ver [roadmap.md](./roadmap.md)).
