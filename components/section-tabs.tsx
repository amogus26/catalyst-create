"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * The main page is one page with three parts, not three pages. This is the switch between them.
 *
 * Each part is rendered on the server and handed in as a prop, so switching tabs costs nothing and
 * fetches nothing. The tab is mirrored into the URL hash, which means `/#showcase` and `/#vote` are
 * real links that land where they say - the anchors the sections would have had, without the giant
 * scroll they would have come with.
 */

const TABS = [
  { id: "submit", label: "Submit a design" },
  { id: "vote", label: "Vote" },
  { id: "showcase", label: "Showcase" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function isTabId(value: string): value is TabId {
  return TABS.some((tab) => tab.id === value);
}

export function SectionTabs({
  submit,
  vote,
  showcase,
  counts,
}: {
  submit: ReactNode;
  vote: ReactNode;
  showcase: ReactNode;
  counts: { vote: number; showcase: number };
}) {
  const [active, setActive] = useState<TabId>("submit");

  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.replace("#", "");
      if (isTabId(id)) setActive(id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  function select(id: TabId) {
    setActive(id);
    // replaceState, not a new entry: flipping between tabs should not fill up the back button.
    window.history.replaceState(null, "", `#${id}`);
  }

  const count = (id: TabId) => (id === "vote" ? counts.vote : id === "showcase" ? counts.showcase : null);

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Sections">
        {TABS.map((tab) => {
          const badge = count(tab.id);
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              id={`tab-${tab.id}`}
              aria-selected={active === tab.id}
              aria-controls={`panel-${tab.id}`}
              className={active === tab.id ? "tab active" : "tab"}
              onClick={() => select(tab.id)}
            >
              {tab.label}
              {badge !== null && badge > 0 && <span className="tab-count">{badge}</span>}
            </button>
          );
        })}
      </div>

      <div id={`panel-${active}`} role="tabpanel" aria-labelledby={`tab-${active}`}>
        {active === "submit" && submit}
        {active === "vote" && vote}
        {active === "showcase" && showcase}
      </div>
    </>
  );
}
