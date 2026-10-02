"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RecordEditor } from "@/components/dashboard/record-editor/record-editor";
import styles from "@/components/dashboard/record-editor/record-editor.module.css";

function EditRecordContent() {
  const searchParams = useSearchParams();
  const recordId = searchParams.get("recordId") ?? undefined;

  return <RecordEditor mode="edit" recordId={recordId} />;
}

export default function EditRecordPage() {
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
      <EditRecordContent />
    </Suspense>
  );
}
