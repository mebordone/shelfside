# Roadmap — Shelfside

Documento de **releases ordenadas** para construir el producto. Modelo de datos, APIs, stack y decisiones cerradas están en [`project.md`](./project.md); este archivo solo define **qué entregar en cada corte** y el orden sugerido.

**Convención:** el **número de release** (1, 2, 3…) es la etiqueta de producto; la **versión semver** (`v0.1.0`, `v0.2.0`…) es lo que va en `package.json`, `tauri.conf.json`, tags git y CHANGELOG. **Release N = `v0.N.0`** hasta `1.0.0`.

| Release | Versión | Estado |
|---------|---------|--------|
| 1 — Fundación | `v0.1.0` | Entregado |
| 2 — Biblioteca y catálogo MVP | `v0.2.0` | Entregado |
| 3 — Configuración, exportaciones y estadísticas | `v0.3.0` | Entregado |
| 3.1 — Idioma de catálogo | `v0.3.1` | Entregado |
| 3.2 — Consolidación pre-4.0 | `v0.3.2` | Entregado |
| 4 — Anime y juegos | `v0.4.0` | Planificado |
| 5 — Android (Tauri) y sincronización | `v0.5.0` | Planificado |
| 6 — Calendario y próximos estrenos | `v0.6.0` | Planificado |
| 7 — Backlog y expansión | `v0.7.0+` | Sin versión fija |

Tras el MVP multiplataforma personal (**Linux + Android**, mismo código Tauri): **`v1.0.0`**. Calendario y expansiones posteriores: `v1.1.0`, `v1.2.0`, etc.

**Plataformas:** desarrollo diario en **Linux**; **Android** (APK sideload, sin Play Store) antes que **Windows**; **macOS** solo si surge necesidad (backlog).

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
| Pantalla **`/settings`** | Tema claro/oscuro, selector de **idioma UI** (`es` \| `en`, traducción completa; `localStorage`), bloque **Datos** |
| **Inicio** sin pie técnico | Sin selector de tema ni estado de DB en `/` |
| **Datos** en settings | Ruta y tamaño de `shelfside.db` (solo lectura); **exportar CSV** y **backup** con diálogo «Guardar como…»; **exportar/importar Markdown** vía carpeta sync; **reiniciar base** (zona peligro) |
| Export **Markdown** | Carpeta sync persistida; `library/{slug}-{id}.md`; frontmatter con **`shelfside_id`** y **`updated_at`**; solo upsert (sin propagar borrados). Ver `project.md` §8 |
| **Import / merge** desde carpeta sync (manual) | Last-write-wins por `shelfside_id` + `updated_at`; no elimina entradas locales |
| Setting **carpeta de sincronización** | `localStorage`; Syncthing / Nextcloud |
| Export **CSV** | Diálogo al exportar; columnas en README |
| Pantalla **`/stats`** (ruta propia) | Conteos por **estado** y por **tipo de medio**; gráficos **simples y livianos** (CSS/HTML). Sin `activity_log` en esta release |
| Navegación | Enlace a `/settings` y `/stats` desde layout o menú principal |
| Pulido UX menor | Errores de export/backup visibles; estados vacíos en stats |

**Criterio de cierre:** el usuario configura tema e idioma (es/en completos), ve dónde están sus datos, exporta CSV y MD a carpetas elegidas, importa/merge desde carpeta de sync en desktop, hace backup de la DB, reinicia datos por completo si lo confirma, consulta `/stats` y el Inicio quedó limpio de controles técnicos.

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

## Release 5 — Android (Tauri) y sincronización · `v0.5.0`

**Objetivo:** mismo producto en el celular (uso personal, **software libre**, **sin Play Store**) y biblioteca alineada con el escritorio vía **carpeta compartida** (Syncthing / Nextcloud), sin servidor propio.

| Entregable | Notas |
|------------|--------|
| **Tauri Android** | `tauri android init`, targets en CI o doc de build; APK instalable por sideload (`adb` / archivo) |
| **UI responsive** | Layout usable en pantalla táctil; navegación y formularios adaptados a móvil (mismo Svelte que desktop) |
| **Plugins en Android** | Validar `tauri-plugin-sql`, `fs`, `dialog` en dispositivo; permisos de almacenamiento para carpeta sync |
| **Sync al iniciar** | Al abrir la app: leer `library/*.md` de la carpeta configurada, merge en SQLite local, exportar filas locales más nuevas. Opcional: botón «Sincronizar ahora» y sync al cerrar |
| **Carpeta sync** | Misma semántica que en desktop (R3); ruta típica = carpeta que Syncthing Android ya replica; **no** sincronizar el `.sqlite` vivo entre dispositivos |
| **Documentación** | Prerrequisitos Android SDK/NDK, build APK, flujo PC ↔ Syncthing ↔ celu, disciplina de uso (no editar en dos sitios a la vez) |
| **Pulido UX móvil** | Listas largas, errores de API visibles; estados vacíos |

**Fuera de alcance en esta release:** publicación en Play Store; sync en tiempo real; copiar `shelfside.db` por Syncthing como mecanismo principal.

**Opcional:** detección de archivos `*.sync-conflict`; `activity_log`; etiquetas/listas.

**Criterio de cierre:** APK instala y abre; flujo feliz biblioteca (TMDB / Open Library / manual según releases previos); tras editar en Linux y sincronizar la carpeta, al abrir en Android los cambios aparecen (y viceversa) con merge predecible.

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

**Objetivo:** plataformas y features **post–MVP Linux + Android** en `project.md` §6 Fase 6 y §7.

Temas candidatos (no orden estricto; cada uno puede ser su propia versión `v0.7.0`, `v0.8.0`, … o `v1.x`):

- Build **Windows** (después de Android; ver `project.md` §1)
- **macOS** si surge necesidad
- Manga, cómics, juegos de mesa (nuevas fuentes)
- Importaciones masivas (p. ej. Trakt), OAuth, notificaciones
- Import/export JSON más formal si CSV/MD quedan cortos
- Sync bidireccional con vault Obsidian (campo `external_note_path`)
- Sync al iniciar en segundo plano / resolución avanzada de conflictos
- Empaquetado / releases GitHub ampliado (artefactos Windows, etc.)

---

## Mapa release ↔ versión ↔ fase (`project.md` §6)

| Release | Versión | Fase `project.md` |
|---------|---------|-------------------|
| 1 | `v0.1.0` | Fase 0 |
| 2 | `v0.2.0` | Fase 1 |
| 3 | `v0.3.0` | Fase 2 |
| 4 | `v0.4.0` | Fase 3 |
| 5 | `v0.5.0` | Fase 4 (Android + sync) |
| 6 | `v0.6.0` | Fase 5 |
| 7 | `v0.7.0+` | Fase 6 |

---

## Después de `v1.0.0` (orientación)

Cuando el MVP personal (**releases 1–5**: fundación, biblioteca, config/export/sync, anime/juegos, **Android** con carpeta compartida) esté estable en **Linux + Android**, sin telemetría y con documentación de usuario aceptable, etiquetar **`v1.0.0`**.

- Calendario (Release 6 / `v0.6.0`) puede publicarse antes o después de `1.0.0` según prioridad; si va después, etiquetar p. ej. **`v1.1.0`**.
- **Windows** y demás temas del Release 7: `v1.2.0`, etc., según prioridad.
