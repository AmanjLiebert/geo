import Link from "@/components/safe-link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, House } from "lucide-react";
import { GeologicalSurveyScene } from "./geological-survey-scene";
import styles from "./under-development.module.css";


type Props = { code: string; eyebrow: string; title: string; message: string; icon: LucideIcon };

export function UnderDevelopment({ code, eyebrow, title, message, icon: Icon }: Props) {
  return (
    <main className={styles.page} data-development-page>
      <section className={styles.panel} aria-labelledby="development-title">

        <div className={styles.copy}>
          <div className={styles.status}>
            <span className={styles.indicator} aria-hidden="true" />
            Under development <span>{code}</span>
          </div>

          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 id="development-title">{title}</h1>
          <p className={styles.message}>{message}</p>
          <p className={styles.note}>
            This part of Geo–Kurdistan is being carefully shaped and is not ready for review yet.
          </p>


          {/* Actions directing visitors to working sections */}
          <div className={styles.actions}>
            <Link href="/" data-ui-action="back" className={styles.actionHome}>
              <House aria-hidden="true" />
              Home
            </Link>
            <Link href="/explore" data-ui-action="primary" className={styles.actionExplore}>
              Explore the catalogue <ArrowRight aria-hidden="true" />
            </Link>
            <Link href="/research" data-ui-action="secondary" className={styles.actionResearch}>
              Read the research
            </Link>
          </div>
        </div>

        <div className={styles.visual}>
          <GeologicalSurveyScene code={code} />
          <div className={styles.marker} aria-hidden="true">
            <Icon aria-hidden="true" />
            <span>Survey Unit · {code}</span>
          </div>
        </div>
      </section>
    </main>
  );
}
