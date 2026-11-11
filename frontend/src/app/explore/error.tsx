"use client";

import { useEffect } from "react";
import { GeoArchiveIcon } from "@/components/geo-icons";

export default function ExploreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Explore data request failed", error);
  }, [error]);

  return (
    <main className="catalog-explorer-page">
      <div className="shell catalog-explorer-surface">
        <div className="catalog-empty-results" role="alert">
          <GeoArchiveIcon aria-hidden="true" />
          <h1>The collection is temporarily unavailable.</h1>
          <p>Please try again. No unpublished information has been shown.</p>
          <button
            type="button"
            data-ui-action="primary"
            className="catalog-action catalog-action--primary"
            onClick={reset}
          >
            Try again
          </button>
        </div>
      </div>
    </main>
  );
}
