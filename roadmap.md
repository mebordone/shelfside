# Roadmap — Shelfside

Documento de **releases ordenadas** para construir el producto. Modelo de datos, APIs, stack y decisiones cerradas están en [`project.md`](./project.md); este archivo solo define **qué entregar en cada corte** y el orden sugerido.

**Convención:** el **número de release** (1, 2, 3…) es la etiqueta de producto; la **versión semver** (`v0.1.0`, `v0.2.0`…) es lo que va en `package.json`, `tauri.conf.json`, tags git y CHANGELOG. **Release N = `v0.N.0`** hasta `1.0.0`, salvo cortes intermedios documentados (p. ej. Release 4 = `v0.4.0` … `v0.4.6`).

| Release | Versión | Estado |
|---------|---------|--------|
| 1 — Fundación | `v0.1.0` | Entregado |
| 2 — Biblioteca y catálogo MVP | `v0.2.0` | Entregado |
| 3 — Configuración, exportaciones y estadísticas | `v0.3.0` | Entregado |
| 3.1 — Idioma de catálogo | `v0.3.1` | Entregado |
| 3.2 — Consolidación pre-4.0 | `v0.3.2` | Entregado |
| 3.3 — Sync Markdown entre escritorios | `v0.3.3` | Entregado |
| 4 — Android (Tauri) y sincronización | `v0.4.0`–`v0.4.6` | **Entregado (`v0.4.6`)** |
| 5 — Anime y juegos | `v0.5.0` | Planificado |
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

**Pospuesto a Release 5 (`v0.5.0`):** campo **`owned`** (quiero / lo tengo) para juegos y libros — ver fila `owned` en la tabla de Release 5.

**Criterio de cierre:** un usuario puede poblar la biblioteca con TMDB, Open Library y manual; editar estados y progreso TV; ver la lista filtrada sin errores en consola en el flujo feliz.

---

## Release 3 — Configuración, exportaciones y estadísticas · `v0.3.0`

**Objetivo:** consolidar preferencias y datos portables con **alto impacto y poco esfuerzo** antes de sumar APIs pesadas (anime/juegos). Aprovecha el esquema y el i18n ya existentes.

> Esta release va **antes** de Release 4 (Android) y Release 5 (anime/juegos) porque beneficia al uso actual (película, TV, libro) sin depender del port móvil ni de AniList/IGDB.

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

> El contrato Markdown/CSV de R3 evoluciona en **Release 3.3** (campos de progreso, merge por contenido, identidad por catálogo). Ver sección siguiente.

---

## Release 3.3 — Sync Markdown entre escritorios · `v0.3.3`

> **Nota (v0.4.1+):** el **rol de sync** del Markdown queda **superado** por el **CSV** (ver «Cambio de protocolo de sync/backup» en Release 4). Lo entregado en R3.3 sigue siendo válido y es la base del motor LWW/merge/tombstones que se **porta** a CSV; el Markdown pasa a **export de solo lectura** (Obsidian/Joplin). Esta sección se conserva como registro histórico del diseño del merge.

**Objetivo:** usar **dos instancias desktop** (y luego Android en R4) con la misma carpeta Syncthing/Nextcloud, sin duplicar obras de catálogo ni depender de recordar export/import por separado.

**Transporte:** Syncthing (o copia manual de carpeta); Shelfside **no** replica `shelfside.db` vivo. Protocolo (histórico): `library/{slug}-{id}.md` + frontmatter YAML; desde v0.4.1 el mismo modelo de merge opera sobre un **CSV**.

### Base ya cubierta (`v0.3.2` y trabajo en curso)

| Tema | Estado |
|------|--------|
| Permisos Tauri `fs` (mkdir, escritura, rutas canónicas p. ej. `/mnt/datos` si `Descargas` es symlink) | Hecho |
| Export reexporta `.md` existentes; import tolera carpeta `library/` ya creada | Hecho |
| Frontmatter + CSV: `progress_current`, `progress_total`, `owned` | Hecho |
| Merge: LWW por `updated_at`; si empata timestamp pero cambia contenido (p. ej. notas en el `.md`) → actualizar | Hecho |
| Logs de ejecución copiables desde Ajustes | Hecho |

