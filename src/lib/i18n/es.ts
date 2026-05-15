const messages: Record<string, string> = {
  "app.title": "Shelfside",
  "app.subtitle": "Tu biblioteca cultural local.",
  "theme.light": "Claro",
  "theme.dark": "Oscuro",
  "theme.toggle": "Tema",
  "home.db_ready": "Base de datos lista.",
  "home.schema_row": "Metadato en base",
  "home.loading": "Iniciando…",
};

export function t(key: string): string {
  return messages[key] ?? key;
}
