import { designType } from "@/lib/design-types";
import type { Submission } from "@/lib/store";

/**
 * The designs pinned to the drafting board in the hero.
 *
 * Real ones, not artwork: these are the most-voted approved submissions, on the same public image
 * route the showcase uses, so the top of the page always shows what the site has actually made. It
 * is the one place a visitor sees the point of the site before reading a word of it.
 *
 * Only the front plate is captioned. Three captions in a pile of overlapping plates collide with
 * each other whatever the offsets are; one caption reads as "this is the one on top" instead.
 *
 * With nothing approved yet it shows a single empty plate, which says the same thing from the
 * other end: there is a space here and it is waiting for someone.
 */
export function HeroPlates({ designs }: { designs: Submission[] }) {
  if (designs.length === 0) {
    return (
      <div className="plates">
        <figure className="plate front">
          <div className="plate-blank" />
          <figcaption className="plate-caption">
            <b>Your design here</b>
            <span>64x32</span>
          </figcaption>
        </figure>
      </div>
    );
  }

  const [front, ...behind] = designs;

  return (
    <div className="plates">
      {behind.map((design, index) => (
        <figure className={`plate behind-${index + 1}`} key={design.id} aria-hidden="true">
          <img src={`/api/images/${design.id}`} alt="" loading="eager" />
        </figure>
      ))}
      <figure className="plate front">
        <img src={`/api/images/${front.id}`} alt={`Design by ${front.displayName}`} loading="eager" />
        <figcaption className="plate-caption">
          <b>{front.displayName}</b>
          <span>{designType(front.designType).label}</span>
        </figcaption>
      </figure>
    </div>
  );
}
