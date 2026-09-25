"use client";

import { useCallback, useRef, useState } from "react";
import { DrawCanvas } from "./draw-canvas";
import { TypeIcon } from "./type-icon";
import {
  DESIGN_TYPES,
  DEFAULT_DESIGN_TYPE,
  designType,
  type DesignTypeId,
} from "@/lib/design-types";
import { DISPLAY_NAME_MAX, limitText, validateDisplayName, validateImage } from "@/lib/validation";

/**
 * Two ways in, one pipeline: upload a PNG, or draw a cape on the canvas. Both end up posting the
 * same `FormData` to the same route, so a drawing is pending, reviewed and stored exactly as a
 * file is - it is a second input method, not a second system.
 *
 * An uploaded file is checked here first, with the same rules the server applies, so a wrong file
 * is refused the moment it is picked. The server checks again regardless. A drawing needs no
 * dimension check at all: the canvas is the texture's size, so it cannot be the wrong one.
 */

type Mode = "upload" | "draw";
type Picked = { file: File; previewUrl: string; width: number; height: number };

export function SubmitForm() {
  const [mode, setMode] = useState<Mode>("upload");
  const [displayName, setDisplayName] = useState("");
  const [type, setType] = useState<DesignTypeId>(DEFAULT_DESIGN_TYPE);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const take = useCallback(
    async (file: File | undefined, forType: DesignTypeId) => {
      if (!file) return;
      setError(null);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = validateImage(file.name, file.size, bytes, forType);
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
    },
    [],
  );

  /** The drawing, as a PNG file - or null if nothing has been drawn on it. */
  async function drawingAsFile(): Promise<File | null> {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const context = canvas.getContext("2d");
    if (context) {
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let painted = false;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] !== 0) {
          painted = true;
          break;
        }
      }
      if (!painted) return null;
    }
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    return blob ? new File([blob], "drawn-cape.png", { type: "image/png" }) : null;
  }

  function reset() {
    setDone(false);
    setPicked((current) => {
      if (current) URL.revokeObjectURL(current.previewUrl);
      return null;
    });
    setDisplayName("");
    setError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const name = validateDisplayName(displayName);
    if (!name.ok) {
      setError(name.message);
      return;
    }

    // Drawing mode is capes only, which is also the only type with a fixed size - see
    // lib/design-types.ts. If another type ever gets a canvas, this is where it widens.
    const sentType: DesignTypeId = mode === "draw" ? "cape" : type;
    let file: File | null = null;

    if (mode === "draw") {
      file = await drawingAsFile();
      if (!file) {
        setError("Draw something first - the canvas is empty.");
        return;
      }
    } else {
      if (!picked) {
        setError("Pick a PNG to submit.");
        return;
      }
      file = picked.file;
    }

    setSending(true);
    try {
      const body = new FormData();
      body.set("displayName", name.value);
      body.set("designType", sentType);
      body.set("image", file);
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
      <div className="stack done" role="status">
        <div>
          <h3>Sent for review</h3>
          <p>
            Thanks! Nobody else can see your design until a reviewer approves it - then it shows up in
            the gallery.
          </p>
        </div>
        <div className="row">
          <button type="button" className="primary" onClick={reset}>
            Submit another
          </button>
          <a className="button" href="/#gallery">
            See the gallery
          </a>
        </div>
      </div>
    );
  }

  const active = designType(type);

  return (
    <form className="stack" onSubmit={submit}>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}

      <div>
        <div className="segmented" role="group" aria-label="How to submit">
          <button type="button" onClick={() => setMode("upload")} aria-pressed={mode === "upload"}>
            Upload a file
          </button>
          <button type="button" onClick={() => setMode("draw")} aria-pressed={mode === "draw"}>
            Draw a cape
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="displayName">Display name</label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          maxLength={DISPLAY_NAME_MAX}
          placeholder="Shown with your design"
          onChange={(event) => setDisplayName(event.target.value)}
        />
      </div>

      {mode === "upload" ? (
        <>
          <div>
            <span className="label">Kind of design</span>
            <div className="chips" role="group" aria-label="Kind of design">
              {DESIGN_TYPES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="chip"
                  aria-pressed={option.id === type}
                  onClick={() => {
                    setType(option.id);
                    // The size rule changes with the type, so anything already picked is
                    // re-checked against the new one rather than quietly kept.
                    if (picked) void take(picked.file, option.id);
                  }}
                >
                  <TypeIcon type={option.id} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="pick">Image</label>
            <div
              className={dragging ? "dropzone over" : "dropzone"}
              tabIndex={0}
              role="button"
              aria-label="Drag and drop an image, or click to browse"
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
                void take(event.dataTransfer.files?.[0], type);
              }}
            >
              {picked ? (
                <img className="preview" src={picked.previewUrl} alt="" />
              ) : (
                <div>
                  <p className="big">Drop a PNG here</p>
                  <p className="tiny muted">or click to choose a file</p>
                </div>
              )}
            </div>
            <p className="tiny muted field-note">
              {picked ? `${picked.file.name} - ${picked.width}x${picked.height}` : limitText(type)}
            </p>
            {!picked && active.note && <p className="tiny muted field-note">{active.note}</p>}
            <input
              id="pick"
              ref={fileInput}
              type="file"
              accept="image/png,.png"
              hidden
              onChange={(event) => {
                void take(event.target.files?.[0], type);
                // Let the same file be picked again after a rejection.
                event.target.value = "";
              }}
            />
          </div>
        </>
      ) : (
        <DrawCanvas canvasRef={canvasRef} />
      )}

      <div className="row">
        <button className="primary" type="submit" disabled={sending}>
          {sending ? "Sending..." : mode === "draw" ? "Submit drawing" : "Submit for review"}
        </button>
        <span className="tiny muted">A person checks it before anyone sees it.</span>
      </div>
    </form>
  );
}
