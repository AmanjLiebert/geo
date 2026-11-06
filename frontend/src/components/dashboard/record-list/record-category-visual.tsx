"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Folder,
  Gem,
  GitBranch,
  Layers3,
  Mountain,
  Shell,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { getCategoryImagePreviewUrl } from "@/lib/category-management-api";
import styles from "./record-category-nav.module.css";

function getCategoryVisual(stableKey: string): {
  Icon: LucideIcon;
  tone: string;
} {
  const key = stableKey.toLowerCase();
  if (key.includes("fossil")) return { Icon: Shell, tone: "amber" };
  if (key.includes("hydro") || key.includes("water")) {
    return { Icon: Waves, tone: "blue" };
  }
  if (key.includes("rock") || key.includes("mineral")) {
    return { Icon: Gem, tone: "rust" };
  }
  if (key.includes("strat") || key.includes("unit")) {
    return { Icon: Layers3, tone: "olive" };
  }
  if (key.includes("structur")) return { Icon: GitBranch, tone: "slate" };
  if (key.includes("surface") || key.includes("landform")) {
    return { Icon: Mountain, tone: "green" };
  }
  return { Icon: Folder, tone: "neutral" };
}

/**
 * Shows the category's own image in the navigator tile. The icon remains the
 * immediate fallback, so a missing, unavailable, or broken image never leaves
 * an empty tile or shifts the layout.
 */
export function RecordCategoryVisual({
  stableKey,
  imageMediaAssetId,
}: {
  stableKey: string;
  imageMediaAssetId: string | null;
}) {
  const { Icon, tone } = getCategoryVisual(stableKey);
  const [preview, setPreview] = useState<{
    mediaAssetId: string;
    url: string | null;
  } | null>(null);
  const isCurrent = preview?.mediaAssetId === imageMediaAssetId;
  const url = isCurrent ? preview.url : null;

  useEffect(() => {
    let active = true;
    if (!imageMediaAssetId) return;
    getCategoryImagePreviewUrl(imageMediaAssetId)
      .then((previewUrl) => {
        if (active) setPreview({ mediaAssetId: imageMediaAssetId, url: previewUrl });
      })
      .catch(() => {
        if (active) setPreview({ mediaAssetId: imageMediaAssetId, url: null });
      });
    return () => {
      active = false;
    };
  }, [imageMediaAssetId]);

  return (
    <span
      className={`${styles.categoryVisual} ${
        url ? styles.categoryVisualWithImage : ""
      }`}
      data-tone={tone}
      aria-hidden="true"
    >
      {url ? (
        <Image
          src={url}
          alt=""
          fill
          sizes="54px"
          unoptimized
          className={styles.categoryImage}
          onError={() =>
            setPreview({ mediaAssetId: imageMediaAssetId ?? "", url: null })
          }
        />
      ) : (
        <Icon />
      )}
    </span>
  );
}