### Fase A — Sync confiable entre dos PCs (**ahora**, bloqueante para uso real)

| Id | Entregable | Notas |
|----|------------|--------|
| A1 | **Merge por catálogo** | Resolver obra por `(source, external_id, media_type)`; si ya hay `library_entry` para ese catálogo, **actualizar esa fila** aunque el `shelfside_id` del `.md` difiera. Evita duplicados TMDB/Open Library entre PCs. Mantener compatibilidad con `.md` viejos. |
| A2 | Botón **«Sincronizar carpeta»** | Un paso: importar/merge desde `library/*.md` + exportar lo local (orden y política documentados en UI). Reemplaza el ritual export → esperar Syncthing → import para el día a día. |
| A3 | **UX y mensajes** | Texto breve en Ajustes (flujo recomendado, sin borrados automáticos, manuales como caso especial). Resumen legible tras sync (actualizados / nuevos / sin cambios / errores), no solo `(+0 ~0 ⊘61)`. |

**Criterio de cierre Fase A:** la misma película/serie/libro de catálogo añadida en dos PCs converge en **una** entrada tras sincronizar; editar notas en app o en el `.md` se refleja en el otro PC con un solo botón; Syncthing solo mueve archivos.

### Fase B — Completitud sync desktop

#### B — **Ahora** (después de A estable; no bloquea R4 Android)

| Id | Entregable | Notas |
|----|------------|--------|
| B1 | **`external_id` estable para manuales nuevos** | **Hecho en `v0.4.0`.** UUID al crear manual en `addManualToLibrary`; export MD + merge por catálogo. Manuales **anteriores** a v0.4.0 pueden tener `external_id` no-UUID: reexportar o alinear a mano antes de confiar en sync multi-dispositivo. |
| B2 | **Tests de regresión** | Merge por catálogo; roundtrip export → import con TMDB/OL y manual; `.md` sin campos nuevos de progreso/owned. |

#### B — **Después** (issue aparte; no mezclar en el mismo PR que A1)

| Id | Entregable | Notas |
|----|------------|--------|
| B3a | **Tombstones / papelera sync** | Al quitar de biblioteca: si hay carpeta sync, escribir el mismo `library/{slug}-{id}.md` con `deleted: true` y `deleted_at` (más claves de catálogo para merge A1) **antes** de borrar la fila local; luego borrar en SQLite como hoy. Import: si tombstone gana LWW (`deleted_at` vs `updated_at`) → `deleteLibraryEntry` en el otro dispositivo. El export masivo **no** genera tombstones (la fila ya no existe). **No** borrar el `.md` en Syncthing al borrar en app — el archivo es la papelera hasta limpiar (B3b). Cambia semántica respecto a «sin borrados» (A3/README); documentar conflicto LWW (edición posterior vs borrado). |
| B3b | **Limpiar papelera de sync** | Botón en Ajustes: eliminar del disco los `.md` con `deleted: true` **solo** si en **este** dispositivo ya no hay entrada (por `shelfside_id` o catálogo A1). Resumen previo (cuántos se borran / cuántos se omiten por entrada local aún presente). Confirmación + aviso: hacerlo cuando **todos** los dispositivos ya sincronizaron los borrados; si no, otro PC puede conservar la fila sin haber visto el tombstone. Fuera de alcance v1: restaurar desde tombstone en UI. |
| B4 | Aviso **`*.sync-conflict`** | Detectar archivos de conflicto Syncthing en la carpeta sync y mostrar aviso (no merge automático). |
| B5 | Renombrar archivos por clave de catálogo (opcional) | p. ej. incluir `external_id` en el nombre; solo si A1 no alcanza para evitar dos `.md` de la misma obra en disco. **Pospuesto** mientras import dedupe por catálogo. |

