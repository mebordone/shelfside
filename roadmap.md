# Roadmap — Shelfside

Documento de **releases ordenadas** para construir el producto. Modelo de datos, APIs, stack y decisiones cerradas están en [`project.md`](./project.md); este archivo solo define **qué entregar en cada corte** y el orden sugerido.

**Convención:** el **número de release** (1, 2, 3…) es la etiqueta de producto; la **versión semver** (`v0.1.0`, `v0.2.0`…) es lo que va en `package.json`, `tauri.conf.json`, tags git y CHANGELOG. **Release N = `v0.N.0`** hasta `1.0.0`.

| Release | Versión | Estado |
|---------|---------|--------|
| 1 — Fundación | `v0.1.0` | Entregado |
| 2 — Biblioteca y catálogo MVP | `v0.2.0` | Entregado |
| 3 — Configuración, exportaciones y estadísticas | `v0.3.0` | Planificado |
| 4 — Anime y juegos | `v0.4.0` | Planificado |
| 5 — Portable, Windows y pulido | `v0.5.0` | Planificado |
| 6 — Calendario y próximos estrenos | `v0.6.0` | Planificado |
| 7 — Backlog y expansión | `v0.7.0+` | Sin versión fija |

Tras el MVP desktop estable: **`v1.0.0`**. Calendario y expansiones posteriores: `v1.1.0`, `v1.2.0`, etc.

---

## Release 1 — Fundación · `v0.1.0`

**Objetivo:** repo ejecutable con datos locales persistentes y criterios de calidad mínimos.

| Entregable | Notas |
|------------|--------|
| Scaffold Tauri + Svelte 5 + TypeScript + Tailwind | `npm create tauri-app` (o equivalente actual), estructura alineada con `project.md` §9 |
| SQLite vía `tauri-plugin-sql` | DB en `app_data_dir()`, no en el árbol del repo versionado |
| Migraciones SQL numeradas + tabla `migrations` | Runner en TS en `src/lib/db/`; sin librerías ORM/migración extra |
| `.env.example` | Variables documentadas sin secretos; `.env` en `.gitignore` |
| Tema claro / oscuro + textos con claves (i18n-ready) | UI español v1; ver `project.md` §7 |
| Build Linux | Primer artefacto instalable o `cargo tauri build` en Linux |
| README mínimo | Cómo instalar, cómo configurar `.env`, enlace a `project.md` |

**Criterio de cierre:** la app abre, aplica migraciones en blanco, y sobrevive un cierre y reapertura sin perder la DB.

---

## Release 2 — Biblioteca y catálogo MVP · `v0.2.0`

**Objetivo:** flujo completo *buscar → añadir → ver → editar → listar/filtrar* para los primeros tipos de medio (sin anime ni juegos aún si no entran en el sprint).

| Entregable | Notas |
|------------|--------|
| Esquema `catalog_item` + `library_entry` | Campos y reglas en `project.md` §4, §8 (estado por defecto `planning`, fechas automáticas, puntuación 1–10) |
| Progreso TV según MVP | Una fila por título: `current_season`, `last_episode_watched` (`project.md` §2.4) |
| Cliente TMDB | Búsqueda + detalle + refresco bajo demanda para **películas** y **series TV** |
| **Libros (Open Library)** | Búsqueda, detalle, alta y refresco (incluido en este corte) |
| Entradas **manuales** | `source = manual`: título, notas, imagen local opcional |
| Pantallas | Lista, detalle, edición; filtros por tipo, estado y texto |
| Caché de posters | Bajo `app_data_dir()`; biblioteca usable offline con datos ya cacheados (`project.md` §8 offline) |

**Pospuesto a Release 4 (`v0.4.0`):** campo **`owned`** (quiero / lo tengo) para juegos y libros — ver fila `owned` en la tabla de Release 4.

**Criterio de cierre:** un usuario puede poblar la biblioteca con TMDB, Open Library y manual; editar estados y progreso TV; ver la lista filtrada sin errores en consola en el flujo feliz.

---

## Release 3 — Configuración, exportaciones y estadísticas · `v0.3.0`

**Objetivo:** consolidar preferencias y datos portables con **alto impacto y poco esfuerzo** antes de sumar APIs pesadas (anime/juegos). Aprovecha el esquema y el i18n ya existentes.

> Esta release va **antes** de Release 4 (anime/juegos) porque beneficia al uso actual (película, TV, libro) sin depender de AniList ni IGDB.

| Entregable | Notas |
|------------|--------|
| Pantalla **`/settings`** | Tema claro/oscuro, selector de **idioma UI** (`es` \| `en`, **traducción completa** en `v0.3.0`; persistencia en `localStorage` o `app_meta`), bloque **Datos** |
| **Inicio** sin pie técnico | Quitar de `/` el selector de tema y el estado de DB; Inicio = resumen/biblioteca por estado solamente |
| **Datos** en settings | Ruta y tamaño de `shelfside.db` (solo lectura); **exportar CSV**; **backup** (copiar `.sqlite` a ruta elegida); **exportar Markdown** (destino elegido por el usuario); **reiniciar base** con confirmación fuerte (**borra todo**: tablas SQLite + carpeta `posters/`) |
| Export **Markdown** | El usuario elige carpeta destino (`dialog` Tauri); un `.md` por ítem; frontmatter YAML; cuerpo = `notes` si hay; compatible **Obsidian** y **Joplin** (sin sync bidireccional en v1). Ver `project.md` §8 |
| Export **CSV** | Como en `project.md` §8; columnas documentadas; destino elegido por el usuario |
| Pantalla **`/stats`** (ruta propia) | Conteos por **estado** y por **tipo de medio**; gráficos **simples y livianos** (CSS/HTML). Sin `activity_log` en esta release |
| Navegación | Enlace a `/settings` y `/stats` desde layout o menú principal |
| Pulido UX menor | Errores de export/backup visibles; estados vacíos en stats |

