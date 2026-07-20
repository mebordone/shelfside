/**
 * Smoke live: re-evalúa getRelatedEditionHits sobre los 32 editions del análisis previo.
 * Ejecutar: OPENLIBRARY_LIVE=1 npx vitest run src/lib/api/openlibrary/relatedResmoke.live.test.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createOpenLibraryClient } from "./client";

const LIVE = process.env.OPENLIBRARY_LIVE === "1";

type Prev = { edition: string; title: string; authors: string[]; series: string[] };

const SAGA =
  /dune|foundation|fundaci[oó]n|messiah|children of dune|god emperor|heretics|chapterhouse|segundo fundamento|borde de la fundaci|fundaci[oó]n e imperio|hacia la fundaci|prelude to foundation|forward the foundation/i;

describe.skipIf(!LIVE)("related OL resmoke (live)", () => {
  it(
    "mejora criterios sobre corpus de 32 libros",
    async () => {
      const prev = JSON.parse(
        readFileSync("/tmp/shelfside-related-analysis.json", "utf8"),
      ) as Prev[];
      const client = createOpenLibraryClient({ lang: "es" });
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

      type Row = {
        edition: string;
        title: string;
        n: number;
        other_author_titles: number;
        non_series_in_top8: number;
        top: { title: string; authors: string[] }[];
      };
      const rows: Row[] = [];

      for (const book of prev) {
        const hits = await client.getRelatedEditionHits(book.edition);
        const top8 = hits.slice(0, 8);
        const nonSeriesTop8 = top8.filter((h) => !SAGA.test(h.title)).length;
        const firstAuthors = hits.map((h) => (h.authors?.[0] ?? "").toLowerCase());
        const counts = new Map<string, number>();
        for (const a of firstAuthors) {
          if (!a) continue;
          counts.set(a, (counts.get(a) ?? 0) + 1);
        }
        let mode = "";
        let modeN = 0;
        for (const [a, n] of counts) {
          if (n > modeN) {
            mode = a;
            modeN = n;
          }
        }
        const otherAuthorTitles = hits.filter((h) => {
          const a = (h.authors?.[0] ?? "").toLowerCase();
          return a && a !== mode;
        }).length;

        rows.push({
          edition: book.edition,
          title: book.title,
          n: hits.length,
          other_author_titles: otherAuthorTitles,
          non_series_in_top8: nonSeriesTop8,
          top: hits.slice(0, 12).map((h) => ({ title: h.title, authors: h.authors ?? [] })),
        });
        // eslint-disable-next-line no-console
        console.log(
          `${book.title}: n=${hits.length} other≈${otherAuthorTitles} nonSaga8=${nonSeriesTop8}`,
        );
        await sleep(400);
      }

      writeFileSync("/tmp/shelfside-related-analysis-v2.json", JSON.stringify(rows, null, 2));

      const by = (re: RegExp) => rows.filter((r) => re.test(r.title));

      for (const r of by(/gabriela|viejo y el mar|d[ií]as del (venado|sombra|fuego)/i)) {
        expect(r.n, r.title).toBeGreaterThanOrEqual(6);
        expect(r.other_author_titles, r.title).toBeGreaterThanOrEqual(3);
      }

      for (const r of by(
        /dune|fundaci|foundation|messiah|children|god emperor|heretics|chapterhouse/i,
      )) {
        expect(r.non_series_in_top8, r.title).toBeGreaterThanOrEqual(3);
      }

      for (const r of by(/principito|little prince|petit prince/i)) {
        expect(
          r.top.some((t) => /court of thorns|ignite me|\bacotar\b|a court of/i.test(t.title)),
          r.title,
        ).toBe(false);
      }

      for (const r of by(/yo[, ]?\s*robot|i[, ]?\s*robot/i)) {
        expect(r.n, r.title).toBeGreaterThanOrEqual(4);
      }
    },
    300_000,
  );
});