**Fuera de alcance en 3.3:** sync en tiempo real; import bidireccional desde CSV (**se retoma como canal principal en `v0.4.1`**); replicar SQLite por la carpeta sync.

**Criterio de cierre Release 3.3:** Fase A cerrada; B2 hecho o pospuesto; B1 pasa a **`v0.4.0`**; B3a–B5 en backlog documentado (tabla «Después» arriba o Release 7).

---

## Release 4 — Android (Tauri) y sincronización · `v0.4.0`–`v0.4.6`

**Objetivo:** mismo producto en el celular (uso personal, **software libre**, **sin Play Store**) y biblioteca alineada con el escritorio vía **carpeta compartida** (Syncthing / Nextcloud), sin servidor propio. **Paridad funcional** con desktop en las pantallas ya existentes (no anime/juegos hasta Release 5).

### Cambio de protocolo de sync/backup (desde `v0.4.1`)

**Decisión (reemplaza el rol de sync del Markdown definido en R3.3):**

| Artefacto | Rol desde `v0.4.1` |
|-----------|--------------------|
| **CSV** (un archivo, p. ej. `shelfside.csv` en la carpeta sync) | **Canal de sincronización y backup** máquina ↔ máquina. Merge **LWW** por fila; identidad por catálogo (`source`+`external_id`+`media_type`) y manuales por `external_id` UUID (B1). Tombstones = columna `deleted` / `deleted_at`. **Shelfside es el único que escribe** este archivo (el usuario no lo edita a mano salvo emergencia). |
| **Markdown** (`library/*.md`) | **Export de solo lectura** para Obsidian / Joplin. One-way; opcional «Importar Markdown» **puntual** (migración), **no** canal de sync automático. |
| **`.sqlite`** | **Backup catastrófico local** (copia fiel de la DB); no es artefacto multi-dispositivo. |

**Motivación:** un solo archivo simplifica el sync en Android (path a archivo vs `readDir` de carpeta), reduce conflictos Syncthing por-ítem y separa audiencias (sync de datos ≠ vault Obsidian). **Contra asumido:** cualquier cambio reescribe el CSV completo y un conflicto Syncthing afecta todo el archivo → disciplina de orden (sync app → esperar Syncthing → sync en el otro dispositivo) y LWW por fila al re-importar.

**Impacto:** el motor LWW / merge por catálogo / tombstones de `src/lib/sync/` se **porta** de filas Markdown a filas CSV; `src/lib/export/markdown.ts` queda como export (y opcional import de migración). Ver §8 de [`project.md`](./project.md).

**Dependencias:** lógica de merge (LWW, identidad por catálogo, tombstones) cerrada en **Release 3.3** (Fase A / B3). No reimplementar el merge en Android: reutilizar `src/lib/sync/` portándolo al formato CSV.

**Decisiones de producto (cerradas):**

| Tema | Decisión |
|------|----------|
| Alcance | **Paridad** con desktop (biblioteca, búsqueda, manual, stats, settings, export/backup donde el SO lo permita) |
| Formato sync/backup | **CSV** (un archivo) como canal de sync y backup; **Markdown** pasa a export solo lectura (Obsidian). Ver «Cambio de protocolo» arriba |
| Sync al abrir | **Automático** tras migraciones si hay carpeta sync; **toast** con resumen (`formatSyncSummary`); toggle en Ajustes para desactivar y usar solo sync manual |
| Carpeta sync | **Elegir carpeta** (diálogo) **y** editar ruta **escribiendo** con validación (existencia / lectura del CSV o creación); misma UX en desktop y Android |
| Navegación móvil | **Barra inferior** (Inicio · Biblioteca · Buscar · Más); «Más» agrupa Ajustes, Estadísticas y Alta manual; nav superior solo en viewport ancho (desktop) |
| Manuales multi-dispositivo | **B1** — UUID `external_id` al crear manual (antes o en el primer corte de R4) |
| Entorno | Host Linux **sin** SDK Android hoy → **`v0.4.0`** documenta instalación; APK **arm64** para **dispositivo físico** (sideload / `adb`) |

