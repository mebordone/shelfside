import { getDatabase } from "./connection";

const modules = import.meta.glob<string>("../../../migrations/*.sql", {
  eager: true,
  query: "?raw",
  import: "default",
});

function sortedMigrationPaths(): string[] {
  return Object.keys(modules).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function fileNameFromPath(path: string): string {
  const seg = path.split("/");
  return seg[seg.length - 1] ?? path;
}

function stripLeadingLineComments(block: string): string {
  return block
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (t.startsWith("--")) return "";
      return line;
    })
    .join("\n")
    .trim();
}

/** Parte un archivo .sql en sentencias; quita líneas `--` de comentario sin tirar el CREATE. */
export function splitStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((s) => stripLeadingLineComments(s))
    .filter((s) => s.length > 0);
}

async function isApplied(db: Awaited<ReturnType<typeof getDatabase>>, name: string): Promise<boolean> {
  try {
    const rows = await db.select<{ c: number }[]>(
      "SELECT COUNT(*) as c FROM migrations WHERE name = $1",
      [name],
    );
    return (rows[0]?.c ?? 0) > 0;
  } catch {
    return false;
  }
}

/** Aplica migraciones pendientes en orden. Idempotente. */
export async function runMigrations(): Promise<void> {
  const paths = sortedMigrationPaths();
  if (paths.length === 0) {
    throw new Error(
      "No hay archivos SQL en migrations/. ¿import.meta.glob no resolvió la carpeta? Revisá rutas y el build.",
    );
  }

  const db = await getDatabase();

  for (const path of sortedMigrationPaths()) {
    const name = fileNameFromPath(path);
    if (await isApplied(db, name)) continue;

    const raw = modules[path];
    if (typeof raw !== "string") continue;

    for (const stmt of splitStatements(raw)) {
      await db.execute(stmt);
    }

    await db.execute("INSERT INTO migrations (name) VALUES ($1)", [name]);
  }
}
