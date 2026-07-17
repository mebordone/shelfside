import { TmdbConfigError, TmdbHttpError } from "$lib/api/tmdb/errors";
import { t } from "$lib/i18n";

/** Mensaje legible para UI (búsqueda / refresco); no pierde el detalle técnico si no hay mapeo. */
export function userFacingError(e: unknown): string {
  if (e instanceof TmdbConfigError) return e.message;
  if (e instanceof TmdbHttpError) {
    if (e.status === 401 || e.status === 403) return t("search.api_unauthorized");
    if (e.status === 429) {
      const wait = e.retryAfterSec != null ? ` (${e.retryAfterSec}s)` : "";
      return `${t("search.api_rate_limit")}${wait}`;
    }
    if (e.status >= 500) return t("search.api_unavailable");
    return e.message;
  }
  const msg = e instanceof Error ? e.message : String(e);
  if (/failed to fetch|networkerror|load failed|network request failed|err_network/i.test(msg)) {
    return t("search.network_error");
  }
  return msg;
}