**Fuera de alcance en Release 4:** Play Store; sync en tiempo real; replicar `shelfside.db` por Syncthing; búsqueda/alta de **anime** y **juegos** (Release 5 — las filas CSV existentes sí se importan).

**Opcional si no entró en 3.3:** B4 `*.sync-conflict`; `activity_log`; etiquetas/listas.

**Criterio de cierre Release 4 (tag `v0.4.6`):** APK release instala en celular físico; paridad de flujos; sync manual y automático (con toggle) **sobre CSV**; carpeta sync por diálogo o texto validado; roundtrip PC ↔ Syncthing ↔ Android (CSV) verificado y documentado; export Markdown para Obsidian sigue disponible. Pulido posterior: `v0.4.7` (madurez UX), `v0.4.8` (sync/posters/related libros); post-`0.4.8` Unreleased: related diversificado + «Ya en la biblioteca» en búsqueda.

---

### Micro-releases (orden de implementación)

Cada fila = un tag semver sugerido; un PR/issue por micro-release cuando sea posible.

#### `v0.4.0` — Preparación host + B1 manuales

| Id | Entregable | Notas |
|----|------------|--------|
| 4.0a | **B1 `external_id` UUID** | **Hecho:** `addManualToLibrary` + tests; manuales viejos: reexportar o alinear a mano |
| 4.0b | **Documentación toolchain Android** | **Hecho:** README checklist Linux + JDK/SDK/NDK/`adb` |
| 4.0c | **`tauri android init`** | **Hecho:** `gen/android/`, scripts npm, capabilities desktop/móvil |
| 4.0d | **Primer run en dispositivo** | **Hecho (build):** APK debug universal generado; instalar con `adb install -r …/app-universal-debug.apk` (celu USB antes de `tauri:android:dev`) |

**Cierre `v0.4.0`:** tenés SDK instalado según doc; manual nuevo lleva UUID; Shelfside arranca en el celu (aunque aún sin sync ni UI móvil pulida). **Validado en dispositivo físico** (Samsung SM-G525F, Android 14): Inicio/Biblioteca OK; APK debug instalado vía `adb`.

**QA Android (post-instalación, anotado para siguientes cortes):**

| Observación | Severidad | Micro-release |
|-------------|-----------|---------------|
| Transiciones lentas la primera vez (cold start SQLite + bundle) | Baja | Mejorar en 4.3+ si persiste |
| **Seleccionar carpeta sync** → `Folder picker is not implemented on mobile` | Esperado | **v0.4.1** (campo texto + permisos `fs`) |
| **Export CSV** → aviso «tab inactive» en PC; selector sí abre en celu y descarga OK | Cosmética | Revisar UX diálogos móvil en 4.1 |
| **TMDB posters** en Buscar → CORS desde `http://tauri.localhost` hacia `image.tmdb.org` | Media | **v0.4.1** o 4.4 (descargar poster local como desktop) |
| Manual **sin notas** no apareció; **con notas** sí (reproducir / investigar) | Media | Verificar en 4.1 |

---

#### `v0.4.1` — Sync CSV + carpeta sync + plugins FS

**Cambio de formato:** el sync pasa de `library/*.md` a **un archivo CSV** (ver «Cambio de protocolo» al inicio de Release 4). El Markdown queda como export solo lectura.

