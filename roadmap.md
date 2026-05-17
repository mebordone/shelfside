# Roadmap — Shelfside

Documento de **releases ordenadas** para construir el producto. Modelo de datos, APIs, stack y decisiones cerradas están en [`project.md`](./project.md); este archivo solo define **qué entregar en cada corte** y el orden sugerido.

**Convención de versiones:** `0.x` hasta estabilizar el MVP desktop; luego `1.x` cuando el flujo principal esté probado en Linux y documentado para usuarios.

---

## Release 0 — Fundación (`0.1.0`)

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

## Release 1 — Biblioteca y catálogo MVP (`0.2.0`)

**Objetivo:** flujo completo *buscar → añadir → ver → editar → listar/filtrar* para los primeros tipos de medio (sin anime ni juegos aún si no entran en el sprint).

| Entregable | Notas |
|------------|--------|
| Esquema `catalog_item` + `library_entry` | Campos y reglas en `project.md` §4, §8 (estado por defecto `planning`, fechas automáticas, puntuación 1–10) |
| Progreso TV según MVP | Una fila por título: `current_season`, `last_episode_watched` (`project.md` §2.4) |
| Cliente TMDB | Búsqueda + detalle + refresco bajo demanda para **películas** y **series TV** (un solo proveedor reduce fricción) |
| Entradas **manuales** | `source = manual`: título, notas, imagen local opcional |
| Pantallas | Lista, detalle, edición; filtros por tipo, estado y texto |
| Caché de posters | Bajo `app_data_dir()`; biblioteca usable offline con datos ya cacheados (`project.md` §8 offline) |

**Opcional en el mismo release si hay capacidad:** libros con **Open Library** (segunda API; ver orden alternativo en `project.md` §6 Fase 1). Libros en R1 usan `status` y metadatos; el campo **`owned`** (quiero / lo tengo) queda para **R2** junto con juegos (ver fila `owned` en la tabla de R2).

**Criterio de cierre:** un usuario puede poblar la biblioteca solo con TMDB + manual, editar estados y progreso TV, y ver la lista filtrada sin errores en consola en el flujo feliz.

---

## Release 2 — Anime y juegos (`0.3.0`)

**Objetivo:** cubrir el resto del alcance v1 de medios “alta prioridad” del `project.md` §3.

| Entregable | Notas |
|------------|--------|
| Anime (`media_type` anime) | Cliente **AniList GraphQL** como fuente canónica; sin secret para queries públicas |
| Progreso anime | Misma regla que TV: una fila, temporada + último episodio visto |
| Juegos | Cliente **IGDB**; estado de consumo en v1 (`planning`, `in_progress`, etc.) |
| Campo **`owned`** (juegos **y libros**) | Hoy la columna existe en `library_entry` pero no se escribe ni se muestra. Al implementarlo: **solo** `media_type` **juego** y **libro**. Semántica tipo Steam: marcar si **lo quiero** (wishlist / aún no lo tengo) vs **lo tengo** (físico o digital en mi biblioteca). Es independiente de `status` (si lo leí/jugué o no). UI en detalle y edición; persistencia en alta y `updateLibraryEntry`. Definir valores concretos en el issue (p. ej. `NULL` = sin marcar, `0` = quiero, `1` = tengo). |
| Claves y límites | TMDB / Twitch+IGDB según `project.md` §8; manejo de rate limit y errores de red |

**Criterio de cierre:** los cinco tipos v1 (película, TV, anime, juego, libro si ya estaba en R1) tienen camino de búsqueda o creación coherente con la especificación; manual sigue funcionando.

---

## Release 3 — Portable y pulido (`0.4.0`)

**Objetivo:** datos exportables y app lista para uso diario “serio”.

| Entregable | Notas |
|------------|--------|
| Export **CSV** | Decisión mínima v1 (`project.md` §8); columnas documentadas en README o en la propia exportación |
| Pulido UX | Listas largas, estados vacíos, errores de API visibles y recuperables |
| Build **Windows** | Segunda plataforma después de Linux (`project.md` §1, §7) |
| Empaquetado / releases | Binarios o instrucciones en GitHub Releases sin telemetría |

**Opcional:** `activity_log` (`project.md` §4.3); etiquetas/listas; seguimiento episodio a episodio — solo si se prioriza explícitamente.

**Criterio de cierre:** un usuario puede respaldar datos vía CSV y/o copia de DB; Windows compila o se documenta el bloqueador si falta hardware CI.

---

## Release 4 — Calendario y próximos estrenos (`0.5.0`)

**Objetivo:** vista de “qué se estrena / emite” sin multi-cuenta ni servidor propio.

| Entregable | Notas |
|------------|--------|
| TV | Fechas desde **TMDB**; opcional **TVMaze** para horarios más finos (`project.md` §6 Fase 4) |
| Anime | `airingSchedule` u equivalente en **AniList** |
| UI calendario / agenda | Definir alcance mínimo (semana vs mes) en el issue de release |

**Criterio de cierre:** al menos un flujo claro: “próximos N días” o calendario mensual con datos reales para ítems ya en biblioteca o en watchlist si se introduce.

---

## Release 5 — Backlog y expansión (versionado según prioridad)

**Objetivo:** todo lo explícitamente **baja prioridad** o **post–desktop maduro** en `project.md` §6 Fase 5 y §7.

Temas candidatos (no orden estricto; cada uno puede ser su propia versión `0.6`, `0.7`, …):

- Manga, cómics, juegos de mesa (nuevas fuentes)
- Importaciones masivas (p. ej. Trakt), OAuth, notificaciones
- Import/export JSON más formal si CSV quedó corto
- **Cliente móvil** u otra superficie: solo cuando el desktop esté estable

---

## Mapa rápido release → fase en `project.md`

| Release | Fase `project.md` §6 |
|---------|----------------------|
| 0 | Fase 0 |
| 1 | Fase 1 |
| 2 | Fase 2 |
| 3 | Fase 3 (+ empaquetado Fase 0 Windows) |
| 4 | Fase 4 |
| 5 | Fase 5 |

---

## Después de `1.0.0` (orientación)

Cuando el MVP desktop (releases 0–3 como mínimo) esté estable en Linux + Windows, sin telemetría y con documentación de usuario aceptable, etiquetar **`1.0.0`**. Calendario (R4) y expansiones (R5) pueden ser `1.1`, `1.2`, etc., según prioridad del mantenedor.
