import Database from "@tauri-apps/plugin-sql";

let dbPromise: Promise<Database> | null = null;

/** SQLite bajo el directorio de datos de la app (BaseDirectory::App). Ver plugin-sql. */
export function getDatabase(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load("sqlite:shelfside.db");
  }
  return dbPromise;
}