| Id | Entregable | Notas |
|----|------------|--------|
| 4.1a | **Motor de merge sobre CSV** | **Hecho:** `parseCsv` / `mergeFromCsv` / `exportToSyncCsv` / tombstones / clean + tests |
| 4.1b | **Permisos `fs` / `dialog` Android** | **Hecho:** scopes Syncthing + `plugin-http` posters TMDB |
| 4.1c | **Carpeta/archivo sync: elegir + escribir** | **Hecho:** campo texto + validación + auto-`shelfside/`; en Android sin picker (ruta precargada + permiso archivos) |
| 4.1d | **Sync manual en Android** | **Hecho:** botón Sync → CSV; resumen `formatSyncSummary`; roundtrip PC↔Syncthing↔S23 |
| 4.1e | **Markdown = export** | **Hecho:** export/import MD desacoplados del sync |

**Cierre `v0.4.1`:** en el celu podés fijar la carpeta Syncthing y sincronizar a mano contra el **CSV** con el mismo merge que en Linux; el export Markdown sigue disponible para Obsidian. **Verificado en dispositivo** (Samsung S23, sync manual CSV).

---

#### `v0.4.2` — Sync automático al abrir + toggle ✅

| Id | Entregable | Notas |
|----|------------|--------|
| 4.2a | **Sync al iniciar** | ✅ Tras `runMigrations` en layout: si hay carpeta sync y toggle activo → sync del CSV (UI lista; sync en background) |
| 4.2b | **Banner de resultado** | ✅ Éxito/error con `formatSyncSummary` bajo el nav; errores fs no silenciosos |
| 4.2c | **Ajustes: «Sincronizar al abrir»** | ✅ `shelfside-sync-on-start`; default **on** si ya hay carpeta; off = solo sync manual |
| 4.2d | **Paridad desktop** | ✅ Misma lógica en Linux y Android |

**Cierre `v0.4.2`:** abrís la app y, si está habilitado, sincroniza y avisa con banner; podés desactivarlo en Ajustes.

---

#### `v0.4.3` — Shell móvil (navegación + responsive base) ✅

| Id | Entregable | Notas |
|----|------------|--------|
| 4.3a | **Detección viewport / plataforma** | ✅ Store `isMobileLayout` (`matchMedia` ≤767px + Android) |
| 4.3b | **Bottom navigation** | ✅ 4 tabs: Inicio, Biblioteca, Buscar, Más; safe-area |
| 4.3c | **Hoja «Más»** | ✅ Links a Ajustes, Estadísticas, Alta manual; desktop sin bottom bar |
| 4.3d | **Targets táctiles** | ✅ Mín. ~44px en tabs y CTAs primarios (`.shelf-touch` / `.shelf-btn-primary`) |

**Cierre `v0.4.3`:** la app se siente nativa en el teléfono; desktop sin regresiones de layout.

---

#### `v0.4.4` — Paridad: biblioteca y detalle (+ UX Inicio) ✅

| Id | Entregable | Notas |
|----|------------|--------|
| 4.4a | **Lista biblioteca** | ✅ Filtros, fila tappable, empties + CTAs, paginación táctil |
| 4.4b | **Detalle y edición** | ✅ Acciones touch; progreso libro; footer sticky en edit |
| 4.4c | **Inicio** | ✅ Carrusel horizontal; aire; empty por sección |
| 4.4d | **Shell** | ✅ Indicador tab activo; sin header en Inicio |
| 4.4e | **Long-press en cards** | ✅ Sheet edición rápida (status + TV) en Inicio y biblioteca |

**Cierre `v0.4.4`:** día a día podés consultar y editar la biblioteca solo desde el celu; Inicio más cómodo en pantalla chica.

*(Nota: pulido básico de Inicio — marca, chips, títulos, progreso TV — ya entregado en `v0.4.3`.)*

---

#### `v0.4.5` — Paridad: búsqueda, manual, stats, datos ✅

| Id | Entregable | Notas |
|----|------------|--------|
| 4.5a | **Búsqueda TMDB + Open Library** | ✅ Teclado, targets, detalle full-width móvil |
| 4.5b | **Alta manual** | ✅ Sticky Guardar, touch, mensaje imagen Android |
| 4.5c | **`/stats`** | ✅ Barras legibles + empty CTAs |
| 4.5d | **Export Markdown / backup DB** | ✅ Permisos, fallback Descargas, i18n path |

