"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CategoryEditor } from "@/components/dashboard/category-management/category-editor";
import { listManagedCategories, type ManagedCategory } from "@/lib/category-management-api";

function EditCategoryContent() {
  const categoryId = useSearchParams().get("categoryId");
  const [items, setItems] = useState<ManagedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    listManagedCategories()
      .then((result) => {
        if (active) setItems(result);
      })
      .catch(() => {
        if (active) setError("The category could not be loaded. Refresh and try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!categoryId) return <main><p>No category selected.</p><Link href="/dashboard/categories">Return to categories</Link></main>;
  if (loading) return <main><p role="status">Loading category…</p></main>;
  if (error) return <main><p role="alert">{error}</p></main>;
  const category = items.find((item) => item.id === categoryId);
  if (!category) return <main><p role="alert">The category is unavailable.</p><Link href="/dashboard/categories">Return to categories</Link></main>;
  return (
    <CategoryEditor
      mode="edit"
      category={category}
      roots={items.filter((item) => item.parentId === null)}
    />
  );
}

export default function EditCategoryPage() {
  return (
    <Suspense fallback={<main><p role="status">Loading category…</p></main>}>
      <EditCategoryContent />
    </Suspense>
  );
}
