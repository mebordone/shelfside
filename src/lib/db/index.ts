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
  type LibraryFilters,
  type AddManualInput,
  type AddTmdbInput,
  type UpdateLibraryInput,
} from "./library";
