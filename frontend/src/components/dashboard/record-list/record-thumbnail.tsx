"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { getOnlineMediaPages } from "@/lib/record-extras-api";
import styles from "./record-thumbnail.module.css";

export function RecordThumbnail({ mediaAssetId, alt }: { mediaAssetId: string | null; alt: string }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<{ mediaAssetId: string; url: string | null } | null>(null);
  const isCurrent = preview?.mediaAssetId === mediaAssetId;
  const url = isCurrent ? preview.url : null;

  useEffect(() => {
    let active = true;
    if (!mediaAssetId) return;
    let requested = false;
    const loadPreview = () => {
      if (requested) return;
      requested = true;
      getOnlineMediaPages(mediaAssetId, { includeThumbnails: true })
        .then((pages) => {
          const page = pages.find((item) => item.kind === "thumbnail") ?? pages[0];
          if (active) setPreview({ mediaAssetId, url: page?.url ?? null });
        })
        .catch(() => {
          if (active) setPreview({ mediaAssetId, url: null });
        });
    };
    const frame = frameRef.current;
    let observer: IntersectionObserver | undefined;
    if (frame && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver((entries) => {
        if (!active || !entries.some((entry) => entry.isIntersecting)) return;
        observer?.disconnect();
        loadPreview();
      }, { rootMargin: "160px" });
      observer.observe(frame);
    } else {
      loadPreview();
    }
    return () => {
      active = false;
      observer?.disconnect();
    };
  }, [mediaAssetId]);

  const label = !mediaAssetId ? "No image" : !isCurrent ? "Loading" : url ? null : "Processing";

  return (
    <div ref={frameRef} className={styles.frame}>
      {url ? (
        <Image
          src={url}
          alt={alt}
          fill
          sizes="64px"
          unoptimized
          className={styles.image}
          onError={() => setPreview({ mediaAssetId: mediaAssetId ?? "", url: null })}
        />
      ) : (
        <span className={styles.placeholder}>{label}</span>
      )}
    </div>
  );
}
