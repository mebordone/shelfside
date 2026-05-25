import { t } from "./locale.svelte";

export function labelForStatus(status: string): string {
  const k = `status.${status}`;
  const v = t(k);
  return v === k ? status : v;
}

export function labelForMedia(mediaType: string): string {
  const k = `media.${mediaType}`;
  const v = t(k);
  return v === k ? mediaType : v;
}