**Cierre `v0.4.5`:** paridad funcional con desktop (salvo anime/juegos).

---

#### `0.4.5-ux.1` — Acciones rápidas y pulido móvil ✅

> Corte UX móvil de la línea **0.4.5** (plan «v0.4.5.1»). Paquete semver `0.4.5-ux.1`.

| Id | Entregable | Notas |
|----|------------|--------|
| 4.5.1a | **Detalle tocable** | ✅ Estado, temporada/episodio, progreso libro |
| 4.5.1b | **Menú `…` en listas** | ✅ Inicio + Biblioteca (+ long-press) |
| 4.5.1c | **Filtros compactos** | ✅ «Todos» + chips densos |

**Cierre `0.4.5-ux.1`:** actualizar progreso/estado en uno o dos toques sin el formulario completo.

---

#### `v0.4.6` — Cierre Release 4 (APK release + doc + pulido) ✅

| Id | Entregable | Notas |
|----|------------|--------|
| 4.6a | **APK release** | ✅ APK debug sideload en dispositivo físico (`adb install`) |
| 4.6b | **Guía PC ↔ Syncthing ↔ celu** | ✅ README: CSV, orden sync, tombstones, Markdown export |
| 4.6c | **Pulido** | ✅ Errores API visibles; sync al abrir no bloquea; tests tombstone CSV |
| 4.6d | **CHANGELOG + versión** | ✅ `0.4.6` |

