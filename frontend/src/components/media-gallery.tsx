"use client";

import Image from "next/image";
import { Expand, X } from "lucide-react";
import { useRef, useState } from "react";
import type { MediaAsset } from "@/content/types";

export function MediaGallery({ images, title = "Image gallery" }: { images: MediaAsset[]; title?: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const active = images[activeIndex] ?? images[0];
  if (!active) return null;

  const open = (index: number) => {
    setActiveIndex(index);
    setDialogOpen(true);
    dialogRef.current?.showModal();
  };

  const close = () => {
    setDialogOpen(false);
    dialogRef.current?.close();
  };

  return <div className="media-gallery" aria-label={title}>
    <button className="media-gallery-lead" type="button" onClick={() => open(activeIndex)} aria-label={`Open ${active.caption} fullscreen`}>
      <Image src={active.src} alt={active.alt} fill sizes="(max-width: 800px) 100vw, 64vw" />
      <span><Expand aria-hidden="true" /> View fullscreen</span>
      <small>{active.caption}</small>
    </button>
    {images.length > 1 && <div className="media-gallery-thumbs" aria-label="Choose gallery image">
      {images.map((image, index) => <button className={index === activeIndex ? "active" : ""} type="button" key={`${image.src}-${index}`} onClick={() => setActiveIndex(index)} aria-pressed={index === activeIndex}>
        <Image src={image.src} alt="" fill sizes="110px" />
        <span className="sr-only">{image.caption}</span>
      </button>)}
    </div>}
    <dialog ref={dialogRef} className="media-dialog" onClose={() => setDialogOpen(false)} onClick={(event) => { if (event.target === dialogRef.current) close(); }}>
      {dialogOpen && <div className="media-dialog-inner">
        <button className="media-dialog-close" type="button" onClick={close} aria-label="Close fullscreen image"><X aria-hidden="true" /></button>
        <div className="media-dialog-image"><Image src={active.src} alt={active.alt} fill sizes="100vw" /></div>
        <div className="media-dialog-caption"><strong>{active.caption}</strong>{active.credit && <span>{active.credit}</span>}</div>
      </div>}
    </dialog>
  </div>;
}
