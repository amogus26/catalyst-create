"use client";

import { useState } from "react";
import { DESIGN_TYPES, type DesignTypeId } from "@/lib/design-types";
import type { Submission } from "@/lib/store/types";
import { DesignCard } from "./design-card";
import { SectionHeader } from "./section-header";
import { TypeIcon } from "./type-icon";

/**
 * Everything that has been through review, most-voted first, with a filter by kind of design. The
 * filter runs in the browser over what the server already sent - nothing is fetched to change it.
 */
export function Gallery({ items, voted }: { items: Submission[]; voted: string[] }) {
  const [type, setType] = useState<DesignTypeId | "all">("all");
  const votedSet = new Set(voted);
  const shown = type === "all" ? items : items.filter((item) => item.designType === type);
  const kinds = DESIGN_TYPES.filter((kind) => items.some((item) => item.designType === kind.id));

  return (
    <section className="section" id="gallery">
      <SectionHeader
        kicker="Gallery"
        title="Approved designs"
        aside={
          kinds.length > 1 ? (
            <div className="filters" role="group" aria-label="Filter by kind">
              <button type="button" className="filter" aria-pressed={type === "all"} onClick={() => setType("all")}>
                All <span className="n">{items.length}</span>
              </button>
              {kinds.map((kind) => (
                <button
                  key={kind.id}
                  type="button"
                  className="filter"
                  aria-pressed={type === kind.id}
                  onClick={() => setType(kind.id)}
                >
                  <TypeIcon type={kind.id} />
                  {kind.label}
                  <span className="n">{items.filter((item) => item.designType === kind.id).length}</span>
                </button>
              ))}
            </div>
          ) : null
        }
      >
        {items.length === 0 ? "Nothing has been approved yet." : "Most-voted first."}
      </SectionHeader>

      {items.length === 0 ? (
        <div className="empty">
          <b>The gallery is empty.</b>
          Approved designs appear here. Yours could be the first.
        </div>
      ) : (
        <div className="design-grid">
          {shown.map((submission) => (
            <DesignCard key={submission.id} submission={submission} voted={votedSet.has(submission.id)} />
          ))}
        </div>
      )}
    </section>
  );
}