**Cierre `v0.4.6`:** Release 4 lista para uso personal Linux + Android. Descargas: [GitHub Releases v0.4.6](https://github.com/mebordone/shelfside/releases/tag/v0.4.6).

#### `v0.4.7` — Madurez R4 (UX + robustez) ✅

| Id | Entregable | Notas |
|----|------------|--------|
| 4.7a | **Inicio** | ✅ Header Shelfside siempre visible + toggle carrusel/grilla + bloque Continuar |
| 4.7b | **Biblioteca** | ✅ Toggle lista/grilla + filtros tipo/estado recordados |
| 4.7c | **Sync/robustez** | ✅ Última sync en Ajustes; retry en búsqueda/sugerencias; vacíos más claros |
| 4.7d | **UX previa** | ✅ Limpiar/derivar búsqueda, categorías en grilla, «Ver más», recomendados clicables |
| 4.7e | **CHANGELOG + versión** | ✅ `0.4.7` |

#### `v0.4.8` — Sync silencioso, posters offline, related libros ✅

| Id | Entregable | Notas |
|----|------------|--------|
| 4.8a | **Sync CSV** | ✅ No reescribir si el contenido es idéntico; resumen «ya estaba al día» |
| 4.8b | **UX sync** | ✅ Arranque sin cartel; última sync con fecha/hora en Ajustes |
| 4.8c | **Posters** | ✅ Backfill local tras sync (ítems sin `poster_local_path`) |
| 4.8d | **Related libros** | ✅ Serie/autor/subjects rankeados; menos consultas OL |
| 4.8e | **CHANGELOG + versión** | ✅ `0.4.8` |

#### Post-`v0.4.8` (Unreleased) — related diversificado + presence en búsqueda

| Id | Entregable | Notas |
|----|------------|--------|
| 4.8f | **Related OL v2** | ✅ Allowlist de themes, género siempre, cuotas min. temáticos, sparse discovery |
| 4.8g | **Búsqueda → biblioteca** | ✅ «Ya en la biblioteca» en resultados (presence batch) |

---

### Mapa rápido versión ↔ tema

| Versión | Foco |
|---------|------|
| `v0.4.0` | Toolchain, B1 UUID, primer APK |
| `v0.4.1` | Sync CSV + carpeta sync + sync manual (MD → export) |
| `v0.4.2` | Sync al abrir + toast + toggle |
| `v0.4.3` | Bottom nav + responsive shell + pulido Inicio básico + ELF 16 KB |
| `v0.4.4` | Biblioteca + detalle + UX Inicio (carrusel, shell, long-press) ✅ |
| `v0.4.5` | Búsqueda + manual + stats + export ✅ |
| `0.4.5-ux.1` | Acciones rápidas (estado/progreso) + filtros ✅ |
| `v0.4.6` | APK release + documentación + cierre R4 ✅ |
| `v0.4.7` | Madurez R4: UX Inicio/Biblioteca + última sync + retry ✅ |
| `v0.4.8` | Sync sin rewrite inútil + posters backfill + related OL ✅ |

---

## Release 5 — Anime y juegos · `v0.5.0`

**Objetivo:** cubrir el resto del alcance v1 de medios “alta prioridad” del `project.md` §3 (en desktop; en Android vía sync de `.md`).

| Entregable | Notas |
|------------|--------|
| Anime (`media_type` anime) | Cliente **AniList GraphQL** como fuente canónica; sin secret para queries públicas |
| Progreso anime | Misma regla que TV: una fila, temporada + último episodio visto |
| Juegos | Cliente **IGDB**; estado de consumo en v1 (`planning`, `in_progress`, etc.) |
| Campo **`owned`** (juegos **y libros**) | Solo `media_type` **juego** y **libro**. Semántica: quiero vs lo tengo; independiente de `status`. Valores en issue (p. ej. `NULL` / `0` / `1`) |
| Claves y límites | TMDB / Twitch+IGDB según `project.md` §8; manejo de rate limit y errores de red |
| Stats / export | Incluir anime y juego en conteos y en export CSV/MD de Release 3 |

**Criterio de cierre:** los cinco tipos v1 (película, TV, anime, juego, libro) tienen camino de búsqueda o creación coherente en desktop; manual y exports siguen funcionando; entradas nuevas llegan al celu por carpeta sync si R4 ya está desplegado.

---

## Release 6 — Calendario y próximos estrenos · `v0.6.0`

**Objetivo:** vista de “qué se estrena / emite” sin multi-cuenta ni servidor propio.

**Dependencia:** calendario **anime** requiere cliente AniList de **Release 5**.

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
- Sync al iniciar en segundo plano / resolución avanzada de conflictos (tombstones B3a–B3b, conflictos Syncthing B4 si no salieron en 3.3)
- Empaquetado / releases GitHub ampliado (artefactos Windows, etc.)

---

## Mapa release ↔ versión ↔ fase (`project.md` §6)

| Release | Versión | Fase `project.md` |
|---------|---------|-------------------|
| 1 | `v0.1.0` | Fase 0 |
| 2 | `v0.2.0` | Fase 1 |
| 3 | `v0.3.0` | Fase 2 |
| 3.3 | `v0.3.3` | Fase 2b (sync desktop: A + B-ahora) |
| 4 | `v0.4.0`–`v0.4.6` | Fase 3 (Android — sync multiplataforma) |
| 5 | `v0.5.0` | Fase 4 (anime y juegos) |
| 6 | `v0.6.0` | Fase 5 |
| 7 | `v0.7.0+` | Fase 6 |

---

## Después de `v1.0.0` (orientación)

Cuando el MVP personal (**releases 1–5**: fundación, biblioteca, config/export/sync, **Android** con carpeta compartida, anime/juegos) esté estable en **Linux + Android**, sin telemetría y con documentación de usuario aceptable, etiquetar **`v1.0.0`**.

- Calendario (Release 6 / `v0.6.0`) puede publicarse antes o después de `1.0.0` según prioridad; si va después, etiquetar p. ej. **`v1.1.0`**.
- **Windows** y demás temas del Release 7: `v1.2.0`, etc., según prioridad.
