"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GeoCloseIcon, GeoMenuIcon } from "@/components/geo-icons";
import { PrimaryNavigation } from "./primary-navigation";

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const [rendered, setRendered] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setRendered(true);
    setOpen(true);
  };

  const closeMenu = useCallback(() => {
    setOpen(false);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setRendered(false), 280);
  }, []);

  useEffect(() => {
    if (!rendered) return;

    const trigger = triggerRef.current;
    const root = document.documentElement;
    const scrollPosition = window.scrollY;
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = root.style.overflow;
    const previousRootOverscroll = root.style.overscrollBehavior;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;
    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollPosition}px`;
    document.body.style.width = "100%";
    const frame = requestAnimationFrame(() => panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('a, button:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      root.style.overflow = previousRootOverflow;
      root.style.overscrollBehavior = previousRootOverscroll;
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      window.scrollTo(0, scrollPosition);
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus({ preventScroll: true });
    };
  }, [closeMenu, rendered]);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  return <>
    <button
      ref={triggerRef}
      className="mobile-menu-trigger"
      type="button"
      aria-label={open ? "Close navigation" : "Open navigation"}
      aria-expanded={open}
      aria-controls="mobile-navigation-panel"
      onClick={open ? closeMenu : openMenu}
    >
      <GeoMenuIcon className="navigation-menu-icon" aria-hidden="true" />
      <span className="mobile-menu-label">Menu</span>
    </button>
    {rendered && createPortal(<div className={`mobile-menu-overlay${open ? " mobile-menu-overlay--open" : " mobile-menu-overlay--closing"}`} onPointerDown={(event) => { if (event.target === event.currentTarget) closeMenu(); }}>
      <div ref={panelRef} className={`mobile-menu-panel${open ? " mobile-menu-panel--open" : " mobile-menu-panel--closing"}`} id="mobile-navigation-panel" role="dialog" aria-modal="true" aria-label="Site navigation">
        <header>
          <div className="mobile-menu-panel-brand">
            <Image src="/brand/geo-kurdistan-mark-v2.png" alt="" width={190} height={109} />
            <span><strong>Geo—Kurdistan</strong><small>Menu</small></span>
          </div>
          <button type="button" aria-label="Close navigation" onClick={closeMenu}><GeoCloseIcon aria-hidden="true" /></button>
        </header>
        <PrimaryNavigation className="mobile-navigation" label="Mobile navigation" onNavigate={closeMenu} />
        <p>Geological archive <b>Visitor showcase</b></p>
      </div>
    </div>, document.body)}
  </>;
}
