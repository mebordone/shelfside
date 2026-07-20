/** Buckets usados para priorizar subjects en recomendaciones. */
export type SubjectBucket = "genre" | "theme" | "setting" | "universe";

export type PickedSubjects = {
  /** Hasta 5 slugs útiles, ordenados por prioridad. */
  slugs: string[];
  /** Primer género concreto, si hay. */
  genre: string | null;
  /**
   * Primer tema allowlisted para par (intersección), o null.
   * Solo themes de PAIR_THEME_ALLOWLIST.
   */
  theme: string | null;
  /** Par para `subject_key:A AND subject_key:B`, o null si no hay ambos. */
  pair: { genre: string; theme: string } | null;
  /**
   * Género a usar en query de descubrimiento (siempre o fallback sparse).
   * Puede venir de alias locales cuando no hay genre explícito.
   */
  discoveryGenre: string | null;
};

const BLACKLIST_EXACT = new Set([
  "fiction",
  "literature",
  "american_literature",
  "british_literature",
  "english_literature",
  "general",
  "new_york_times_reviewed",
  "new_york_times_bestseller",
  "long_now_manual_for_civilization",
  "open_library_staff_picks",
  "open_syllabus_project",
  "large_type_books",
  "large_print_books",
  "audiobooks",
  "comic_books_strips",
  "graphic_novels",
  // Ruido que antes se filtraba mal como "theme"
  "love",
  "family",
  "smear_campaigns",
  "information_superhighway",
  "dans_la_litterature",
  "english_fantasy_fiction",
  "american_fantasy_fiction",
  "romans_nouvelles",
  "vie_extraterrestre",
  "business_intelligence",
  "computer_hackers",
  "ciencia_ficcion",
]);

const BLACKLIST_PREFIXES = [
  "nyt:",
  "award:",
  "reading_level",
  "reading_level_grade",
  "translations_",
  "translation_",
];

/** Géneros concretos (slug canónico). */
const GENRE_SLUGS = new Set([
  "science_fiction",
  "fantasy_fiction",
  "fantasy",
  "horror",
  "horror_fiction",
  "dystopia",
  "dystopian",
  "space_opera",
  "mystery",
  "detective_and_mystery_stories",
  "romance",
  "romance_fiction",
  "thriller",
  "historical_fiction",
  "adventure_stories",
  "war_stories",
  "western_stories",
  "humorous_stories",
  "psychological_fiction",
  "political_fiction",
  "gothic_fiction",
  "steampunk",
  "cyberpunk",
  "young_adult_fiction",
  "juvenile_fiction",
  "philosophical_fiction",
]);

/**
 * Temas permitidos SOLO para armar el par género∩tema.
 * Cualquier otro "theme" de OL no se usa en la intersección.
 */
export const PAIR_THEME_ALLOWLIST = new Set([
  "ecology",
  "environmentalism",
  "climate",
  "global_warming",
  "desert",
  "politics",
  "religion",
  "philosophy",
  "time_travel",
  "space_travel",
  "interplanetary_voyages",
  "life_on_other_planets",
  "extraterrestrial_beings",
  "artificial_intelligence",
  "robots",
  "genetic_engineering",
  "totalitarianism",
  "utopias",
  "dystopias_in_fiction",
  "vampires",
  "wizards",
  "magic",
  "war",
  "planets",
  "empires",
  "espionage",
  "crime",
  "murder",
  "coming_of_age",
  "psychohistory",
  "space_stations",
  "cyberpunk",
]);

/** Variantes → slug canónico de género. */
const GENRE_ALIASES: Record<string, string> = {
  science_fiction: "science_fiction",
  sciencefiction: "science_fiction",
  sci_fi: "science_fiction",
  scifi: "science_fiction",
  american_science_fiction: "science_fiction",
  english_science_fiction: "science_fiction",
  fiction_science_fiction_general: "science_fiction",
  fiction_science_fiction: "science_fiction",
  fantasy_fiction: "fantasy_fiction",
  fantasy: "fantasy_fiction",
  fiction_fantasy_general: "fantasy_fiction",
  fiction_fantasy: "fantasy_fiction",
  horror: "horror",
  horror_fiction: "horror",
  horror_stories: "horror",
  horror_tales: "horror",
  fiction_horror: "horror",
  dystopia: "dystopia",
  dystopian: "dystopia",
  dystopias: "dystopia",
  fiction_dystopian: "dystopia",
  space_opera: "space_opera",
  romance_fiction: "romance",
  romance: "romance",
  fiction_romance_general: "romance",
  brazilian_romance_fiction: "romance",
  brazilian_love_stories: "romance",
  love_stories: "romance",
  mystery: "mystery",
  detective_and_mystery_stories: "mystery",
  thriller: "thriller",
  fiction_thrillers_general: "thriller",
  historical_fiction: "historical_fiction",
  fiction_historical: "historical_fiction",
  fiction_historical_general: "historical_fiction",
  gothic_fiction: "gothic_fiction",
  gothic: "gothic_fiction",
  philosophical_novels: "philosophical_fiction",
  philosophical_fiction: "philosophical_fiction",
  cyberpunk: "cyberpunk",
};

