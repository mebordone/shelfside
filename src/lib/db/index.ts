export { getDatabase } from "./connection";
export { runMigrations } from "./migrate";
export * from "./types";
export * from "./libraryRules";
export {
  findCatalogBySource,
  getCatalogById,
  insertCatalogItem,
  updateCatalogItem,
  type InsertCatalogInput,
  type SqlDb,
} from "./catalog";
export {
  listLibraryWithCatalog,
  getLibraryEntryById,
  insertLibraryEntry,
  addManualToLibrary,
  addTmdbToLibrary,
  updateLibraryEntry,
  getLibraryIdForCatalog,
  getTmdbHitsLibraryPresence,
  type LibraryFilters,
  type AddManualInput,
  type AddTmdbInput,
  type AddTmdbOptions,
  type UpdateLibraryInput,
  type TmdbHitRef,
} from "./library";
