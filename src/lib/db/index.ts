export { getDatabase } from "./connection";
export { runMigrations } from "./migrate";
export * from "./types";
export * from "./libraryRules";
export {
  findCatalogBySource,
  getCatalogById,
  insertCatalogItem,
  setPosterLocalPath,
  updateCatalogItem,
  type InsertCatalogInput,
  type SqlDb,
} from "./catalog";
export {
  LIBRARY_LIST_PAGE_SIZE,
  listLibraryWithCatalog,
  listLibraryWithCatalogPage,
  countLibraryWithCatalog,
  getLibraryEntryById,
  insertLibraryEntry,
  addManualToLibrary,
  addTmdbToLibrary,
  addOpenLibraryToLibrary,
  updateLibraryEntry,
  deleteLibraryEntry,
  getLibraryIdForCatalog,
  getTmdbHitsLibraryPresence,
  getOpenLibraryHitsLibraryPresence,
  type LibraryFilters,
  type LibraryListPage,
  type AddManualInput,
  type AddTmdbInput,
  type AddTmdbOptions,
  type AddOpenLibraryInput,
  type UpdateLibraryInput,
  type TmdbHitRef,
  type OpenLibraryHitRef,
} from "./library";
export { countByMediaType, countByStatus, countLibraryEntries } from "./stats";
export type { MediaTypeCount, StatusCount } from "./stats";
export { resetAllUserData } from "./reset";