/**
 * Normaliza un subject de Open Library a slug canónico
 * (minúsculas, sin tildes, espacios → `_`).
 */
export function normalizeSubject(raw: string): string {
  const base = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9:]+/g, "_")
    .replace(/^_|_$/g, "")
    .replace(/_+/g, "_");

  if (!base) return "";

  if (base.startsWith("nyt:") || base.startsWith("award:")) return base;

  if (GENRE_ALIASES[base]) return GENRE_ALIASES[base];

  if (base.startsWith("fiction_science_fiction")) return "science_fiction";
  if (base.startsWith("fiction_fantasy")) return "fantasy_fiction";
  if (base.startsWith("fiction_horror")) return "horror";
  if (base.startsWith("fiction_dystopian")) return "dystopia";
  if (base.startsWith("fiction_romance")) return "romance";

  return base;
}

function isBlacklisted(slug: string): boolean {
  if (!slug) return true;
  if (BLACKLIST_EXACT.has(slug)) return true;
  for (const p of BLACKLIST_PREFIXES) {
    if (slug.startsWith(p)) return true;
  }
  if (slug.includes("award") || slug.includes("bestseller") || slug.includes("reviewed")) {
    return true;
  }
  // Tags demasiado genéricos de una sola palabra (si no están en genre/allowlist).
  if (
    !slug.includes("_") &&
    !GENRE_SLUGS.has(slug) &&
    !PAIR_THEME_ALLOWLIST.has(slug)
  ) {
    if (slug.length < 5) return true;
  }
  return false;
}

function classifyBucket(slug: string): SubjectBucket {
  if (GENRE_SLUGS.has(slug)) return "genre";
  if (PAIR_THEME_ALLOWLIST.has(slug)) return "theme";
  if (
    slug.includes("imaginary_place") ||
    slug.includes("fictitious_character") ||
    slug.includes("imaginary_places") ||
    (/_fiction$/.test(slug) && slug.split("_").length >= 3)
  ) {
    if (slug.includes("imaginary") || slug.includes("fictitious")) return "universe";
  }
  if (slug.includes("imaginary") || slug.includes("fictitious_character")) return "universe";
  if (
    slug.includes("place") ||
    slug.includes("planets") ||
    slug.includes("future") ||
    slug.includes("space")
  ) {
    return "setting";
  }
  const parts = slug.split("_").filter(Boolean);
  if (parts.length >= 4) return "universe";
  if (parts.length >= 2) return "setting"; // no promover a theme si no está allowlisted
  return "setting";
}

const BUCKET_PRIORITY: Record<SubjectBucket, number> = {
  genre: 0,
  theme: 1,
  setting: 2,
  universe: 3,
};

/**
 * Filtra, normaliza y prioriza subjects del work origen.
 * Devuelve hasta 5 slugs + par género/tema (solo theme allowlisted).
 */
export function pickRelatedSubjects(rawSubjects: string[] | null | undefined): PickedSubjects {
  const seen = new Set<string>();
  const classified: { slug: string; bucket: SubjectBucket }[] = [];

  for (const raw of rawSubjects ?? []) {
    if (!raw || raw.trim().length < 3) continue;
    const slug = normalizeSubject(raw);
    if (!slug || isBlacklisted(slug) || seen.has(slug)) continue;
    seen.add(slug);
    classified.push({ slug, bucket: classifyBucket(slug) });
  }

  classified.sort((a, b) => BUCKET_PRIORITY[a.bucket] - BUCKET_PRIORITY[b.bucket]);

  const slugs = classified.slice(0, 5).map((c) => c.slug);
  const genre = classified.find((c) => c.bucket === "genre")?.slug ?? null;
  // Solo themes allowlisted entran al par
  const theme =
    classified.find(
      (c) => c.bucket === "theme" && PAIR_THEME_ALLOWLIST.has(c.slug) && c.slug !== genre,
    )?.slug ?? null;

  // Sin género explícito: theme allowlisted o primer slug usable como discovery.
  const discoveryGenre =
    genre ?? theme ?? slugs.find((s) => !isBlacklisted(s) && s.includes("_")) ?? null;

  return {
    slugs,
    genre,
    theme,
    pair: genre && theme ? { genre, theme } : null,
    discoveryGenre,
  };
}
