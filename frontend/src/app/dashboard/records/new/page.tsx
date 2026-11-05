"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RecordEditor } from "@/components/dashboard/record-editor/record-editor";
import { sanitizeRecordsReturnTo } from "@/lib/record-list-state";
import styles from "@/components/dashboard/record-editor/record-editor.module.css";

function NewRecordContent() {
  const searchParams = useSearchParams();
  const returnTo = sanitizeRecordsReturnTo(searchParams.get("returnTo")) ?? undefined;

  return <RecordEditor mode="create" returnTo={returnTo} />;
}

export default function NewRecordPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.loadingState} role="status" aria-live="polite">
          <div className={styles.loadingDot} aria-hidden="true" />
          <div className={styles.loadingDot} aria-hidden="true" />
          <div className={styles.loadingDot} aria-hidden="true" />
          <span>Loading record editor…</span>
        </div>
      }
    >
      <NewRecordContent />
    </Suspense>
  );
}
