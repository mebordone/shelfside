import { t } from "$lib/i18n";
import type { CleanRecycleResult } from "./cleanSyncRecycleBin";

function applyParams(template: string, params: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(params)) {
    out = out.replaceAll(`{${key}}`, value);
  }
  return out;
}

export function formatCleanRecycleSummary(result: CleanRecycleResult): string {
  const summary = applyParams(t("settings.sync_clean_recycle_summary"), {
    removed: String(result.removed),
    skipped: String(result.skipped),
  });
  if (result.errors.length === 0) return summary;
  const prefix = applyParams(t("settings.sync_errors_prefix"), {
    count: String(result.errors.length),
  });
  return `${summary} — ${prefix}: ${result.errors[0]}`;
}
