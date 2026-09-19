import Link from "next/link";
import { CAPE_SIZE_TEXT } from "@/lib/validation";

export default function HomePage() {
  return (
    <div className="stack" style={{ paddingTop: 40 }}>
      <div>
        <h1>Design a cape for Catalyst Client</h1>
        <p className="muted" style={{ maxWidth: 620 }}>
          Make a cape, put it up here, and vote on the ones other people have made. Designs are
          {" "}
          {CAPE_SIZE_TEXT.replace(/^(\w)/, (c) => c.toLowerCase())} PNGs, the same size the game
          wears.
        </p>
        <div className="row" style={{ marginTop: 20 }}>
          <Link href="/submit" className="button">
            Submit a design
          </Link>
          <Link href="/gallery" className="button">
            Browse the gallery
          </Link>
        </div>
      </div>

      <div className="panel" style={{ maxWidth: 620 }}>
        <h2>How it works</h2>
        <p className="small muted" style={{ margin: 0 }}>
          Every submission starts hidden. One of us looks at it - the image and the name on it - and
          only then does it appear in the gallery, where anyone can vote for it. Nothing you upload
          is shown to anyone else before that. Winners are picked by hand from the gallery; there is
          no prize wired up yet.
        </p>
      </div>
    </div>
  );
}
