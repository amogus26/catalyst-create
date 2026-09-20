"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * The main page is one page in three steps, and this is the switch between them.
 *
 * Presented as steps rather than tabs on purpose: submit, then vote, then look at what got through
 * is the order the site works in, and numbering them answers "what do I do first" without a
 * sentence of instructions. Each part is rendered on the server and handed in as a prop, so
 * switching costs nothing and fetches nothing, and the step is mirrored into the URL hash, which
 * makes `/#vote` and `/#showcase` real links.
 */

const STEPS = [
  { id: "submit", no: "01", label: "Submit", hint: "Upload or draw one" },
  { id: "vote", no: "02", label: "Vote", hint: "This round's five" },
  { id: "showcase", no: "03", label: "Showcase", hint: "Everything approved" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

function isStepId(value: string): value is StepId {
  return STEPS.some((step) => step.id === value);
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
  const [active, setActive] = useState<StepId>("submit");

  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.replace("#", "");
      if (isStepId(id)) setActive(id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  function select(id: StepId) {
    setActive(id);
    // replaceState, not a new entry: flipping between steps should not fill the back button.
    window.history.replaceState(null, "", `#${id}`);
  }

  const count = (id: StepId) =>
    id === "vote" ? counts.vote : id === "showcase" ? counts.showcase : null;

  return (
    <>
      <nav className="steps-nav" aria-label="Steps">
        {STEPS.map((step) => {
          const badge = count(step.id);
          return (
            <button
              key={step.id}
              type="button"
              aria-current={active === step.id ? "step" : undefined}
              className={active === step.id ? "step on" : "step"}
              onClick={() => select(step.id)}
            >
              <span className="step-no">{step.no}</span>
              <span className="step-label">
                <b>{step.label}</b>
                <span>{step.hint}</span>
              </span>
              {badge !== null && badge > 0 && <span className="step-count">{badge}</span>}
            </button>
          );
        })}
      </nav>

      <div id={`panel-${active}`}>
        {active === "submit" && submit}
        {active === "vote" && vote}
        {active === "showcase" && showcase}
      </div>
    </>
  );
}
