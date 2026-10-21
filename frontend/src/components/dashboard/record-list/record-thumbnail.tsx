"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getOnlineMediaPages } from "@/lib/record-extras-api";
import styles from "./record-thumbnail.module.css";

export function RecordThumbnail({ mediaAssetId, alt }: { mediaAssetId: string | null; alt: string }) {
  const [preview, setPreview] = useState<{ mediaAssetId: string; url: string | null } | null>(null);
  const isCurrent = preview?.mediaAssetId === mediaAssetId;
  const url = isCurrent ? preview.url : null;

  useEffect(() => {
    let active = true;
    if (!mediaAssetId) return;
    getOnlineMediaPages(mediaAssetId)
      .then((pages) => {
        if (active) setPreview({ mediaAssetId, url: pages[0]?.url ?? null });
      })
      .catch(() => {
        if (active) setPreview({ mediaAssetId, url: null });
      });
    return () => {
      active = false;
    };
  }, [mediaAssetId]);

  const label = !mediaAssetId ? "No image" : !isCurrent ? "Loading" : url ? null : "Processing";

  return (
    <div className={styles.frame}>
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
