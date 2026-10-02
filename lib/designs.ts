import type { Store, Submission } from "./store/types";

/** An approved design as the public page shows it: the row, and where its picture comes from. */
export type PublicDesign = Submission & { image: string };

/**
 * Designs are tiny PNGs (a 64x32 cape is a few hundred bytes), so the page carries them inside itself
 * as data URLs - no request per picture. A large one (an HD cape can be up to 1 MB) still loads through
 * /api/images/[id]. Only approved designs ever come here: the page asks the store for nothing else.
 */
const INLINE_LIMIT = 48 * 1024;

export async function withImages(store: Store, designs: Submission[]): Promise<PublicDesign[]> {
  const unique = [...new Map(designs.map((d) => [d.id, d])).values()];
  // ponytail: one download per design per page build (at most once a minute); batch them if the gallery grows into the thousands.
  const sources = new Map(
    await Promise.all(
      unique.map(async (design): Promise<[string, string]> => {
        const fallback = `/api/images/${design.id}`;
        try {
          const image = await store.readImage(design.id);
          if (!image || image.bytes.byteLength > INLINE_LIMIT) return [design.id, fallback];
          return [design.id, `data:${image.contentType};base64,${Buffer.from(image.bytes).toString("base64")}`];
        } catch {
          return [design.id, fallback];
        }
      }),
    ),
  );
  return designs.map((design) => ({ ...design, image: sources.get(design.id) ?? `/api/images/${design.id}` }));
}
