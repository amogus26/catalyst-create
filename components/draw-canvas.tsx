"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { CAPE_HEIGHT, CAPE_WIDTH } from "@/lib/design-types";

/**
 * Draw a cape in the browser, one texture pixel at a time.
 *
 * The canvas is exactly [CAPE_WIDTH]x[CAPE_HEIGHT] - a real cape texture - and is only *displayed*
 * large, so a pixel on screen is a pixel in the file. That is the whole trick: anything drawn here
 * is already the right size, so a drawing needs no dimension check at all, and what gets submitted
 * is an ordinary PNG that goes through exactly the same pipeline as an uploaded one.
 *
 * Deliberately four tools and no more: a colour, a pencil, an eraser and a clear. No layers, no
 * undo, no brushes - this is for somebody who wants to try an idea, not a paint program.
 *
 * The canvas starts transparent and the eraser clears back to transparent, which is what a cape
 * texture wants: the checkerboard behind it is showing real emptiness, not a white background.
 */

type Tool = "pencil" | "eraser";

const SWATCHES = [
  "#1d2430",
  "#f6f8fc",
  "#c2402f",
  "#e2872b",
  "#f0b429",
  "#3f9142",
  "#2f6fb5",
  "#7a4fbf",
];

export function DrawCanvas({ canvasRef }: { canvasRef: RefObject<HTMLCanvasElement | null> }) {
  const [colour, setColour] = useState("#2f6fb5");
  const [tool, setTool] = useState<Tool>("pencil");
  const drawing = useRef(false);
  const wrapper = useRef<HTMLDivElement>(null);

  // A fresh canvas is transparent, which is already what we want - this only makes sure the
  // backing store is the texture's size rather than whatever CSS scaled it to.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CAPE_WIDTH;
    canvas.height = CAPE_HEIGHT;
  }, [canvasRef]);

  function paintAt(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((clientX - rect.left) / rect.width) * CAPE_WIDTH);
    const y = Math.floor(((clientY - rect.top) / rect.height) * CAPE_HEIGHT);
    if (x < 0 || y < 0 || x >= CAPE_WIDTH || y >= CAPE_HEIGHT) return;

    const context = canvas.getContext("2d");
    if (!context) return;
    if (tool === "eraser") {
      context.clearRect(x, y, 1, 1);
    } else {
      context.fillStyle = colour;
      context.fillRect(x, y, 1, 1);
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
  }

  return (
    <div className="draw">
      <div className="draw-tools">
        <div className="swatches" role="group" aria-label="Colour">
          {SWATCHES.map((swatch) => (
            <button
              key={swatch}
              type="button"
              className={swatch === colour && tool === "pencil" ? "swatch on" : "swatch"}
              style={{ background: swatch }}
              aria-label={`Use ${swatch}`}
              onClick={() => {
                setColour(swatch);
                setTool("pencil");
              }}
            />
          ))}
          <label className="swatch custom" title="Pick any colour">
            <input
              type="color"
              value={colour}
              onChange={(event) => {
                setColour(event.target.value);
                setTool("pencil");
              }}
            />
          </label>
        </div>

        <div className="tool-buttons">
          <button
            type="button"
            className={tool === "pencil" ? "tool on" : "tool"}
            onClick={() => setTool("pencil")}
            aria-pressed={tool === "pencil"}
          >
            Pencil
          </button>
          <button
            type="button"
            className={tool === "eraser" ? "tool on" : "tool"}
            onClick={() => setTool("eraser")}
            aria-pressed={tool === "eraser"}
          >
            Eraser
          </button>
          <button type="button" className="tool" onClick={clear}>
            Clear
          </button>
        </div>
      </div>

      <div className="canvas-frame" ref={wrapper}>
        <canvas
          ref={canvasRef}
          className="draw-canvas"
          width={CAPE_WIDTH}
          height={CAPE_HEIGHT}
          aria-label={`Drawing area, ${CAPE_WIDTH} by ${CAPE_HEIGHT} pixels`}
          onPointerDown={(event) => {
            drawing.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            paintAt(event.clientX, event.clientY);
          }}
          onPointerMove={(event) => {
            if (drawing.current) paintAt(event.clientX, event.clientY);
          }}
          onPointerUp={() => {
            drawing.current = false;
          }}
          onPointerLeave={() => {
            drawing.current = false;
          }}
        />
      </div>

      <p className="tiny muted" style={{ margin: "10px 0 0" }}>
        {CAPE_WIDTH}x{CAPE_HEIGHT} pixels - a real cape texture, shown large. Nothing drawn here
        needs checking for size: it is already the right one.
      </p>
    </div>
  );
}
