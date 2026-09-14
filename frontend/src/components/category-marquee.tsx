"use client";

import Image from "next/image";
import Link from "@/components/safe-link";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import type { GeologicalCategory } from "@/content/types";
import { NeoBadge } from "./neo-badge";
import styles from "./category-marquee.module.css";

export interface CollectionHighlight {
  slug: string;
  name: string;
  href: string;
  recordCount: number;
  image: GeologicalCategory["image"];
}

type CollectionRailItem = CollectionHighlight;

const AUTO_SCROLL_SPEED = 0.065;

function CategoryGroup({ items, duplicate = false }: { items: CollectionRailItem[]; duplicate?: boolean }) {
  return (
    <div className={styles.group} aria-hidden={duplicate || undefined}>
      {items.map((item) => (
        <Link className={styles.tile} href={item.href} tabIndex={duplicate ? -1 : undefined} key={`${duplicate ? "duplicate-" : ""}${item.slug}`}>
          <div className={styles.visual}>
            <Image src={item.image.src} alt={duplicate ? "" : item.image.alt} fill draggable={false} sizes="(max-width: 680px) 265px, (max-width: 1200px) 28vw, 340px" />
          </div>
          <div className={styles.copy}>
            <div className={styles.meta}><NeoBadge className={styles.countBadge}>{item.recordCount} records</NeoBadge><span>Collection</span></div>
            <h3>{item.name}</h3>
            <p>{item.image.caption}</p>
            <div className={styles.cardFooter}><span>Open collection</span><ArrowUpRight aria-hidden="true" /></div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function CategoryMarquee({ categories, counts, highlights = [] }: { categories: GeologicalCategory[]; counts: Record<string, number>; highlights?: CollectionHighlight[] }) {
  const viewportRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startScroll: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const touchRef = useRef(false);
  const resumeTimerRef = useRef<number | null>(null);
  const items: CollectionRailItem[] = [
    ...categories.map((category) => ({ slug: category.slug, name: category.name, href: `/explore/${category.slug}`, recordCount: counts[category.slug] ?? category.recordCount, image: category.image })),
    ...highlights,
  ];

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let frame = 0;
    let lastTime = performance.now();
    let initialized = false;

    const normalizePosition = () => {
      const groupWidth = viewport.scrollWidth / 3;
      if (!groupWidth) return;
      if (!initialized) {
        viewport.scrollLeft = groupWidth;
        initialized = true;
      } else if (viewport.scrollLeft >= groupWidth * 2) {
        viewport.scrollLeft -= groupWidth;
        if (dragRef.current) dragRef.current.startScroll -= groupWidth;
      } else if (viewport.scrollLeft <= groupWidth * 0.15) {
        viewport.scrollLeft += groupWidth;
        if (dragRef.current) dragRef.current.startScroll += groupWidth;
      }
    };

    const pauseTouch = () => {
      if (resumeTimerRef.current !== null) window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
      touchRef.current = true;
    };

    const resumeAfterTouch = () => {
      if (resumeTimerRef.current !== null) window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = window.setTimeout(() => {
        touchRef.current = false;
        resumeTimerRef.current = null;
      }, 900);
    };

    const onTouchStart = () => pauseTouch();
    const finishTouch = () => resumeAfterTouch();
    const onNativeScroll = () => {
      if (touchRef.current) resumeAfterTouch();
    };

    const animate = (time: number) => {
      normalizePosition();
      const elapsed = Math.min(time - lastTime, 32);
      if (!dragRef.current && !touchRef.current) {
        viewport.scrollLeft += elapsed * AUTO_SCROLL_SPEED;
      }
      lastTime = time;
      frame = requestAnimationFrame(animate);
    };

    viewport.addEventListener("touchstart", onTouchStart, { passive: true });
    viewport.addEventListener("touchend", finishTouch, { passive: true });
    viewport.addEventListener("touchcancel", finishTouch, { passive: true });
    viewport.addEventListener("scroll", onNativeScroll, { passive: true });
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      if (resumeTimerRef.current !== null) window.clearTimeout(resumeTimerRef.current);
      viewport.removeEventListener("touchstart", onTouchStart);
      viewport.removeEventListener("touchend", finishTouch);
      viewport.removeEventListener("touchcancel", finishTouch);
      viewport.removeEventListener("scroll", onNativeScroll);
    };
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (resumeTimerRef.current !== null) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
    touchRef.current = event.pointerType !== "mouse";
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startScroll: event.currentTarget.scrollLeft, moved: false };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Older mobile browsers can reject pointer capture; document-level pointer
      // delivery still lets the gesture continue while the finger is on the rail.
    }
    event.currentTarget.classList.add(styles.dragging);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > 5) {
      drag.moved = true;
      if (event.cancelable) event.preventDefault();
    }
    event.currentTarget.scrollLeft = drag.startScroll - distance;
  };

  const finishDrag = (event: ReactPointerEvent<HTMLElement>, cancelled = false) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    suppressClickRef.current = drag.moved && !cancelled;
    window.setTimeout(() => { suppressClickRef.current = false; }, 400);
    dragRef.current = null;
    event.currentTarget.classList.remove(styles.dragging);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (event.pointerType !== "mouse") {
      resumeTimerRef.current = window.setTimeout(() => {
        touchRef.current = false;
        resumeTimerRef.current = null;
      }, 700);
    } else {
      touchRef.current = false;
    }
  };

  const handleClickCapture = (event: ReactMouseEvent<HTMLElement>) => {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    event.currentTarget.scrollBy({ left: event.key === "ArrowRight" ? 320 : -320, behavior: "smooth" });
  };

  return (
    <nav
      ref={viewportRef}
      className={styles.viewport}
      aria-label="Geological collections"
      aria-describedby="collection-drag-hint"
      tabIndex={0}
      onClickCapture={handleClickCapture}
      onDragStart={(event) => { event.preventDefault(); }}
      onKeyDown={handleKeyDown}
      onPointerCancel={(event) => { finishDrag(event, true); }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
    >
      <span id="collection-drag-hint" className="sr-only">Drag horizontally or use the left and right arrow keys to browse collections.</span>
      <div className={styles.track}>
        <CategoryGroup items={items} duplicate />
        <CategoryGroup items={items} />
        <CategoryGroup items={items} duplicate />
      </div>
    </nav>
  );
}
