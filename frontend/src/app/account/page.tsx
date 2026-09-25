import type { Metadata } from "next";
import { UserRound } from "lucide-react";
import { PageIntro } from "@/components/site-shell";
import { AccountPanel } from "./account-panel";
import styles from "./account.module.css";

export const metadata: Metadata = {
  title: "Account",
  description: "Sign in to Geo-Kurdistan or review your account access.",
};

export default function AccountPage() {
  return (
    <main className={styles.page}>
      <PageIntro
        eyebrow="Account"
        title="Your archive access"
        description="Public exploration needs no account. Sign in only when you want to save records or enter an invited scientific workspace."
        icon={UserRound}
        code="ID"
        tone="about"
        steps={["Verify with Google or phone", "Geo-Kurdistan applies the correct role"]}
      />
      <section className={styles.section}>
        <div className={`shell ${styles.shell}`}>
          <AccountPanel />
          <aside className={styles.assurance} aria-label="Account security">
            <p className="eyebrow">Access rules</p>
            <h2>Simple for people. Strict underneath.</h2>
            <ol>
              <li><span>01</span><p><strong>Visitors register normally.</strong> New public accounts can never choose teacher or admin access.</p></li>
              <li><span>02</span><p><strong>Teachers are invited.</strong> The verified Google email or phone must match the invitation.</p></li>
              <li><span>03</span><p><strong>Admins remain limited.</strong> They receive user and site operations, not technical system controls.</p></li>
            </ol>
          </aside>
        </div>
      </section>
    </main>
  );
}
