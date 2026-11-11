"use client";

import { Layers } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import styles from "./dashboard.module.css";

/**
 * DashboardHome — the genuine empty starting state for the scientific workspace.
 *
 * Rules:
 * - No fake records, counts, categories, statistics, activity feeds, or mock data.
 * - One clear message describing what the scientific workspace will support.
 * - Greets the signed-in user by name when available.
 */
export function DashboardHome() {
  const { user } = useAuth();
  const displayName = user?.displayName;
  const greeting = displayName ? `Welcome, ${displayName}.` : "Welcome to the dashboard.";

  return (
    <section aria-labelledby="dashboard-home-heading">
      <div className={styles.homeHeading}>
        <div className={styles.homeMark} aria-hidden="true">
          <Layers />
        </div>
        <div>
          <h1 id="dashboard-home-heading" className={styles.homeTitle}>
            {greeting}
          </h1>
          <p className={styles.homeSubtitle}>Scientific workspace — Geo-Kurdistan</p>
        </div>
      </div>

      <div className={styles.homeDescription}>
        <p>
          This is the scientific workspace for Geo-Kurdistan. Here, teachers and
          administrators can create and manage geological records, research
          publications, translations, evidence, locations, and media — working
          through a structured review and publication process.
        </p>
        <p>
          The workspace is being prepared. Navigation items will become active
          as each section is introduced.
        </p>
        <p className={styles.homeDescriptionAccent}>
          The geological collection begins empty. Teachers populate real data through this workspace.
        </p>
      </div>
    </section>
  );
}
