/** Tipos de medio con UI de filtro en biblioteca e inicio (v1). */
export const UI_MEDIA_FILTER_TYPES = ["movie", "tv", "book"] as const;
export type UiMediaFilterType = (typeof UI_MEDIA_FILTER_TYPES)[number];
