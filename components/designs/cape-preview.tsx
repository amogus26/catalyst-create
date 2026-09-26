"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { CapeSource } from "@/components/three/cape-scene";

function Poster() {
  return <div className="cape-3d-poster" aria-hidden="true" />;
}

const CapeScene = dynamic(() => import("@/components/three/cape-scene"), { ssr: false, loading: () => <Poster /> });

/** The 3D preview of a cape - the one being drawn, or a picked or approved picture - on our player. */
export function CapePreview({ source, caption }: { source: CapeSource; caption?: string }) {
  return (
    <figure className="cape-3d">
      <CapeScene source={source} className="cape-3d-canvas" fallback={<Poster />} />
      <figcaption>{caption ?? "Drag to turn"}</figcaption>
    </figure>
  );
}

/**
 * "View in 3D" on a cape in the gallery: opens the design on a player in a dialog (a native <dialog>,
 * so Escape and focus work as they should). The 3D only loads when it is opened.
 */
export function View3DButton({ id, label }: { id: string; label: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    const onClose = () => setOpen(false);
    d.addEventListener("close", onClose);
    return () => d.removeEventListener("close", onClose);
  }, []);
  return (
    <>
      <button
        type="button"
        className="view-3d"
        onClick={() => {
          setOpen(true);
          dialog.current?.showModal();
        }}
      >
        View in 3D
      </button>
      <dialog ref={dialog} className="cape-dialog" aria-label={`${label} in 3D`} onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
        <div className="cape-dialog-body">
          <div className="cape-dialog-head">
            <b>{label}</b>
            <button type="button" className="close" onClick={() => dialog.current?.close()} aria-label="Close">
              ×
            </button>
          </div>
          {open && <CapePreview source={{ url: `/api/images/${id}` }} />}
        </div>
      </dialog>
    </>
  );
}
