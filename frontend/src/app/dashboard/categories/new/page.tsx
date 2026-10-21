"use client";

import { useEffect, useState } from "react";
import { CategoryEditor } from "@/components/dashboard/category-management/category-editor";
import { listManagedCategories, type ManagedCategory } from "@/lib/category-management-api";

export default function NewCategoryPage() {
  const [items, setItems] = useState<ManagedCategory[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    listManagedCategories()
      .then((result) => {
        if (active) setItems(result);
      })
      .catch(() => {
        if (active) setError("Categories could not be loaded. Refresh and try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <main><p role="status">Loading categories…</p></main>;
  if (error) return <main><p role="alert">{error}</p></main>;
  return <CategoryEditor mode="create" roots={items.filter((item) => item.parentId === null)} />;
}
