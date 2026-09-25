"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { describeReward, rewardSpec, SHOP_ITEMS, type Reward } from "@/lib/rewards";

type Kind = Reward["kind"];

const KINDS: { id: Kind; label: string }[] = [
  { id: "coins", label: "Coins" },
  { id: "sale", label: "Sale" },
  { id: "item", label: "Free item" },
  { id: "special", label: "Exclusive" },
];

interface Made {
  codes: string[];
  reward: string;
  maxUses: number;
  expiresOn: string | null;
  note: string | null;
}

/**
 * Pick a reward, how many codes and how long they last, and make them. The readable codes come back
 * once, from the server, and are shown here to copy or download - the site keeps only their
 * fingerprints, so they cannot be shown again later.
 */
export function CodeMaker() {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("coins");
  const [coins, setCoins] = useState("500");
  const [percent, setPercent] = useState("20");
  const [days, setDays] = useState("7");
  const [item, setItem] = useState<string>(SHOP_ITEMS[0]);
  const [special, setSpecial] = useState("");
  const [count, setCount] = useState("10");
  const [uses, setUses] = useState("1");
  const [lastDay, setLastDay] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<Made | null>(null);
  const [copied, setCopied] = useState(false);

  const reward: Reward =
    kind === "coins"
      ? { kind, amount: Number(coins) }
      : kind === "sale"
        ? { kind, percentOff: Number(percent), days: Number(days) }
        : kind === "item"
          ? { kind, name: item }
          : { kind, name: special.trim() };

  async function make(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/codes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reward: rewardSpec(reward),
          count: Number(count),
          maxUses: Number(uses),
          expiresOn: lastDay || null,
          note: note || null,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as Made & { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "The codes could not be made.");
        return;
      }
      setMade(payload);
      setCopied(false);
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  if (made) {
    const sheet =
      `# ${describeReward(made.reward)}` +
      (made.maxUses > 1 ? `, ${made.maxUses} uses each` : "") +
      (made.expiresOn ? `, until ${made.expiresOn}` : "") +
      (made.note ? ` - ${made.note}` : "") +
      "\n" +
      made.codes.join("\n") +
      "\n";
    return (
      <div className="stack" style={{ gap: 16 }}>
        <div className="notice ok">
          <b>{made.codes.length} codes for {describeReward(made.reward)}</b> - they work now. Copy them
          before leaving: they are shown this once.
        </div>
        <ol className="code-list">
          {made.codes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ol>
        <div className="row">
          <button
            type="button"
            className="primary"
            onClick={async () => {
              await navigator.clipboard.writeText(made.codes.join("\n"));
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy all"}
          </button>
          <button
            type="button"
            onClick={() => {
              const url = URL.createObjectURL(new Blob([sheet], { type: "text/plain" }));
              const link = document.createElement("a");
              link.href = url;
              link.download = `catalyst-codes-${new Date().toISOString().slice(0, 10)}.txt`;
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download .txt
          </button>
          <button type="button" className="quiet" onClick={() => setMade(null)}>
            Make more
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="stack" onSubmit={make}>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}

      <div>
        <span className="label">Reward</span>
        <div className="segmented" role="group" aria-label="Reward">
          {KINDS.map((option) => (
            <button key={option.id} type="button" aria-pressed={kind === option.id} onClick={() => setKind(option.id)}>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {kind === "coins" && (
        <div>
          <label htmlFor="coins">Coins per code</label>
          <input id="coins" type="number" min={1} max={1000000} value={coins} onChange={(e) => setCoins(e.target.value)} />
          <div className="chips" style={{ marginTop: 10 }}>
            {[100, 500, 1000, 2500, 10000].map((amount) => (
              <button
                key={amount}
                type="button"
                className="chip small"
                aria-pressed={Number(coins) === amount}
                onClick={() => setCoins(String(amount))}
              >
                {amount.toLocaleString("en-GB")}
              </button>
            ))}
          </div>
        </div>
      )}
      {kind === "sale" && (
        <div className="pair">
          <div>
            <label htmlFor="percent">% off wings</label>
            <input id="percent" type="number" min={1} max={90} value={percent} onChange={(e) => setPercent(e.target.value)} />
          </div>
          <div>
            <label htmlFor="days">For how many days</label>
            <input id="days" type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} />
          </div>
        </div>
      )}
      {kind === "item" && (
        <div>
          <label htmlFor="item">Shop item</label>
          <select id="item" value={item} onChange={(e) => setItem(e.target.value)}>
            {SHOP_ITEMS.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </div>
      )}
      {kind === "special" && (
        <div>
          <label htmlFor="special">Exclusive&apos;s name</label>
          <input
            id="special"
            type="text"
            maxLength={40}
            placeholder="Creator Cape"
            value={special}
            onChange={(e) => setSpecial(e.target.value)}
          />
        </div>
      )}

      <div className="pair">
        <div>
          <label htmlFor="count">How many codes</label>
          <input id="count" type="number" min={1} max={1000} value={count} onChange={(e) => setCount(e.target.value)} />
        </div>
        <div>
          <label htmlFor="uses">Players per code</label>
          <input id="uses" type="number" min={1} max={100000} value={uses} onChange={(e) => setUses(e.target.value)} />
        </div>
      </div>

      <div className="pair">
        <div>
          <label htmlFor="lastDay">Last day (optional)</label>
          <input id="lastDay" type="date" value={lastDay} onChange={(e) => setLastDay(e.target.value)} />
        </div>
        <div>
          <label htmlFor="note">Note for us (optional)</label>
          <input id="note" type="text" maxLength={120} placeholder="Twitch giveaway" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>

      <div className="row">
        <button className="gold" type="submit" disabled={busy}>
          {busy ? "Making..." : `Make ${Number(count) || 0} code${Number(count) === 1 ? "" : "s"}`}
        </button>
        <span className="tiny muted">
          {describeReward(rewardSpec(reward))}
          {Number(uses) > 1 ? `, ${uses} players each` : ", one player each"}
        </span>
      </div>
    </form>
  );
}
