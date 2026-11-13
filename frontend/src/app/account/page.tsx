import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccountPanel } from "./account-panel";
import styles from "./account.module.css";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Geo-Kurdistan.",
};

export default function AccountPage() {
  return (
    <main className={styles.page} data-account-page>
      <Link className={styles.backLink} href="/"><ArrowLeft aria-hidden="true" /> Back to Geo-Kurdistan</Link>
      <div className={styles.loginCard}>
        <aside className={styles.artwork} aria-label="A friendly geological explorer among limestone mountains">
          <Image src="/assets/optimized/account-art-c826855a94e2806a.webp" alt="" fill sizes="(max-width: 760px) 100vw, 480px" priority />
          <div className={styles.artworkCaption}><span>GEO—KURDISTAN</span><p>A world to discover.</p></div>
        </aside>
        <div className={styles.loginColumn}><AccountPanel /></div>
      </div>
    </main>
  );
}
