import { GeoArchiveIcon } from "@/components/geo-icons";

export default function ExploreLoading() {
  return (
    <main className="catalog-explorer-page" aria-busy="true">
      <div className="shell catalog-explorer-surface">
        <div className="catalog-empty-results">
          <GeoArchiveIcon aria-hidden="true" />
          <h1>Loading the collection</h1>
          <p>Published geological records are being prepared.</p>
        </div>
      </div>
    </main>
  );
}
