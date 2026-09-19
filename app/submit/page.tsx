import { SubmitForm } from "./submit-form";

export const metadata = { title: "Submit a design | Catalyst Designs" };

export default function SubmitPage() {
  return (
    <div style={{ paddingTop: 32, maxWidth: 620 }}>
      <h1>Submit a design</h1>
      <p className="muted small">
        Your design is not shown to anyone until one of us has looked at it. Expect that to take a
        day or two.
      </p>
      <SubmitForm />
    </div>
  );
}
