"use client";

import { useCallback, useRef, useState } from "react";
import {
  DISPLAY_NAME_MAX,
  LIMIT_TEXT,
  validateDisplayName,
  validateImage,
} from "@/lib/validation";

/**
 * The submission form: a display name, and a PNG dropped or browsed for.
 *
 * The file is checked here first - the same rules the server applies, from the same module - so a
 * wrong file is refused the moment it is picked rather than after an upload. The message is always
 * on screen; nothing is only logged. The server checks again regardless, because this code runs on
 * the visitor's machine and anything here can be skipped.
 */

type Picked = { file: File; previewUrl: string; width: number; height: number };

export function SubmitForm() {
  const [displayName, setDisplayName] = useState("");
  const [picked, setPicked] = useState<Picked | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const take = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = validateImage(file.name, file.size, bytes);
    if (!result.ok) {
      setPicked((current) => {
        if (current) URL.revokeObjectURL(current.previewUrl);
        return null;
      });
      setError(result.message);
      return;
    }
    setPicked((current) => {
      if (current) URL.revokeObjectURL(current.previewUrl);
      return {
        file,
        previewUrl: URL.createObjectURL(file),
        width: result.width,
        height: result.height,
      };
    });
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const name = validateDisplayName(displayName);
    if (!name.ok) {
      setError(name.message);
      return;
    }
    if (!picked) {
      setError("Pick a PNG to submit.");
      return;
    }

    setSending(true);
    try {
      const body = new FormData();
      body.set("displayName", name.value);
      body.set("image", picked.file);
      const response = await fetch("/api/submissions", { method: "POST", body });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Something went wrong sending that. Try again in a moment.");
        return;
      }
      setDone(true);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="panel stack" role="status">
        <div>
          <h2 style={{ color: "var(--success)" }}>Submitted for review</h2>
          <p style={{ margin: 0 }}>
            Thanks. Your design is <strong>waiting for review and is not in the gallery yet</strong> -
            nobody else can see it until one of us has looked at it. If it is approved it will show
            up in the gallery; if it is not, it simply will not appear.
          </p>
        </div>
        <div className="row">
          <button
            type="button"
            onClick={() => {
              setDone(false);
              setPicked((current) => {
                if (current) URL.revokeObjectURL(current.previewUrl);
                return null;
              });
              setDisplayName("");
            }}
          >
            Submit another
          </button>
          <a className="button" href="/gallery">
            See the gallery
          </a>
        </div>
      </div>
    );
  }

  return (
    <form className="stack" onSubmit={submit} style={{ marginTop: 24 }}>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="displayName">Display name</label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          maxLength={DISPLAY_NAME_MAX}
          placeholder="Shown next to your design"
          onChange={(event) => setDisplayName(event.target.value)}
        />
        <p className="tiny muted" style={{ margin: "7px 0 0" }}>
          A label, not an account - there are no accounts here yet, so anyone could type any name.
          It is reviewed along with the image.
        </p>
      </div>

      <div>
        <label htmlFor="pick">Cape design</label>
        <div
          className={dragging ? "dropzone over" : "dropzone"}
          tabIndex={0}
          role="button"
          aria-label="Choose a PNG, or drop one here"
          onClick={() => fileInput.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInput.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void take(event.dataTransfer.files?.[0]);
          }}
        >
          {picked ? (
            <>
              <img className="preview" src={picked.previewUrl} alt="" />
              <div className="small">
                {picked.file.name} - {picked.width}x{picked.height}
              </div>
              <div className="tiny muted">Click, or drop another, to replace it</div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 600 }}>Drop a PNG here</div>
              <div className="small muted">or click to browse</div>
            </>
          )}
        </div>
        <p className="tiny muted" style={{ margin: "7px 0 0" }}>
          {LIMIT_TEXT}
        </p>
        <input
          id="pick"
          ref={fileInput}
          type="file"
          accept="image/png,.png"
          hidden
          onChange={(event) => {
            void take(event.target.files?.[0]);
            // Let the same file be picked again after a rejection.
            event.target.value = "";
          }}
        />
      </div>

      <div className="row">
        <button className="primary" type="submit" disabled={sending}>
          {sending ? "Sending..." : "Submit for review"}
        </button>
        <span className="tiny muted">Nothing is published automatically.</span>
      </div>
    </form>
  );
}
