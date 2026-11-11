"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getCategoryImagePreviewUrl } from "@/lib/category-management-api";
import styles from "./category-management.module.css";

export function CategoryImagePreview({
  mediaAssetId,
  alt,
  compact = false,
}: {
  mediaAssetId: string | null;
  alt: string;
  compact?: boolean;
}) {
  const [view, setView] = useState<{
    mediaAssetId: string;
    url: string | null;
    state: "ready" | "unavailable";
  } | null>(null);
  const isCurrent = view?.mediaAssetId === mediaAssetId;
  const url = isCurrent ? view.url : null;
  const state = !mediaAssetId
    ? "idle"
    : isCurrent
      ? view.state
      : "loading";

  useEffect(() => {
    let active = true;
    if (!mediaAssetId) return;
    getCategoryImagePreviewUrl(mediaAssetId)
      .then((previewUrl) => {
        if (!active) return;
        if (!previewUrl) {
          setView({ mediaAssetId, url: null, state: "unavailable" });
          return;
        }
        setView({ mediaAssetId, url: previewUrl, state: "ready" });
      })
      .catch(() => {
        if (active) setView({ mediaAssetId, url: null, state: "unavailable" });
      });

    return () => {
      active = false;
    };
  }, [mediaAssetId]);

  return (
    <div className={`${styles.imageFrame} ${compact ? styles.imageFrameCompact : ""}`}>
      {url && state === "ready" ? (
        <Image
          src={url}
          alt={alt}
          fill
          sizes={compact ? "144px" : "(max-width: 760px) 100vw, 420px"}
          unoptimized
          className={styles.image}
          onError={() => setView({ mediaAssetId: mediaAssetId ?? "", url: null, state: "unavailable" })}
        />
      ) : (
        <div className={styles.imagePlaceholder} role="status">
          {state === "loading"
            ? "Loading image…"
            : mediaAssetId
              ? "Image processing"
              : "No image"}
        </div>
      )}
    </div>
  );
}