**Criterio de cierre:** el usuario configura tema e idioma (es/en completos), ve dónde están sus datos, exporta CSV y MD a carpetas elegidas, hace backup de la DB, reinicia datos por completo si lo confirma, consulta `/stats` y el Inicio quedó limpio de controles técnicos.

---

## Release 4 — Anime y juegos · `v0.4.0`

**Objetivo:** cubrir el resto del alcance v1 de medios “alta prioridad” del `project.md` §3.

| Entregable | Notas |
|------------|--------|
| Anime (`media_type` anime) | Cliente **AniList GraphQL** como fuente canónica; sin secret para queries públicas |
| Progreso anime | Misma regla que TV: una fila, temporada + último episodio visto |
| Juegos | Cliente **IGDB**; estado de consumo en v1 (`planning`, `in_progress`, etc.) |
| Campo **`owned`** (juegos **y libros**) | Solo `media_type` **juego** y **libro**. Semántica: quiero vs lo tengo; independiente de `status`. Valores en issue (p. ej. `NULL` / `0` / `1`) |
| Claves y límites | TMDB / Twitch+IGDB según `project.md` §8; manejo de rate limit y errores de red |
| Stats / export | Incluir anime y juego en conteos y en export CSV/MD de Release 3 |

**Criterio de cierre:** los cinco tipos v1 (película, TV, anime, juego, libro) tienen camino de búsqueda o creación coherente; manual y exports siguen funcionando.

---

## Release 5 — Portable, Windows y pulido · `v0.5.0`

**Objetivo:** segunda plataforma y uso diario “serio” sin nuevas features de dominio.

| Entregable | Notas |
|------------|--------|
| Build **Windows** | Segunda plataforma después de Linux (`project.md` §1, §7) |
| Empaquetado / releases | Binarios o instrucciones en GitHub Releases sin telemetría |
| Pulido UX | Listas largas, errores de API visibles y recuperables |

**Opcional:** `activity_log` (`project.md` §4.3) para estadísticas históricas; etiquetas/listas; seguimiento episodio a episodio.

**Criterio de cierre:** Windows compila o se documenta el bloqueador; releases publicables sin telemetría.

---

## Release 6 — Calendario y próximos estrenos · `v0.6.0`

**Objetivo:** vista de “qué se estrena / emite” sin multi-cuenta ni servidor propio.

| Entregable | Notas |
|------------|--------|
| TV | Fechas desde **TMDB**; opcional **TVMaze** para horarios más finos (`project.md` §6 Fase 5) |
| Anime | `airingSchedule` u equivalente en **AniList** |
| UI calendario / agenda | Definir alcance mínimo (semana vs mes) en el issue de release |

**Criterio de cierre:** al menos un flujo claro: “próximos N días” o calendario mensual con datos reales para ítems ya en biblioteca o en watchlist si se introduce.

---

## Release 7 — Backlog y expansión · `v0.7.0+`

**Objetivo:** todo lo explícitamente **baja prioridad** o **post–desktop maduro** en `project.md` §6 Fase 6 y §7.

Temas candidatos (no orden estricto; cada uno puede ser su propia versión `v0.7.0`, `v0.8.0`, … o `v1.x`):

- Manga, cómics, juegos de mesa (nuevas fuentes)
- Importaciones masivas (p. ej. Trakt), OAuth, notificaciones
- Import/export JSON más formal si CSV/MD quedan cortos
- Import desde CSV/MD (hoy solo **export** en Release 3 / `v0.3.0`)
- Sync bidireccional con vault Obsidian (campo `external_note_path`)
- **Cliente móvil** u otra superficie: solo cuando el desktop esté estable

---

## Mapa release ↔ versión ↔ fase (`project.md` §6)

| Release | Versión | Fase `project.md` |
|---------|---------|-------------------|
| 1 | `v0.1.0` | Fase 0 |
| 2 | `v0.2.0` | Fase 1 |
| 3 | `v0.3.0` | Fase 2 |
| 4 | `v0.4.0` | Fase 3 |
| 5 | `v0.5.0` | Fase 4 |
| 6 | `v0.6.0` | Fase 5 |
| 7 | `v0.7.0+` | Fase 6 |

---

## Después de `v1.0.0` (orientación)

Cuando el MVP desktop (**releases 1–5**: fundación, biblioteca, config/export/stats, anime/juegos, Windows) esté estable en Linux + Windows, sin telemetría y con documentación de usuario aceptable, etiquetar **`v1.0.0`**.

- Calendario (Release 6 / `v0.6.0`) puede publicarse antes o después de `1.0.0` según prioridad; si va después, etiquetar p. ej. **`v1.1.0`**.
- Expansiones (Release 7): `v1.2.0`, etc.
