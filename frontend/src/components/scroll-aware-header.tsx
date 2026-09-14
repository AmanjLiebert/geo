"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function ScrollAwareHeader({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const direction = useRef<"up" | "down">("up");
  const distance = useRef(0);

  useEffect(() => {
    const mobileViewport = window.matchMedia("(max-width: 980px)");
    let frame = 0;

    const update = () => {
      const scrollY = Math.max(0, window.scrollY);
      const delta = scrollY - lastScrollY.current;
      const nextDirection = delta > 0 ? "down" : delta < 0 ? "up" : direction.current;

      if (nextDirection !== direction.current) {
        direction.current = nextDirection;
        distance.current = 0;
      }
      distance.current += Math.abs(delta);

      if (!mobileViewport.matches || scrollY < 72) {
        setHidden(false);
        distance.current = 0;
      } else if (direction.current === "down" && distance.current >= 16 && scrollY > 96) {
        setHidden(true);
        distance.current = 0;
      } else if (direction.current === "up" && distance.current >= 6) {
        setHidden(false);
        distance.current = 0;
      }

      lastScrollY.current = scrollY;
      frame = 0;
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const onViewportChange = () => {
      if (!mobileViewport.matches) setHidden(false);
    };

    lastScrollY.current = Math.max(0, window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    mobileViewport.addEventListener("change", onViewportChange);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      mobileViewport.removeEventListener("change", onViewportChange);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("mobile-header-hidden", hidden);
    return () => document.documentElement.classList.remove("mobile-header-hidden");
  }, [hidden]);

  return <header className={`brutal-header ${hidden ? "brutal-header--hidden" : "brutal-header--visible"}`}>{children}</header>;
}
