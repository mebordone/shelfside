import { t } from "$lib/i18n";
import type { MergeResult } from "./mergeFromFolder";

function applyParams(template: string, params: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(params)) {
    out = out.replaceAll(`{${key}}`, value);
  }
  return out;
}

export function formatSyncSummary(
  merge: MergeResult,
  exported: number,
  wrote: boolean = true,
): string {
  const base = applyParams(t("settings.sync_summary"), {
    imported: String(merge.imported),
    updated: String(merge.updated),
    deleted: String(merge.deleted),
    skipped: String(merge.skipped),
  });
  const tail = wrote
    ? applyParams(t("settings.sync_rewrote"), { exported: String(exported) })
    : t("settings.sync_no_rewrite");
  const summary = `${base} ${tail}`;
  if (merge.errors.length === 0) return summary;
  const prefix = applyParams(t("settings.sync_errors_prefix"), {
    count: String(merge.errors.length),
  });
  return `${summary} — ${prefix}: ${merge.errors[0]}`;
}
